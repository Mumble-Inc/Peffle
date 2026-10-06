import type { ChatHistoryTurn } from "@/lib/agent/chat-history";
import { generateChatReplyWithSystem, type ChatReplyPlanner } from "@/lib/agent/chat-reply";
import type { PoliciesFormValues } from "@/lib/policy/map";
import type { PeffleControlState } from "@/lib/peffle/types";
import { formatInr } from "@/lib/format";

export function summarizeGuardrails(
  policies: PoliciesFormValues,
  peffle: PeffleControlState,
): string {
  const checkoutCap = formatInr(peffle.spend.limitPaise / 100);
  const discountCap = peffle.discountSpend
    ? formatInr(peffle.discountSpend.limitPaise / 100)
    : "not set";
  return [
    `Merchant policy for ${policies.merchant}:`,
    `• Discount ceiling ${policies.maxDiscountPct}%`,
    `• Margin floor ${policies.minMarginPct}%`,
    `• Max order ${formatInr(policies.maxOrderInr)}`,
    `• Min attach rate ${policies.minAttachRatePct}%`,
    `• Cross-sell ${policies.allowCrossSell ? "allowed" : "off"}`,
    `• Budget fit ${policies.requireBudgetFit ? "required" : "optional"}`,
    `Peffle execution: checkout daily cap ${checkoutCap}, discount budget ${discountCap}, agent ${peffle.killed ? "disabled" : "protected"}.`,
  ].join("\n");
}

const ADMIN_SYSTEM_HINT = `You help merchant staff configure guardrails in natural language.
You can explain merchant policy (discount ceiling, margin floor, order cap, attach rate, cross-sell, budget fit) and Peffle execution caps (checkout spend, discount budget, kill switch).
When the user wants a change, tell them exact phrases the server understands, for example:
"Set discount ceiling to 10%", "Set margin floor to 20%", "Set order cap to ₹50000", "Set daily spend limit to 1 lakh", "Set discount daily budget to ₹800".
To disable the agent they must say "Confirm disable agent" after reviewing impact.
Never claim a change was saved unless the tool summary says it was applied. Amounts use en-IN INR.`;

export async function generateAdminGuardrailsReply(
  message: string,
  context: {
    merchantName: string;
    toolSummary: string;
    policies: PoliciesFormValues;
    peffle: PeffleControlState;
  },
  history: ChatHistoryTurn[] = [],
): Promise<{ reply: string; planner: ChatReplyPlanner }> {
  const snapshot = summarizeGuardrails(context.policies, context.peffle);
  const system = `${ADMIN_SYSTEM_HINT}\nMerchant: ${context.merchantName}\n\nCurrent snapshot:\n${snapshot}\n\n${context.toolSummary}`;
  return generateChatReplyWithSystem(message, system, history, (text) =>
    text.trim()
      ? `Tell me what to change, for example "Set discount ceiling to 10%" or "Show current guardrails".`
      : "Ask to show current guardrails or set discount ceiling, margin floor, order cap, or Peffle spend limits.",
  );
}
