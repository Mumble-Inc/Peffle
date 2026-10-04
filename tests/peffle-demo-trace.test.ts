import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GET as traceGet } from "@/app/api/admin/peffle/trace/route";
import { buildDemoTrace, isDemoModeEnabled, loadDemoTrace, type DemoTracePayload } from "@/lib/peffle/demo-trace";
import { resetPeffleForTests } from "@/lib/peffle/client";
import { applyDiscountTool } from "@/lib/services/agent-tools";
import { createBuyerSession } from "@/lib/services/sessions";
import { getConfiguredDemoMerchantId } from "@/lib/config/merchant";
import { unauthorizedHeaders } from "./helpers/auth";
import { createStaffAuthContext, createVerifiedBuyerAuthContext } from "./helpers/staff-auth";

const prisma = new PrismaClient();

describe("Demo Mode trace mapping", () => {
  it("renders a real allowed event as allowed with merchant PASS only when commerce ran first", () => {
    const [row] = buildDemoTrace(
      [
        {
          id: "a1",
          type: "AGENT_TOOL_ALLOWED",
          createdAt: "2026-10-04T10:00:00.000Z",
          data: { tool: "apply_discount", reasonCode: "ALLOWED", peffleEventId: "e1", amountPaise: 20000 },
        },
      ],
      [
        {
          id: "e1",
          action: "apply_discount",
          agentId: "desk:s1",
          amount: 20000,
          status: "completed",
          createdAt: "2026-10-04T10:00:00.000Z",
          sessionId: "s1",
        },
      ],
    );
    expect(row.decision).toBe("ALLOW");
    expect(row.merchant?.outcome).toBe("PASS");
    expect(row.peffle?.outcome).toBe("ALLOW");
    expect(row.reasonCode).toBe("ALLOWED");
    expect(row.amountPaise).toBe(20000);
    expect(row.eventId).toBe("e1");
  });

  it("does not invent a Discount ceiling PASS row", () => {
    const [row] = buildDemoTrace(
      [
        {
          id: "a1",
          type: "AGENT_TOOL_ALLOWED",
          createdAt: "2026-10-04T10:00:00.000Z",
          data: { tool: "apply_discount", reasonCode: "ALLOWED", peffleEventId: "e1", amountPaise: 45000 },
        },
      ],
      [{ id: "e1", action: "apply_discount", agentId: "desk:s", status: "completed", createdAt: "2026-10-04T10:00:00.000Z" }],
    );
    expect(JSON.stringify(row)).not.toMatch(/Discount ceiling/i);
  });

  it("renders a commerce-policy block with no Peffle stage", () => {
    const [row] = buildDemoTrace(
      [
        {
          id: "a2",
          type: "AGENT_TOOL_BLOCKED",
          createdAt: "2026-10-04T10:01:00.000Z",
          data: { tool: "apply_discount", reasonCode: "DISCOUNT_CEILING" },
        },
      ],
      [],
    );
    expect(row.headline).toBe("COMMERCE BLOCK");
    expect(row.merchant?.outcome).toBe("COMMERCE BLOCK");
    expect(row.peffle).toBeNull();
    expect(row.eventId).toBeNull();
  });

  it("renders a Peffle budget block after merchant PASS", () => {
    const [row] = buildDemoTrace(
      [
        {
          id: "a3",
          type: "AGENT_TOOL_BLOCKED",
          createdAt: "2026-10-04T10:02:00.000Z",
          data: {
            tool: "apply_discount",
            reasonCode: "BUDGET_EXCEEDED",
            peffleEventId: "e3",
            amountPaise: 80000,
          },
        },
      ],
      [
        {
          id: "e3",
          action: "apply_discount",
          agentId: "desk:s1",
          amount: 80000,
          status: "denied",
          ruleId: "discount-daily-cap",
          createdAt: "2026-10-04T10:02:00.000Z",
        },
      ],
    );
    expect(row.merchant?.outcome).toBe("PASS");
    expect(row.peffle?.outcome).toBe("EXCEEDED");
    expect(row.decision).toBe("BLOCK");
    expect(row.reasonCode).toBe("BUDGET_EXCEEDED");
  });

  it("renders kill-all as killed", () => {
    const [row] = buildDemoTrace(
      [
        {
          id: "a4",
          type: "AGENT_TOOL_BLOCKED",
          createdAt: "2026-10-04T10:03:00.000Z",
          data: { tool: "search_products", reasonCode: "AGENT_KILLED", peffleEventId: "e4" },
        },
      ],
      [
        {
          id: "e4",
          action: "search_products",
          agentId: "desk:s1",
          status: "denied",
          ruleId: "kill-switch",
          createdAt: "2026-10-04T10:03:00.000Z",
        },
      ],
    );
    expect(row.decision).toBe("KILL");
    expect(row.peffle?.outcome).toBe("KILLED");
    expect(row.merchant).toBeNull();
  });

  it("renders checkout kill from ledger only", () => {
    const [row] = buildDemoTrace(
      [],
      [
        {
          id: "c1",
          action: "checkout.create",
          agentId: "razorflow-desk",
          amount: 79900,
          status: "denied",
          ruleId: "kill-switch",
          createdAt: "2026-10-04T10:04:00.000Z",
          sessionId: "s1",
        },
      ],
    );
    expect(row.action).toBe("checkout.create");
    expect(row.decision).toBe("KILL");
    expect(row.execution).toBe("No payment order created.");
  });

  it("renders approval-required and links retry by eventId", () => {
    const rows = buildDemoTrace(
      [
        {
          id: "retry",
          type: "AGENT_TOOL_APPROVED",
          createdAt: "2026-10-04T10:06:00.000Z",
          data: { tool: "issue_refund", reasonCode: "ALLOWED", peffleEventId: "ev-appr", ok: true },
        },
        {
          id: "pause",
          type: "AGENT_TOOL_APPROVAL_REQUIRED",
          createdAt: "2026-10-04T10:05:00.000Z",
          data: { tool: "issue_refund", reasonCode: "APPROVAL_REQUIRED", peffleEventId: "ev-appr", amountPaise: 1000 },
        },
      ],
      [
        {
          id: "ev-appr",
          action: "issue_refund",
          agentId: "desk:s1",
          amount: 1000,
          status: "completed",
          createdAt: "2026-10-04T10:06:00.000Z",
        },
      ],
    );
    expect(rows[0]?.eventId).toBe("ev-appr");
    expect(rows[0]?.decision).toBe("ALLOW");
    expect(rows[1]?.decision).toBe("APPROVE");
    expect(rows[1]?.headline).toBe("ACTION PAUSED");
    expect(rows[1]?.eventId).toBe(rows[0]?.eventId);
  });

  it("renders a safe search allow without merchant policy", () => {
    const [row] = buildDemoTrace(
      [
        {
          id: "s1",
          type: "AGENT_TOOL_ALLOWED",
          createdAt: "2026-10-04T10:07:00.000Z",
          data: { tool: "search_products", reasonCode: "ALLOWED", peffleEventId: "es" },
        },
      ],
      [{ id: "es", action: "search_products", agentId: "desk:s", status: "completed", createdAt: "2026-10-04T10:07:00.000Z" }],
    );
    expect(row.decision).toBe("ALLOW");
    expect(row.merchant).toBeNull();
    expect(row.peffle?.outcome).toBe("ALLOW");
  });

  it("surfaces replay/tamper as the recorded Peffle reason", () => {
    const [row] = buildDemoTrace(
      [
        {
          id: "t1",
          type: "AGENT_TOOL_BLOCKED",
          createdAt: "2026-10-04T10:08:00.000Z",
          data: { tool: "issue_refund", reasonCode: "APPROVAL_FINGERPRINT_MISMATCH", peffleEventId: "et" },
        },
      ],
      [{ id: "et", action: "issue_refund", agentId: "desk:s", status: "denied", createdAt: "2026-10-04T10:08:00.000Z" }],
    );
    expect(row.reasonCode).toBe("APPROVAL_FINGERPRINT_MISMATCH");
    expect(row.peffle).not.toBeNull();
    expect(row.decision).toBe("BLOCK");
  });
});

describe("Demo Mode trace API", () => {
  let staffHeaders: HeadersInit;
  let staffSessionId: string;
  const previous = process.env.DEMO_MODE;

  beforeAll(async () => {
    await prisma.$connect();
    const staff = await createStaffAuthContext();
    staffHeaders = staff.headers;
    staffSessionId = staff.sessionId;
  });

  afterEach(() => {
    process.env.DEMO_MODE = previous;
    resetPeffleForTests();
  });

  afterAll(async () => {
    process.env.DEMO_MODE = previous;
    resetPeffleForTests();
    await prisma.$disconnect();
  });

  it("rejects unauthenticated and non-staff requests without events", async () => {
    process.env.DEMO_MODE = "1";
    const anon = await traceGet(new Request("http://localhost/api/admin/peffle/trace", { headers: unauthorizedHeaders() }));
    expect(anon.status).toBe(401);
    expect(JSON.stringify(await anon.json())).not.toMatch(/history|latest/);

    const buyer = await createVerifiedBuyerAuthContext("demo buyer");
    const forbidden = await traceGet(new Request("http://localhost/api/admin/peffle/trace", { headers: buyer.headers }));
    expect(forbidden.status).toBe(403);
    const body = await forbidden.json();
    expect(body).not.toHaveProperty("latest");
    expect(body).not.toHaveProperty("history");
  });

  it("rejects staff when DEMO_MODE is off", async () => {
    process.env.DEMO_MODE = "0";
    expect(isDemoModeEnabled()).toBe(false);
    const response = await traceGet(new Request("http://localhost/api/admin/peffle/trace", { headers: staffHeaders }));
    expect(response.status).toBe(403);
    expect(await response.json()).not.toHaveProperty("history");
  });

  it("returns only the current desk session events and does not invent rows on open", async () => {
    process.env.DEMO_MODE = "1";
    const merchantId = getConfiguredDemoMerchantId();
    const other = await createBuyerSession("other desk", merchantId);
    const product = await prisma.product.findFirstOrThrow({ where: { merchantId, sku: "halo-anc" } });
    await applyDiscountTool({
      sessionId: other.sessionId,
      merchantId,
      productId: product.id,
      requestedAmountPaise: 20000,
    });

    const before = await prisma.auditEvent.count({ where: { sessionId: staffSessionId } });
    const response = await traceGet(new Request("http://localhost/api/admin/peffle/trace", { headers: staffHeaders }));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as DemoTracePayload;
    expect(payload.sessionId).toBe(staffSessionId);
    expect(payload.history.some((row) => row.action === "apply_discount")).toBe(false);
    const after = await prisma.auditEvent.count({ where: { sessionId: staffSessionId } });
    expect(after).toBe(before);

    const loaded = await loadDemoTrace(staffSessionId);
    expect(loaded.latest).toBeNull();
  });

  it("includes a real discount allow from the staff session", async () => {
    process.env.DEMO_MODE = "1";
    const merchantId = getConfiguredDemoMerchantId();
    const product = await prisma.product.findFirstOrThrow({ where: { merchantId, sku: "halo-anc" } });
    const result = await applyDiscountTool({
      sessionId: staffSessionId,
      merchantId,
      productId: product.id,
      requestedAmountPaise: 2000,
    });
    expect(result.ok).toBe(true);

    const response = await traceGet(new Request("http://localhost/api/admin/peffle/trace", { headers: staffHeaders }));
    const payload = (await response.json()) as DemoTracePayload;
    expect(payload.latest?.action).toBe("apply_discount");
    expect(payload.latest?.decision).toBe("ALLOW");
    expect(payload.latest?.eventId).toBe(result.peffleEventId);
    expect(typeof payload.discountSpend.spentPaise).toBe("number");
    expect(Number.isInteger(payload.discountSpend.spentPaise)).toBe(true);
    expect(Number.isInteger(payload.discountSpend.limitPaise)).toBe(true);
  });
});
