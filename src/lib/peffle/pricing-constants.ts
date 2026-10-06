/** Illustrative Peffle list price for planning pages — not a binding quote. */
export const PEFFLE_CREDIT_INR_PER_1000_ACTIONS = 49;

export const PEFFLE_CREDIT_INR_PER_ACTION = PEFFLE_CREDIT_INR_PER_1000_ACTIONS / 1000;

/** Approximate FX for USD → INR display on business pages only. */
export const USD_TO_INR_APPROX = 83.5;

export const PRICING_RESEARCH_CHECKED_DATE = "2025-10-06";

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function usdToInrApprox(usd: number): number {
  return Math.round(usd * USD_TO_INR_APPROX);
}

export function governedActionsRevenueInr(actions: number): number {
  return (actions / 1000) * PEFFLE_CREDIT_INR_PER_1000_ACTIONS;
}
