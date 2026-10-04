import type { AuditEventType, Prisma } from "@prisma/client";
import type { ActionRequest } from "peffle";
import { marginPct } from "@/lib/agent/parse-intent";
import { recordAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  DISCOUNT_CAP_BUDGET_ID,
  getDiscountCapPaise,
  getPeffle,
  guardAction,
  PEFFLE_DISCOUNT_ACTION,
  PEFFLE_REFUND_ACTION,
  PEFFLE_SEARCH_ACTION,
  queryPeffleCheckoutEvents,
} from "@/lib/peffle/client";
import { rememberApproval } from "@/lib/peffle/approvals";
import { isApprovalRequiredError, mapPeffleError } from "@/lib/peffle/errors";
import { sessionAgentId } from "@/lib/peffle/runtime";
import { getAvailableCatalog } from "@/lib/services/catalog";
import { getMerchantPoliciesForAgent } from "@/lib/services/policies";
import { createRazorpayRefund } from "@/lib/razorpay/refund";

export type ToolName = "search_products" | "apply_discount" | "issue_refund";

export type ToolResult = {
  ok: boolean;
  tool: ToolName;
  reasonCode: string;
  message: string;
  peffleEventId: string | null;
  data: Record<string, unknown>;
};

function utcDayStartIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export function dailyDiscountSpentPaise() {
  const start = utcDayStartIso();
  return getPeffle()
    .query({ action: PEFFLE_DISCOUNT_ACTION, limit: 500 })
    .reduce((sum, event) => {
      if (event.status !== "completed" && event.status !== "in_progress") return sum;
      if (event.createdAt < start) return sum;
      if (typeof event.amount !== "number") return sum;
      return sum + event.amount;
    }, 0);
}

export function discountBudgetSnapshot() {
  const limitPaise = getDiscountCapPaise();
  const spentPaise = dailyDiscountSpentPaise();
  return {
    budgetId: DISCOUNT_CAP_BUDGET_ID,
    window: "daily" as const,
    limitPaise,
    spentPaise,
    remainingPaise: Math.max(0, limitPaise - spentPaise),
  };
}

async function audit(
  sessionId: string,
  type: AuditEventType,
  data: Prisma.InputJsonValue,
) {
  await recordAuditEvent(sessionId, type, "peffle", data);
}

function latestPeffleEventId(agentId: string, action: string) {
  return getPeffle().query({ agentId, action, limit: 1 })[0]?.id ?? null;
}

async function runGuarded<T>(
  sessionId: string,
  merchantId: string,
  tool: ToolName,
  action: string,
  amount: number | undefined,
  args: Record<string, unknown>,
  fn: () => Promise<T>,
  approval?: { eventId: string; token: string },
): Promise<{ value: T; eventId: string | null }> {
  const request: ActionRequest = {
    agent: { agentId: sessionAgentId(sessionId), principal: `session:${sessionId}` },
    action,
    resource: typeof args.resource === "string" ? args.resource : undefined,
    amount,
    metadata: { merchantId, sessionId, tool, ...args },
  };

  try {
    const value = await guardAction(request, fn, approval ? { approval } : undefined);
    const eventId = latestPeffleEventId(sessionAgentId(sessionId), action);
    return { value, eventId };
  } catch (error) {
    if (isApprovalRequiredError(error)) {
      rememberApproval(error, {
        request,
        tool,
        args,
        sessionId,
        merchantId,
      });
    }
    throw error;
  }
}

function peffleToolFailure(tool: ToolName, error: unknown): ToolResult {
  const mapped = mapPeffleError(error);
  const peffleEventId = mapped.eventId;
  return {
    ok: false,
    tool,
    reasonCode: mapped.reasonCode,
    message: mapped.message,
    peffleEventId,
    data: {
      limitPaise: mapped.limitPaise ?? null,
      spentPaise: mapped.spentPaise ?? null,
    },
  };
}

export async function searchProductsTool(input: {
  sessionId: string;
  merchantId: string;
  query: string;
  approval?: { eventId: string; token: string };
}): Promise<ToolResult> {
  const query = input.query.trim().slice(0, 120);
  if (!query) {
    return {
      ok: false,
      tool: "search_products",
      reasonCode: "INVALID_INPUT",
      message: "Search query is required.",
      peffleEventId: null,
      data: {},
    };
  }

  try {
    const { value, eventId } = await runGuarded(
      input.sessionId,
      input.merchantId,
      "search_products",
      PEFFLE_SEARCH_ACTION,
      undefined,
      { query, resource: `catalog:${input.merchantId}` },
      async () => {
        const catalog = await getAvailableCatalog(input.merchantId);
        const needle = query.toLowerCase();
        return catalog
          .filter(
            (product) =>
              product.name.toLowerCase().includes(needle) ||
              product.sku.toLowerCase().includes(needle) ||
              product.category.toLowerCase().includes(needle) ||
              product.tags.some((tag) => tag.toLowerCase().includes(needle)),
          )
          .slice(0, 8)
          .map((product) => ({
            productId: product.id,
            sku: product.sku,
            name: product.name,
            pricePaise: product.pricePaise,
            category: product.category,
          }));
      },
      input.approval,
    );

    await audit(input.sessionId, "AGENT_TOOL_ALLOWED", {
      tool: "search_products",
      reasonCode: "ALLOWED",
      peffleEventId: eventId,
      count: value.length,
    });

    return {
      ok: true,
      tool: "search_products",
      reasonCode: "ALLOWED",
      message: value.length ? `Found ${value.length} product(s).` : "No catalog matches.",
      peffleEventId: eventId,
      data: { products: value },
    };
  } catch (error) {
    const result = peffleToolFailure("search_products", error);
    await audit(input.sessionId, "AGENT_TOOL_BLOCKED", {
      tool: "search_products",
      reasonCode: result.reasonCode,
      peffleEventId: result.peffleEventId,
    });
    return result;
  }
}

function clampDiscountPaise(pricePaise: number, costPaise: number, requestedPaise: number, maxPct: number, minMarginPct: number) {
  const ceilingPaise = Math.floor((pricePaise * maxPct) / 100);
  let amount = Math.min(requestedPaise, ceilingPaise, pricePaise - 1);
  if (amount < 0) amount = 0;
  const selling = pricePaise - amount;
  const margin = marginPct(selling / 100, costPaise / 100);
  if (margin < minMarginPct) {
    const minSell = Math.ceil(costPaise / (1 - minMarginPct / 100));
    amount = Math.max(0, pricePaise - minSell);
  }
  return amount;
}

export async function applyDiscountTool(input: {
  sessionId: string;
  merchantId: string;
  productId: string;
  requestedPct?: number;
  requestedAmountPaise?: number;
  approval?: { eventId: string; token: string };
}): Promise<ToolResult> {
  const product = await db.product.findFirst({
    where: { id: input.productId, merchantId: input.merchantId, active: true },
  });
  if (!product) {
    return {
      ok: false,
      tool: "apply_discount",
      reasonCode: "PRODUCT_NOT_FOUND",
      message: "Product is not in this merchant catalog.",
      peffleEventId: null,
      data: {},
    };
  }
  if (product.inventory < 1) {
    await audit(input.sessionId, "AGENT_TOOL_BLOCKED", {
      tool: "apply_discount",
      reasonCode: "OUT_OF_STOCK",
      productId: product.id,
    });
    return {
      ok: false,
      tool: "apply_discount",
      reasonCode: "OUT_OF_STOCK",
      message: `${product.name} is out of stock.`,
      peffleEventId: null,
      data: { productId: product.id },
    };
  }

  const policies = await getMerchantPoliciesForAgent(input.merchantId);
  const requested =
    typeof input.requestedAmountPaise === "number" && Number.isInteger(input.requestedAmountPaise)
      ? input.requestedAmountPaise
      : typeof input.requestedPct === "number"
        ? Math.round((product.pricePaise * input.requestedPct) / 100)
        : 0;

  if (!Number.isInteger(requested) || requested <= 0) {
    return {
      ok: false,
      tool: "apply_discount",
      reasonCode: "INVALID_INPUT",
      message: "Discount amount must be a positive integer in paise.",
      peffleEventId: null,
      data: {},
    };
  }

  const existing = await db.sessionDiscount.findUnique({
    where: { sessionId_productId: { sessionId: input.sessionId, productId: product.id } },
  });
  const clamped = clampDiscountPaise(
    product.pricePaise,
    product.costPaise,
    requested,
    policies.maxDiscountPct,
    policies.minMarginPct,
  );

  if (clamped <= 0) {
    await audit(input.sessionId, "AGENT_TOOL_BLOCKED", {
      tool: "apply_discount",
      reasonCode: "MARGIN_FLOOR",
      productId: product.id,
    });
    return {
      ok: false,
      tool: "apply_discount",
      reasonCode: "MARGIN_FLOOR",
      message: "I can't go that low — merchant margin floor blocks this discount.",
      peffleEventId: null,
      data: { productId: product.id, maxDiscountPct: policies.maxDiscountPct },
    };
  }

  if (typeof input.requestedPct === "number" && input.requestedPct > policies.maxDiscountPct && clamped < requested) {
    await audit(input.sessionId, "AGENT_TOOL_BLOCKED", {
      tool: "apply_discount",
      reasonCode: "DISCOUNT_CEILING",
      productId: product.id,
      requestedPct: input.requestedPct,
      ceilingPct: policies.maxDiscountPct,
    });
    return {
      ok: false,
      tool: "apply_discount",
      reasonCode: "DISCOUNT_CEILING",
      message: `I can't go that low. Merchant discount ceiling is ${policies.maxDiscountPct}%.`,
      peffleEventId: null,
      data: { ceilingPct: policies.maxDiscountPct, productId: product.id },
    };
  }

  if (existing && existing.amountPaise === clamped) {
    return {
      ok: true,
      tool: "apply_discount",
      reasonCode: "IDEMPOTENT",
      message: `Discount of ${clamped} paise is already applied.`,
      peffleEventId: existing.peffleEventId,
      data: { productId: product.id, amountPaise: clamped },
    };
  }

  const delta = clamped - (existing?.amountPaise ?? 0);
  if (delta <= 0) {
    await db.sessionDiscount.update({
      where: { id: existing!.id },
      data: { amountPaise: clamped },
    });
    return {
      ok: true,
      tool: "apply_discount",
      reasonCode: "ALLOWED",
      message: `Discount reduced to ${clamped} paise.`,
      peffleEventId: existing?.peffleEventId ?? null,
      data: { productId: product.id, amountPaise: clamped },
    };
  }

  try {
    const { eventId } = await runGuarded(
      input.sessionId,
      input.merchantId,
      "apply_discount",
      PEFFLE_DISCOUNT_ACTION,
      delta,
      { productId: product.id, amountPaise: clamped, resource: `product:${product.id}` },
      async () => {
        await db.sessionDiscount.upsert({
          where: { sessionId_productId: { sessionId: input.sessionId, productId: product.id } },
          create: {
            sessionId: input.sessionId,
            productId: product.id,
            amountPaise: clamped,
          },
          update: { amountPaise: clamped },
        });
      },
      input.approval,
    );

    if (eventId) {
      await db.sessionDiscount.update({
        where: { sessionId_productId: { sessionId: input.sessionId, productId: product.id } },
        data: { peffleEventId: eventId },
      });
    }

    await audit(input.sessionId, "AGENT_TOOL_ALLOWED", {
      tool: "apply_discount",
      reasonCode: "ALLOWED",
      peffleEventId: eventId,
      productId: product.id,
      amountPaise: clamped,
    });

    return {
      ok: true,
      tool: "apply_discount",
      reasonCode: "ALLOWED",
      message: `Applied ${clamped} paise off ${product.name}.`,
      peffleEventId: eventId,
      data: { productId: product.id, sku: product.sku, amountPaise: clamped, listPricePaise: product.pricePaise },
    };
  } catch (error) {
    const result = peffleToolFailure("apply_discount", error);
    const type =
      result.reasonCode === "APPROVAL_REQUIRED" ? "AGENT_TOOL_APPROVAL_REQUIRED" : "AGENT_TOOL_BLOCKED";
    await audit(input.sessionId, type, {
      tool: "apply_discount",
      reasonCode: result.reasonCode,
      peffleEventId: result.peffleEventId,
      productId: product.id,
      amountPaise: clamped,
    });
    return result;
  }
}

export async function issueRefundTool(input: {
  sessionId: string;
  merchantId: string;
  orderId: string;
  amountPaise: number;
  approval?: { eventId: string; token: string };
}): Promise<ToolResult> {
  if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) {
    return {
      ok: false,
      tool: "issue_refund",
      reasonCode: "INVALID_INPUT",
      message: "Refund amount must be a positive integer in paise.",
      peffleEventId: null,
      data: {},
    };
  }

  const order = await db.order.findFirst({
    where: { id: input.orderId, sessionId: input.sessionId },
    include: { payments: true, refunds: true, session: true },
  });
  if (!order || order.session.merchantId !== input.merchantId) {
    return {
      ok: false,
      tool: "issue_refund",
      reasonCode: "ORDER_NOT_FOUND",
      message: "Order not found for this session.",
      peffleEventId: null,
      data: {},
    };
  }

  const captured = order.payments.filter((payment) => payment.status === "CAPTURED");
  const capturedPaise = order.status === "PAID" || captured.length > 0 ? order.amountPaise : 0;
  const alreadyRefunded = order.refunds
    .filter((refund) => refund.status === "ISSUED")
    .reduce((sum, refund) => sum + refund.amountPaise, 0);
  const remaining = capturedPaise - alreadyRefunded;

  if (capturedPaise <= 0) {
    await audit(input.sessionId, "AGENT_TOOL_BLOCKED", {
      tool: "issue_refund",
      reasonCode: "ORDER_NOT_CAPTURED",
      orderId: order.id,
    });
    return {
      ok: false,
      tool: "issue_refund",
      reasonCode: "ORDER_NOT_CAPTURED",
      message: "Refunds are only allowed on captured payments.",
      peffleEventId: null,
      data: { orderId: order.id },
    };
  }

  const amount = Math.min(input.amountPaise, remaining);
  if (amount <= 0) {
    return {
      ok: false,
      tool: "issue_refund",
      reasonCode: "NOTHING_TO_REFUND",
      message: "Nothing remains to refund on this order.",
      peffleEventId: null,
      data: { orderId: order.id },
    };
  }

  try {
    const { value, eventId } = await runGuarded(
      input.sessionId,
      input.merchantId,
      "issue_refund",
      PEFFLE_REFUND_ACTION,
      amount,
      { orderId: order.id, amountPaise: amount, resource: `order:${order.id}` },
      async () => {
        let razorpayRefundId: string | null = null;
        const payment = captured.find((row) => row.razorpayPaymentId);
        if (payment?.razorpayPaymentId) {
          const refund = await createRazorpayRefund(payment.razorpayPaymentId, amount);
          razorpayRefundId = refund?.id ?? null;
        }
        return db.refund.create({
          data: {
            orderId: order.id,
            amountPaise: amount,
            status: "ISSUED",
            peffleEventId: null,
            razorpayRefundId,
          },
        });
      },
      input.approval,
    );

    if (eventId) {
      await db.refund.update({ where: { id: value.id }, data: { peffleEventId: eventId } });
    }

    await audit(input.sessionId, "AGENT_TOOL_ALLOWED", {
      tool: "issue_refund",
      reasonCode: "ALLOWED",
      peffleEventId: eventId,
      orderId: order.id,
      amountPaise: amount,
    });

    return {
      ok: true,
      tool: "issue_refund",
      reasonCode: "ALLOWED",
      message: `Refunded ${amount} paise.`,
      peffleEventId: eventId,
      data: { orderId: order.id, amountPaise: amount, refundId: value.id },
    };
  } catch (error) {
    const result = peffleToolFailure("issue_refund", error);
    const type =
      result.reasonCode === "APPROVAL_REQUIRED" ? "AGENT_TOOL_APPROVAL_REQUIRED" : "AGENT_TOOL_BLOCKED";
    await audit(input.sessionId, type, {
      tool: "issue_refund",
      reasonCode: result.reasonCode,
      peffleEventId: result.peffleEventId,
      orderId: order.id,
      amountPaise: amount,
    });
    if (result.reasonCode === "APPROVAL_REQUIRED") {
      result.message = "This refund needs operator approval.";
    }
    return result;
  }
}

export async function executeAgentTool(
  name: ToolName,
  args: Record<string, unknown>,
  ctx: { sessionId: string; merchantId: string; approval?: { eventId: string; token: string } },
): Promise<ToolResult> {
  if (name === "search_products") {
    return searchProductsTool({
      ...ctx,
      query: typeof args.query === "string" ? args.query : "",
    });
  }
  if (name === "apply_discount") {
    return applyDiscountTool({
      ...ctx,
      productId: typeof args.productId === "string" ? args.productId : "",
      requestedPct: typeof args.requestedPct === "number" ? args.requestedPct : undefined,
      requestedAmountPaise:
        typeof args.requestedAmountPaise === "number" ? args.requestedAmountPaise : undefined,
    });
  }
  if (name === "issue_refund") {
    return issueRefundTool({
      ...ctx,
      orderId: typeof args.orderId === "string" ? args.orderId : "",
      amountPaise: typeof args.amountPaise === "number" ? args.amountPaise : 0,
    });
  }
  return {
    ok: false,
    tool: "search_products",
    reasonCode: "UNKNOWN_TOOL",
    message: "Unknown tool.",
    peffleEventId: null,
    data: {},
  };
}

export { queryPeffleCheckoutEvents };
