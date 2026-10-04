import { GoogleGenAI, type FunctionDeclaration, Type } from "@google/genai";
import { getGeminiApiKey, getGeminiModel, GEMINI_REQUEST_TIMEOUT_MS } from "@/lib/gemini/config";
import { geminiErrorText, withGeminiRetry } from "@/lib/gemini/retry";
import {
  executeAgentTool,
  type ToolName,
  type ToolResult,
} from "@/lib/services/agent-tools";
import { db } from "@/lib/db";

export const AGENT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_products",
    description: "Search the merchant catalog. Does not change prices.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search text" },
      },
      required: ["query"],
    },
  },
  {
    name: "apply_discount",
    description:
      "Request a discount. Server recomputes the paise amount. Never set a raw price. Prefer requestedPct or requestedAmountPaise.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        productId: { type: Type.STRING },
        requestedPct: { type: Type.NUMBER },
        requestedAmountPaise: { type: Type.NUMBER },
      },
      required: ["productId"],
    },
  },
  {
    name: "issue_refund",
    description: "Request a refund on a captured order. Requires operator approval.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderId: { type: Type.STRING },
        amountPaise: { type: Type.NUMBER },
      },
      required: ["orderId", "amountPaise"],
    },
  },
];

const SYSTEM = `You are a commerce desk assistant. You cannot set prices. You cannot ignore merchant or Peffle policy.
Use tools for search, discounts, and refunds. If a tool is blocked, tell the buyer honestly.
Never claim a Razorpay refund or discount succeeded unless the tool result ok=true.`;

type PlannedCall = { name: ToolName; args: Record<string, unknown> };

function isToolName(name: string): name is ToolName {
  return name === "search_products" || name === "apply_discount" || name === "issue_refund";
}

export function planToolsDeterministic(message: string, productId?: string | null): PlannedCall[] {
  const text = message.trim();
  if (!text) return [];

  if (/\brefund\b/i.test(text)) {
    const amount = text.match(/₹?\s*([\d,]+)/);
    const paise = amount ? Math.round(Number(amount[1].replaceAll(",", "")) * (text.includes("₹") || Number(amount[1]) < 100000 ? 100 : 1)) : 0;
    return [
      {
        name: "issue_refund",
        args: {
          orderId: "pending",
          amountPaise: Number.isFinite(paise) && paise > 0 ? paise : 100,
        },
      },
    ];
  }

  const pct = text.match(/(\d{1,2})\s*%\s*off/i) ?? text.match(/(\d{1,2})\s*%/i);
  const rupeesOff =
    text.match(/(?:₹|rs\.?|inr)\s*([\d,]+)\s*off/i) ??
    text.match(/([\d,]+)\s*(?:rupees?|rs)\s*off/i) ??
    text.match(/([\d,]+)\s+off/i);
  if (pct || rupeesOff || /\bdiscount\b/i.test(text)) {
    if (!productId) {
      return [{ name: "search_products", args: { query: text } }];
    }
    if (pct) {
      return [
        {
          name: "apply_discount",
          args: { productId, requestedPct: Number(pct[1]) },
        },
      ];
    }
    if (rupeesOff) {
      return [
        {
          name: "apply_discount",
          args: { productId, requestedAmountPaise: Math.round(Number(rupeesOff[1].replaceAll(",", "")) * 100) },
        },
      ];
    }
    return [{ name: "apply_discount", args: { productId, requestedPct: 5 } }];
  }

  if (/\b(show|find|search|browse|options)\b/i.test(text)) {
    return [{ name: "search_products", args: { query: text } }];
  }

  return [];
}

export async function planToolsWithGemini(message: string): Promise<PlannedCall[]> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return [];

  return withGeminiRetry(async () => {
    const client = new GoogleGenAI({ apiKey });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);
    try {
      const response = await client.models.generateContent({
        model: getGeminiModel(),
        contents: message,
        config: {
          abortSignal: controller.signal,
          systemInstruction: SYSTEM,
          tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
          temperature: 0.1,
        },
      });
      const calls = response.functionCalls ?? [];
      return calls.flatMap((call) => {
        if (!call.name || !isToolName(call.name)) return [];
        return [{ name: call.name, args: (call.args ?? {}) as Record<string, unknown> }];
      });
    } finally {
      clearTimeout(timeout);
    }
  });
}

function replyFromTools(message: string, results: ToolResult[], usedGemini: boolean): string {
  if (results.length === 0) {
    return usedGemini
      ? "I can search the catalog, request a discount, or request a refund. I cannot set prices myself."
      : "I can search the catalog, request a discount, or request a refund. I cannot set prices myself.";
  }
  return results
    .map((result) => {
      if (result.reasonCode === "APPROVAL_REQUIRED") return `${result.message} Event ${result.peffleEventId ?? "pending"}.`;
      if (result.reasonCode === "AGENT_KILLED") return "This agent is disabled. Checkout and discounts stay blocked until an operator revives it.";
      if (result.reasonCode === "BUDGET_EXCEEDED") return "I can't apply that discount — the daily execution budget is exhausted.";
      return result.message;
    })
    .join(" ");
}

export async function runAgentChat(sessionId: string, message: string) {
  const session = await db.buyerSession.findUnique({
    where: { id: sessionId },
    include: {
      decisions: { orderBy: { createdAt: "desc" }, include: { primaryProduct: true }, take: 1 },
      orders: { where: { status: "PAID" }, orderBy: { createdAt: "desc" }, take: 1 },
      cartLines: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  if (!session) {
    throw new Error("Session not found");
  }

  const primaryId =
    session.decisions[0]?.primaryProductId ?? session.decisions[0]?.primaryProduct?.id ?? session.cartLines[0]?.productId ?? null;
  const usedGemini = Boolean(getGeminiApiKey());
  let planned: PlannedCall[] = [];
  let planner: "gemini" | "deterministic" = "deterministic";
  let plannerReason = "gemini_not_configured";
  if (usedGemini) {
    try {
      planned = await planToolsWithGemini(message);
      planner = "gemini";
      plannerReason = planned.length ? "gemini_tool_calls" : "gemini_no_tools";
    } catch (error) {
      planned = planToolsDeterministic(message, primaryId);
      planner = "deterministic";
      plannerReason = `gemini_fallback:${geminiErrorText(error)}`;
    }
  } else {
    planned = planToolsDeterministic(message, primaryId);
    plannerReason = "gemini_not_configured";
  }
  console.info(`planner=${planner} reason=${plannerReason}`);

  const results: ToolResult[] = [];
  for (const call of planned) {
    const args = { ...call.args };
    if (call.name === "apply_discount" && typeof args.productId !== "string" && primaryId) {
      args.productId = primaryId;
    }
    if (call.name === "issue_refund" && (args.orderId === "pending" || typeof args.orderId !== "string")) {
      args.orderId = session.orders[0]?.id ?? "";
    }
    results.push(await executeAgentTool(call.name, args, { sessionId, merchantId: session.merchantId }));
  }

  return {
    reply: replyFromTools(message, results, usedGemini),
    planner,
    plannerReason,
    tools: results,
  };
}
