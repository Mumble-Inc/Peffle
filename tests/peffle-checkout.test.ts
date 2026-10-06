import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ApprovalRequiredError, StorageError, type PolicyConfig } from "peffle";
import { db } from "@/lib/db";
import {
  getPeffle,
  mapPeffleCheckoutError,
  PEFFLE_CHECKOUT_ACTION,
  PEFFLE_CHECKOUT_AGENT_ID,
  queryPeffleCheckoutEvents,
  resetPeffleForTests,
} from "@/lib/peffle/client";
import { addToCart } from "@/lib/services/cart";
import { CheckoutError, createCheckoutForSession, createCheckoutFromCart } from "@/lib/services/checkout";
import { createBuyerSession } from "@/lib/services/sessions";
import { runAgentForSession } from "@/lib/services/agent-run";
import { updatePersistedPolicies } from "@/lib/services/policies";

const prisma = new PrismaClient();

const createRazorpayOrder = vi.fn(async ({ amount, receipt }: { amount: number; receipt: string }) => ({
  id: `order_${receipt}`,
  amount,
  currency: "INR",
}));

vi.mock("@/lib/razorpay/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/razorpay/client")>("@/lib/razorpay/client");
  return {
    ...actual,
    isRazorpayConfigured: () => true,
    getPublicRazorpayKeyId: () => "rzp_test_key",
    getRazorpayClient: () => ({
      orders: {
        create: createRazorpayOrder,
      },
    }),
  };
});

const defaultMerchantPolicy = {
  discountCeilingPct: 12,
  marginFloorPct: 18,
  orderCapPaise: 5000000,
  minAttachRatePct: 35,
  allowEvidenceCrossSell: true,
  requireBudgetFit: true,
};

const allowCheckoutPolicy: PolicyConfig = {
  version: 1,
  defaults: { onNoMatchingRule: "deny" },
  budgets: [
    {
      id: "checkout-daily-cap",
      scope: "global",
      window: "daily",
      limit: 100_000_000_000,
      match: { action: PEFFLE_CHECKOUT_ACTION },
    },
  ],
  actions: [
    {
      id: "allow-checkout-create",
      match: { action: PEFFLE_CHECKOUT_ACTION },
      effect: "allow",
    },
  ],
};

function denyCheckoutPolicy(): PolicyConfig {
  return {
    ...allowCheckoutPolicy,
    actions: [
      {
        id: "deny-checkout-create",
        match: { action: PEFFLE_CHECKOUT_ACTION },
        effect: "deny",
        reason: "blocked in test",
      },
    ],
  };
}

function tinyCheckoutBudgetPolicy(): PolicyConfig {
  return {
    ...allowCheckoutPolicy,
    budgets: [
      {
        id: "checkout-daily-cap",
        scope: "global",
        window: "daily",
        limit: 100,
        match: { action: PEFFLE_CHECKOUT_ACTION },
      },
    ],
  };
}

async function readyHaloCheckout() {
  const { sessionId } = await createBuyerSession(
    "halo-anc Halo ANC for a 14-hour flight, budget ₹8,500",
  );
  const { decisionId, result } = await runAgentForSession(sessionId);
  expect(result.status).toBe("ready");
  await addToCart(sessionId, "halo-anc");
  return { sessionId, decisionId };
}

describe("Peffle checkout execution guard", () => {
  beforeAll(async () => {
    await prisma.$connect();
    await updatePersistedPolicies(defaultMerchantPolicy);
  });

  afterEach(async () => {
    createRazorpayOrder.mockClear();
    resetPeffleForTests({
      storagePath: ":memory:",
      policy: allowCheckoutPolicy,
    });
    await updatePersistedPolicies(defaultMerchantPolicy);
  });

  afterAll(async () => {
    resetPeffleForTests();
    await prisma.$disconnect();
  });

  it("allows checkout after merchant validation and records a completed ledger event", async () => {
    resetPeffleForTests({ storagePath: ":memory:", policy: allowCheckoutPolicy });
    const { sessionId } = await readyHaloCheckout();

    const checkout = await createCheckoutFromCart(sessionId, { principal: "buyer_allowed" });

    expect(checkout.amountPaise).toBe(749000);
    expect(createRazorpayOrder).toHaveBeenCalledOnce();
    expect(createRazorpayOrder.mock.calls[0]?.[0]?.amount).toBe(749000);

    const events = queryPeffleCheckoutEvents(sessionId);
    const completed = events.find((event) => event.status === "completed");
    expect(completed).toBeDefined();
    expect(completed?.amount).toBe(749000);
    expect(completed?.agent.principal).toBe("buyer_allowed");
    expect(completed?.action).toBe(PEFFLE_CHECKOUT_ACTION);
  });

  it("blocks checkout.create by Peffle policy before Razorpay order creation", async () => {
    resetPeffleForTests({ storagePath: ":memory:", policy: denyCheckoutPolicy() });
    const { sessionId } = await readyHaloCheckout();

    await expect(createCheckoutFromCart(sessionId, { principal: "buyer_denied" })).rejects.toMatchObject({
      name: "CheckoutError",
      status: 403,
      code: "PEFFLE_POLICY_DENIED",
    } satisfies Partial<CheckoutError>);

    expect(createRazorpayOrder).not.toHaveBeenCalled();
    const orders = await db.order.findMany({ where: { sessionId } });
    expect(orders).toHaveLength(0);

    const events = queryPeffleCheckoutEvents(sessionId);
    expect(events.some((event) => event.status === "denied")).toBe(true);
    expect(events.some((event) => event.status === "completed")).toBe(false);
  });

  it("blocks checkout when amount exceeds the Peffle spend cap in paise", async () => {
    resetPeffleForTests({ storagePath: ":memory:", policy: tinyCheckoutBudgetPolicy() });
    const { sessionId } = await readyHaloCheckout();

    try {
      await createCheckoutFromCart(sessionId, { principal: "buyer_budget" });
      throw new Error("expected budget block");
    } catch (error) {
      expect(error).toMatchObject({
        name: "CheckoutError",
        status: 403,
        code: "PEFFLE_BUDGET_EXCEEDED",
      });
      const blocked = error as CheckoutError;
      expect(blocked.peffle?.blocked).toBe(true);
      expect(blocked.peffle?.amountPaise).toBe(749000);
      expect(blocked.peffle?.limitPaise).toBe(100);
    }

    expect(createRazorpayOrder).not.toHaveBeenCalled();
    const events = queryPeffleCheckoutEvents(sessionId);
    expect(events.some((event) => event.status === "denied")).toBe(true);
  });

  it("blocks checkout when the razorflow-desk agent is killed", async () => {
    resetPeffleForTests({ storagePath: ":memory:", policy: allowCheckoutPolicy });
    getPeffle().kill(PEFFLE_CHECKOUT_AGENT_ID, { reason: "test kill" });
    const { sessionId, decisionId } = await readyHaloCheckout();

    await expect(
      createCheckoutForSession(sessionId, decisionId, { principal: "buyer_killed" }),
    ).rejects.toMatchObject({
      name: "CheckoutError",
      status: 403,
      code: "PEFFLE_AGENT_KILLED",
    } satisfies Partial<CheckoutError>);

    expect(createRazorpayOrder).not.toHaveBeenCalled();
    const events = queryPeffleCheckoutEvents(sessionId);
    expect(events.some((event) => event.status === "denied")).toBe(true);
  });

  it("allows checkout again after the kill switch is revived", async () => {
    resetPeffleForTests({ storagePath: ":memory:", policy: allowCheckoutPolicy });
    getPeffle().kill(PEFFLE_CHECKOUT_AGENT_ID);
    getPeffle().revive(PEFFLE_CHECKOUT_AGENT_ID);
    const { sessionId } = await readyHaloCheckout();

    const checkout = await createCheckoutFromCart(sessionId, { principal: "buyer_revived" });
    expect(checkout.amountPaise).toBe(749000);
    expect(createRazorpayOrder).toHaveBeenCalledOnce();
  });

  it("still enforces merchant policy independently of Peffle", async () => {
    resetPeffleForTests({ storagePath: ":memory:", policy: allowCheckoutPolicy });
    const { sessionId, decisionId } = await readyHaloCheckout();

    await updatePersistedPolicies({
      ...defaultMerchantPolicy,
      marginFloorPct: 95,
    });

    await expect(createCheckoutForSession(sessionId, decisionId, { principal: "buyer_merchant" })).rejects.toMatchObject({
      name: "CheckoutError",
      status: 403,
      message: expect.stringContaining("Policy re-check blocked"),
    } satisfies Partial<CheckoutError>);

    expect(createRazorpayOrder).not.toHaveBeenCalled();
    expect(queryPeffleCheckoutEvents(sessionId)).toHaveLength(0);

    await updatePersistedPolicies(defaultMerchantPolicy);
  });

  it("maps storage errors without re-opening the ledger for cap metadata", () => {
    const mapped = mapPeffleCheckoutError(new StorageError("Failed to open storage"));
    expect(mapped).toMatchObject({
      name: "CheckoutError",
      status: 503,
      code: "PEFFLE_UNAVAILABLE",
    });
    expect(mapped.message).toMatch(/Node 22/);
    expect(mapped.peffle?.limitPaise).toBe(1_000_000);
  });

  it("maps unexpected approval-required errors without exposing a redemption token", () => {
    const mapped = mapPeffleCheckoutError(new ApprovalRequiredError("evt_test", "secret-token"));
    expect(mapped).toMatchObject({
      name: "CheckoutError",
      status: 403,
      code: "PEFFLE_APPROVAL_REQUIRED",
    });
    expect(mapped.message).not.toMatch(/secret-token/);
    expect(JSON.stringify(mapped)).not.toMatch(/secret-token/);
  });
});
