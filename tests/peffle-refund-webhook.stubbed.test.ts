import { createHmac, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { POST as webhookPost } from "@/app/api/webhooks/razorpay/route";
import { db } from "@/lib/db";
import { getLedgerData } from "@/lib/services/ledger";
import { createBuyerSession } from "@/lib/services/sessions";
import { runAgentForSession } from "@/lib/services/agent-run";
import { createCheckoutForSession } from "@/lib/services/checkout";
import { issueRefundTool } from "@/lib/services/agent-tools";
import { getPendingApproval, clearPendingApprovalsForTests } from "@/lib/peffle/approvals";
import { resolvePeffleApproval } from "@/lib/peffle/resolve-approval";
import { getPeffle, resetPeffleForTests } from "@/lib/peffle/client";
import { getConfiguredDemoMerchantId } from "@/lib/config/merchant";

const prisma = new PrismaClient();
const TEST_SECRET = "test_razorpay_secret";
const TEST_WEBHOOK_SECRET = "test_webhook_secret_peffle_refund";

vi.mock("@/lib/razorpay/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/razorpay/client")>("@/lib/razorpay/client");
  return {
    ...actual,
    isRazorpayConfigured: () => true,
    getRazorpayKeySecret: () => TEST_SECRET,
    getPublicRazorpayKeyId: () => "rzp_test_key",
    getRazorpayWebhookSecret: () => process.env.RAZORPAY_WEBHOOK_SECRET ?? TEST_WEBHOOK_SECRET,
    getRazorpayClient: () => ({
      orders: {
        create: vi.fn(async ({ amount, receipt }: { amount: number; receipt: string }) => ({
          id: `order_${receipt}`,
          amount,
          currency: "INR",
        })),
      },
    }),
  };
});

function signWebhook(body: string) {
  return createHmac("sha256", TEST_WEBHOOK_SECRET).update(body).digest("hex");
}

describe("captured-payment refund approval (stubbed Razorpay refund HTTP)", () => {
  beforeAll(async () => {
    await prisma.$connect();
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    process.env.RAZORFLOW_STUB_RAZORPAY_REFUND = "1";
    resetPeffleForTests();
  });

  afterEach(() => {
    clearPendingApprovalsForTests();
    resetPeffleForTests();
  });

  afterAll(async () => {
    resetPeffleForTests();
    await prisma.$disconnect();
  });

  it("HMAC webhook capture then approve once and block replay", async () => {
    const merchantId = getConfiguredDemoMerchantId();
    const { sessionId } = await createBuyerSession(
      "ANC headphones for a 14-hour flight, budget ₹8,500",
      merchantId,
    );
    const { decisionId, result } = await runAgentForSession(sessionId);
    expect(result.status).toBe("ready");
    const checkout = await createCheckoutForSession(sessionId, decisionId);

    const paymentId = `pay_stub_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
    const eventId = `evt_stub_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
    const body = JSON.stringify({
      id: eventId,
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: checkout.razorpayOrderId,
            status: "captured",
          },
        },
      },
    });
    const response = await webhookPost(
      new Request("http://localhost/api/webhooks/razorpay", {
        method: "POST",
        headers: { "x-razorpay-signature": signWebhook(body), "content-type": "application/json" },
        body,
      }),
    );
    expect(response.status).toBe(200);
    const webhookJson = (await response.json()) as { processed?: boolean };
    expect(webhookJson.processed).toBe(true);

    const payment = await db.payment.findFirst({ where: { orderId: checkout.orderId } });
    expect(payment?.status).toBe("CAPTURED");
    expect(payment?.razorpayPaymentId).toBe(paymentId);

    const first = await issueRefundTool({
      sessionId,
      merchantId,
      orderId: checkout.orderId,
      amountPaise: 1_000,
    });
    expect(first.reasonCode).toBe("APPROVAL_REQUIRED");
    expect(first.peffleEventId).toBeTruthy();

    const pending = getPendingApproval(first.peffleEventId!);
    expect(pending).toBeTruthy();
    const token = pending!.token;

    const approved = await resolvePeffleApproval(first.peffleEventId!, "approve");
    expect(approved.ok).toBe(true);
    expect(approved.result?.reasonCode).toBe("ALLOWED");
    expect(approved.result?.data.amountPaise).toBe(1_000);

    const refundRow = await db.refund.findFirst({ where: { orderId: checkout.orderId } });
    expect(refundRow?.status).toBe("ISSUED");
    expect(refundRow?.razorpayRefundId?.startsWith("stub_rfnd_")).toBe(true);

    const replay = await issueRefundTool({
      sessionId,
      merchantId,
      orderId: checkout.orderId,
      amountPaise: 1_000,
      approval: { eventId: first.peffleEventId!, token },
    });
    expect(replay.ok).toBe(false);
    expect(replay.reasonCode).toBe("APPROVAL_ALREADY_CONSUMED");

    const audits = await db.auditEvent.findMany({
      where: {
        sessionId,
        type: { in: ["WEBHOOK_RECEIVED", "AGENT_TOOL_APPROVAL_REQUIRED", "AGENT_TOOL_APPROVED", "AGENT_TOOL_ALLOWED"] },
      },
    });
    expect(audits.some((row) => row.type === "WEBHOOK_RECEIVED")).toBe(true);
    expect(audits.some((row) => row.type === "AGENT_TOOL_APPROVED")).toBe(true);

    const ledger = await getLedgerData();
    expect(ledger.sessions.some((row) => row.id === sessionId && row.payment === "Captured")).toBe(true);

    const peffleEvents = getPeffle().query({ action: "issue_refund", limit: 20 });
    expect(peffleEvents.some((event) => event.status === "completed")).toBe(true);
  });
});
