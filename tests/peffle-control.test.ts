import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GET as peffleGet } from "@/app/api/admin/peffle/route";
import { POST as peffleKill } from "@/app/api/admin/peffle/kill/route";
import { POST as peffleCap } from "@/app/api/admin/peffle/cap/route";
import { POST as checkoutPost } from "@/app/api/checkout/route";
import {
  PEFFLE_CHECKOUT_AGENT_ID,
  getPeffle,
  resetPeffleForTests,
  setRuntimeCheckoutCapPaise,
} from "@/lib/peffle/client";
import { getPeffleControlState } from "@/lib/peffle/control";
import type { PeffleControlState } from "@/lib/peffle/types";
import { applyDiscountTool } from "@/lib/services/agent-tools";
import { createBuyerSession } from "@/lib/services/sessions";
import { getConfiguredDemoMerchantId } from "@/lib/config/merchant";
import { unauthorizedHeaders } from "./helpers/auth";
import { createStaffAuthContext, createVerifiedBuyerAuthContext } from "./helpers/staff-auth";

const prisma = new PrismaClient();
let staffHeaders: HeadersInit;

describe("Peffle control plane APIs", () => {
  beforeAll(async () => {
    await prisma.$connect();
    const staff = await createStaffAuthContext();
    staffHeaders = staff.headers;
  });

  afterEach(() => {
    resetPeffleForTests();
    try {
      getPeffle().revive(PEFFLE_CHECKOUT_AGENT_ID);
    } catch {
      // singleton may have been recreated
    }
  });

  afterAll(async () => {
    resetPeffleForTests();
    await prisma.$disconnect();
  });

  it("rejects unauthenticated control and kill requests", async () => {
    const status = await peffleGet(new Request("http://localhost/api/admin/peffle", { headers: unauthorizedHeaders() }));
    const kill = await peffleKill(
      new Request("http://localhost/api/admin/peffle/kill", {
        method: "POST",
        headers: unauthorizedHeaders(),
        body: JSON.stringify({ action: "kill" }),
      }),
    );
    expect(status.status).toBe(401);
    expect(kill.status).toBe(401);
  });

  it("does not expose storage paths or env secrets in the control payload", async () => {
    const response = await peffleGet(
      new Request("http://localhost/api/admin/peffle", { headers: staffHeaders }),
    );
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).not.toMatch(/PEFFLE_STORAGE|better-sqlite3|ledger\.db|RAZORPAY_KEY_SECRET/);
    const state = JSON.parse(body) as PeffleControlState;
    expect(state.agentId).toBe(PEFFLE_CHECKOUT_AGENT_ID);
    expect(typeof state.spend.limitPaise).toBe("number");
    expect(state.spend.currency).toBe("INR");
    expect(typeof state.discountSpend.limitPaise).toBe("number");
    expect(state.discountSpend.window).toBe("daily");
  });

  it("kill and revive change real protection state", async () => {
    const killed = await peffleKill(
      new Request("http://localhost/api/admin/peffle/kill", {
        method: "POST",
        headers: { ...staffHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "kill" }),
      }),
    );
    expect(killed.status).toBe(200);
    const killedState = (await killed.json()) as PeffleControlState;
    expect(killedState.killed).toBe(true);
    expect(killedState.protection).toBe("disabled");
    expect(getPeffleControlState().killed).toBe(true);

    const revived = await peffleKill(
      new Request("http://localhost/api/admin/peffle/kill", {
        method: "POST",
        headers: { ...staffHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revive" }),
      }),
    );
    expect(revived.status).toBe(200);
    const revivedState = (await revived.json()) as PeffleControlState;
    expect(revivedState.killed).toBe(false);
    expect(revivedState.protection).toBe("protected");
  });

  it("updates the execution cap in paise for the live guard", async () => {
    const response = await peffleCap(
      new Request("http://localhost/api/admin/peffle/cap", {
        method: "POST",
        headers: { ...staffHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ capPaise: 50000 }),
      }),
    );
    expect(response.status).toBe(200);
    const state = (await response.json()) as PeffleControlState;
    expect(state.spend.limitPaise).toBe(50000);
    setRuntimeCheckoutCapPaise(100_000_000_000);
  });

  it("does not let an unauthenticated buyer start checkout", async () => {
    const response = await checkoutPost(
      new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "missing", source: "cart" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("kill-all disables every known agent including checkout.create", async () => {
    const merchantId = getConfiguredDemoMerchantId();
    const { sessionId } = await createBuyerSession("kill-all tools", merchantId);
    const product = await prisma.product.findFirstOrThrow({ where: { merchantId, sku: "halo-anc" } });

    const killed = await peffleKill(
      new Request("http://localhost/api/admin/peffle/kill", {
        method: "POST",
        headers: { ...staffHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "kill-all" }),
      }),
    );
    expect(killed.status).toBe(200);
    const killedState = (await killed.json()) as PeffleControlState;
    expect(killedState.allAgentsKilled).toBe(true);
    expect(killedState.killed).toBe(true);

    const tool = await applyDiscountTool({
      sessionId,
      merchantId,
      productId: product.id,
      requestedAmountPaise: 5_000,
    });
    expect(tool.reasonCode).toBe("AGENT_KILLED");

    await expect(
      getPeffle().guard(
        { agent: { agentId: PEFFLE_CHECKOUT_AGENT_ID }, action: "checkout.create", amount: 1 },
        () => "charged",
      ),
    ).rejects.toMatchObject({ code: "AGENT_KILLED" });

    const revived = await peffleKill(
      new Request("http://localhost/api/admin/peffle/kill", {
        method: "POST",
        headers: { ...staffHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revive-all" }),
      }),
    );
    expect(revived.status).toBe(200);
    expect(((await revived.json()) as PeffleControlState).allAgentsKilled).toBe(false);
  });

  it("verified buyers cannot call the Peffle kill switch", async () => {
    const buyer = await createVerifiedBuyerAuthContext("Need earbuds", `buyer-peffle-${Date.now()}@example.com`);
    const response = await peffleKill(
      new Request("http://localhost/api/admin/peffle/kill", {
        method: "POST",
        headers: { ...buyer.headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "kill" }),
      }),
    );
    expect(response.status).toBeGreaterThanOrEqual(401);
    expect(getPeffleControlState().killed).toBe(false);
  });
});
