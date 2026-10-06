import type { PoliciesFormValues } from "@/lib/policy/map";

export type AdminGuardrailsIntent =
  | { kind: "summarize" }
  | { kind: "update_merchant_policy"; patch: Partial<PoliciesFormValues> }
  | { kind: "set_checkout_cap_inr"; inr: number }
  | { kind: "set_discount_budget_inr"; inr: number }
  | { kind: "disable_agent"; confirmed: boolean }
  | { kind: "enable_agent" };

export const ADMIN_GUARDRAILS_PLACEHOLDER =
  "Set discount ceiling, margin floor, order cap, or Peffle spend limits…";

function parseInrAmount(raw: string): number | null {
  const n = Number(raw.replaceAll(",", "").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Parses INR amounts including 1 lakh, 2.5 lac, 50k, ₹1,00,000. */
export function parseIndianInrPhrase(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(/₹/g, "").replace(/\brs\.?\b/g, "").trim();
  if (!text) return null;

  const lakh = text.match(/^(\d+(?:\.\d+)?)\s*(?:lakh|lac|lakhs|lacs)$/);
  if (lakh) return Math.round(Number(lakh[1]) * 100_000);

  const crore = text.match(/^(\d+(?:\.\d+)?)\s*(?:crore|cr|crores)$/);
  if (crore) return Math.round(Number(crore[1]) * 10_000_000);

  const thousand = text.match(/^(\d+(?:\.\d+)?)\s*k$/);
  if (thousand) return Math.round(Number(thousand[1]) * 1_000);

  const mixedLakh = text.match(/^(\d+(?:\.\d+)?)\s*(?:lakh|lac)\b/);
  if (mixedLakh) return Math.round(Number(mixedLakh[1]) * 100_000);

  return parseInrAmount(text);
}

function parseCapturedMoney(capture: string): number | null {
  const trimmed = capture.trim().replace(/[.!?]+$/, "");
  return parseIndianInrPhrase(trimmed);
}

export function planAdminGuardrailsIntents(message: string): AdminGuardrailsIntent[] {
  const text = message.trim();
  if (!text) return [];

  const intents: AdminGuardrailsIntent[] = [];

  if (
    /\b(what|show|current|list|summarize|summary)\b/i.test(text) &&
    /\b(policies?|guardrails?|limits?|ceiling|margin|rules)\b/i.test(text)
  ) {
    intents.push({ kind: "summarize" });
    return intents;
  }

  const patch: Partial<PoliciesFormValues> = {};

  const discount =
    text.match(/discount(?:\s+ceiling|\s+limit|\s+cap)?\s*(?:to|=)?\s*(\d{1,2})\s*%/i) ??
    text.match(/(\d{1,2})\s*%\s*(?:max\s*)?discount/i) ??
    text.match(/set\s+(?:the\s+)?(?:max\s*)?discount\s+(?:to\s+)?(\d{1,2})/i);
  if (discount) patch.maxDiscountPct = Number(discount[1]);

  const margin =
    text.match(/margin\s+floor\s*(?:to|=)?\s*(\d{1,2})\s*%/i) ??
    text.match(/set\s+margin\s+(?:to\s+)?(\d{1,2})\s*%/i);
  if (margin) patch.minMarginPct = Number(margin[1]);

  const attach =
    text.match(/attach\s+rate\s*(?:to|=)?\s*(\d{1,2})\s*%/i) ??
    text.match(/min(?:imum)?\s+attach\s+(\d{1,2})\s*%/i);
  if (attach) patch.minAttachRatePct = Number(attach[1]);

  const order =
    text.match(/order\s+cap\s*(?:to|=)?\s*(.+?)(?:\.|$)/i) ??
    text.match(/max(?:imum)?\s+order\s*(?:value|cap)?\s*(?:to|=)?\s*(.+?)(?:\.|$)/i);
  if (order) {
    const inr = parseCapturedMoney(order[1]);
    if (inr != null) patch.maxOrderInr = inr;
  }

  if (/\bdisable\s+cross[\s-]?sell/i.test(text)) patch.allowCrossSell = false;
  if (/\benable\s+cross[\s-]?sell/i.test(text)) patch.allowCrossSell = true;
  if (/\brequire\s+budget\s+fit/i.test(text)) patch.requireBudgetFit = true;
  if (/\b(?:disable|turn\s+off)\s+budget\s+fit/i.test(text)) patch.requireBudgetFit = false;

  if (Object.keys(patch).length > 0) {
    intents.push({ kind: "update_merchant_policy", patch });
  }

  const checkoutCap =
    text.match(/\bcheckout\s+(?:daily\s+)?cap\s*(?:to|=)?\s*(.+?)(?:\.|$)/i) ??
    text.match(/\bdaily\s+spend\s+limit\s*(?:to|=)?\s*(.+?)(?:\.|$)/i) ??
    text.match(/\b(?:daily\s+)?(?:checkout|execution)\s+spend\s+(?:limit|cap)\s*(?:to|=)?\s*(.+?)(?:\.|$)/i) ??
    text.match(/\bset\s+(?:the\s+)?daily\s+spend\s+(?:limit|cap)\s+to\s+(.+?)(?:\.|$)/i);
  if (checkoutCap) {
    const inr = parseCapturedMoney(checkoutCap[1]);
    if (inr != null) intents.push({ kind: "set_checkout_cap_inr", inr });
  }

  const discountBudget =
    text.match(/discount\s+(?:daily\s+)?budget\s*(?:to|=)?\s*(.+?)(?:\.|$)/i) ??
    text.match(/daily\s+discount\s+cap\s*(?:to|=)?\s*(.+?)(?:\.|$)/i);
  if (discountBudget) {
    const inr = parseCapturedMoney(discountBudget[1]);
    if (inr != null) intents.push({ kind: "set_discount_budget_inr", inr });
  }

  if (/\b(?:enable|revive)\s+agent\b/i.test(text) && !/\bdisable|kill\b/i.test(text)) {
    intents.push({ kind: "enable_agent" });
  } else if (/\b(?:disable|kill)\s+agent\b/i.test(text) || /\bkill\s+switch\b/i.test(text)) {
    intents.push({ kind: "disable_agent", confirmed: /\bconfirm\b/i.test(text) });
  }

  return intents;
}

export function mergePolicyPatch(
  current: PoliciesFormValues,
  patch: Partial<PoliciesFormValues>,
): PoliciesFormValues {
  return {
    ...current,
    ...patch,
    merchant: current.merchant,
  };
}
