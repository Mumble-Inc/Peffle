import { createHmac, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  authenticateStaff,
  ensureVerifiedBuyerForCheckout,
  HALO_FLIGHT_INTENT,
  prepareE2EBaseline,
  runDeskAgentWithIntent,
} from "./helpers/baseline";

test.describe.configure({ mode: "serial" });

test("captured payment refund approval (stubbed Razorpay refund HTTP)", async ({
  page,
  playwright,
  baseURL,
}) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  expect(webhookSecret, "Playwright must share RAZORPAY_WEBHOOK_SECRET with the app server").toBeTruthy();

  await prepareE2EBaseline(page);
  await runDeskAgentWithIntent(page, HALO_FLIGHT_INTENT);
  await ensureVerifiedBuyerForCheckout(page);

  const ctx = await page.request.get("/api/desk/context");
  const sessionId = ((await ctx.json()) as { auth?: { sessionId?: string } }).auth?.sessionId;
  expect(sessionId).toBeTruthy();

  const checkout = await page.request.post("/api/checkout", {
    data: { sessionId, source: "cart" },
  });
  expect(checkout.ok(), await checkout.text()).toBeTruthy();
  const checkoutBody = (await checkout.json()) as { orderId: string; razorpayOrderId: string };

  const paymentId = `pay_e2e_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const eventId = `evt_e2e_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const rawBody = JSON.stringify({
    id: eventId,
    event: "payment.captured",
    payload: {
      payment: {
        entity: { id: paymentId, order_id: checkoutBody.razorpayOrderId, status: "captured" },
      },
    },
  });
  const signature = createHmac("sha256", webhookSecret!).update(rawBody).digest("hex");
  const webhook = await page.request.post("/api/webhooks/razorpay", {
    headers: { "x-razorpay-signature": signature, "content-type": "application/json" },
    data: rawBody,
  });
  expect(webhook.ok(), await webhook.text()).toBeTruthy();
  expect(((await webhook.json()) as { processed: boolean }).processed).toBe(true);

  const refundAsk = await page.request.post("/api/agent/chat", {
    data: { sessionId, message: "refund 10 rupees" },
  });
  expect(refundAsk.ok()).toBeTruthy();
  const asked = (await refundAsk.json()) as { tools: Array<{ reasonCode: string; peffleEventId?: string }> };
  expect(asked.tools[0]?.reasonCode).toBe("APPROVAL_REQUIRED");

  const staff = await playwright.request.newContext({ baseURL });
  await authenticateStaff(staff);
  const state = await staff.get("/api/admin/peffle");
  const payload = (await state.json()) as { pendingApprovals: Array<{ eventId: string }> };
  const peffleEventId = payload.pendingApprovals[0]?.eventId;
  expect(peffleEventId).toBeTruthy();

  const approved = await staff.post("/api/admin/peffle/approvals", {
    data: { eventId: peffleEventId, decision: "approve" },
  });
  expect(approved.ok(), await approved.text()).toBeTruthy();
  const approvedBody = (await approved.json()) as {
    ok: boolean;
    result: { reasonCode: string; data: { amountPaise: number; refundId: string } };
  };
  expect(approvedBody.ok).toBe(true);
  expect(approvedBody.result.reasonCode).toBe("ALLOWED");
  expect(approvedBody.result.data.amountPaise).toBe(1_000);

  const activity = await staff.get("/api/admin/activity?limit=50");
  expect(activity.ok()).toBeTruthy();
  const activityJson = (await activity.json()) as { items?: Array<{ type: string }> };
  const types = (activityJson.items ?? []).map((row) => row.type);
  expect(types.some((type) => type.includes("AGENT_TOOL") || type === "WEBHOOK_RECEIVED")).toBe(true);

  const overview = await staff.get("/api/admin/overview");
  expect(overview.ok(), await overview.text()).toBeTruthy();

  await staff.dispose();
});
