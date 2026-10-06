import { GoogleGenAI, type FunctionDeclaration, Type } from "@google/genai";
import { getGeminiApiKey, getGeminiModel, GEMINI_REQUEST_TIMEOUT_MS } from "@/lib/gemini/config";
import { geminiErrorText, withGeminiRetry } from "@/lib/gemini/retry";
import {
  executeAgentTool,
  type ToolName,
  type ToolResult,
} from "@/lib/services/agent-tools";
import { db } from "@/lib/db";
import type { ChatHistoryTurn } from "@/lib/agent/chat-history";
import { generateAgentChatReply, type ChatReplyPlanner } from "@/lib/agent/chat-reply";
import { shouldRunChatGuardedTools } from "@/lib/agent/desk-guide";
import { resolveDemoMerchant } from "@/lib/services/merchant";

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

const CHAT_TOOL_SYSTEM = `You are Peffle in the desk CHAT panel (not the catalog search bar).
Only call tools when the user explicitly wants to TRY a guarded discount or refund in chat.
Never call search_products — catalog search is only via the top command bar.
You cannot set prices or bypass merchant or Peffle policy.
Never claim success unless the tool result ok=true.`;

type PlannedCall = { name: ToolName; args: Record<string, unknown> };

function isToolName(name: string): name is ToolName {
  return name === "search_products" || name === "apply_discount" || name === "issue_refund";
}

/** Guarded actions for chat only (discount/refund demos). No catalog search. */
export function planChatGuardedTools(message: string, productId?: string | null): PlannedCall[] {
  const text = message.trim();
  if (!text || !shouldRunChatGuardedTools(text)) return [];

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
      return [];
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

  return [];
}

/** @deprecated Use planChatGuardedTools for desk chat; catalog search uses the command bar agent. */
export function planToolsDeterministic(message: string, productId?: string | null): PlannedCall[] {
  return planChatGuardedTools(message, productId);
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
          systemInstruction: CHAT_TOOL_SYSTEM,
          tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
          temperature: 0.1,
        },
      });
      const calls = response.functionCalls ?? [];
      return calls.flatMap((call) => {
        if (!call.name || !isToolName(call.name)) return [];
        if (call.name === "search_products") return [];
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

export async function runAgentChat(
  sessionId: string,
  message: string,
  history: ChatHistoryTurn[] = [],
) {
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
  const geminiConfigured = Boolean(getGeminiApiKey());
  const wantsTools = shouldRunChatGuardedTools(message);
  let planned: PlannedCall[] = [];
  let planner: ChatReplyPlanner = "deterministic";
  let plannerReason = wantsTools ? "chat_guarded_action" : "desk_guide";
  if (wantsTools) {
    if (geminiConfigured) {
      try {
        planned = await planToolsWithGemini(message);
        planner = "gemini";
        plannerReason = planned.length ? "gemini_tool_calls" : "gemini_no_tools";
      } catch (error) {
        planned = planChatGuardedTools(message, primaryId);
        planner = "deterministic";
        plannerReason = `gemini_fallback:${geminiErrorText(error)}`;
      }
    } else {
      planned = planChatGuardedTools(message, primaryId);
      plannerReason = "gemini_not_configured";
    }
    if (planned.length === 0 && wantsTools) {
      planned = planChatGuardedTools(message, primaryId);
    }
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

  let reply: string;
  if (results.length > 0) {
    reply = replyFromTools(message, results, geminiConfigured);
  } else if (wantsTools && !primaryId) {
    reply =
      "Run a catalog search from the top bar first so I know which product you mean, then ask again for a discount in chat.";
    plannerReason = "discount_needs_product";
  } else {
    const merchant = await resolveDemoMerchant();
    const toolSummary = wantsTools ? "Guarded action requested but no tool ran." : "Desk guide turn.";
    const generated = await generateAgentChatReply(
      message,
      {
        merchantName: merchant.name,
        toolSummary,
      },
      history,
    );
    reply = generated.reply;
    planner = generated.planner;
    if (!wantsTools) {
      plannerReason = `desk_guide:${generated.planner}`;
    }
  }

  return {
    reply,
    planner,
    plannerReason,
    tools: results,
  };
}
