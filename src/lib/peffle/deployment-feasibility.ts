import {
  governedActionsRevenueInr,
  PEFFLE_CREDIT_INR_PER_ACTION,
  PRICING_RESEARCH_CHECKED_DATE,
  usdToInrApprox,
} from "@/lib/peffle/pricing-constants";

/** Provider-published unit or minimum price — reference only. */
export type OfficialListPriceKind = "official_list_price" | "varies_by_vendor" | "not_peffle_infra";

export const LABEL_ILLUSTRATIVE_MODEL = "Illustrative model";
export const LABEL_PLANNING_ASSUMPTION = "Planning assumption";

export const PROTOTYPE_VS_PRODUCTION_COPY =
  "Today's demo and buildathon prototype runs as a single application process with local or single-tenant state. A production Peffle deployment would add shared durable infrastructure, horizontal scaling, and atomic enforcement across instances. The cost tables below model that target architecture — they are not invoices from a live production fleet.";

export type InfrastructureLineItem = {
  id: string;
  category: string;
  provider: string;
  planOrResource: string;
  officialPriceUsd: string;
  whatItProvides: string;
  officialListPriceKind: OfficialListPriceKind;
  sourceUrl: string;
  /** USD/month bands — always planning assumptions applied to workload, not actual Peffle bills. */
  lowUsd: number;
  expectedUsd: number;
  highUsd: number;
  workloadAssumption: string;
  /** When lowUsd equals a published minimum (e.g. Vercel $20 platform fee). */
  lowUsdMatchesListedMinimum?: boolean;
};

/**
 * Early production stack aligned with a typical Next.js + Postgres SaaS prototype.
 * USD figures combine official list prices (where cited) with labelled workload estimates.
 */
export const EARLY_PRODUCTION_INFRA: InfrastructureLineItem[] = [
  {
    id: "compute",
    category: "Compute",
    provider: "Vercel",
    planOrResource: "Pro platform fee",
    officialPriceUsd: "$20/month platform fee (includes $20 monthly usage credit)",
    whatItProvides: "Serverless hosting, builds, CDN allotment for a production Next.js app",
    officialListPriceKind: "official_list_price",
    sourceUrl: "https://vercel.com/docs/plans/pro-plan",
    lowUsd: 20,
    expectedUsd: 35,
    highUsd: 90,
    lowUsdMatchesListedMinimum: true,
    workloadAssumption:
      "Planning assumption: low = published $20 platform fee only; expected/high add modest on-demand Functions and build minutes beyond included credit.",
  },
  {
    id: "database",
    category: "Database",
    provider: "Neon",
    planOrResource: "Launch plan (pay-as-you-go)",
    officialPriceUsd: "$0.106/CU-hour compute · $0.35/GB-month storage",
    whatItProvides: "Managed Postgres with autoscaling and scale-to-zero",
    officialListPriceKind: "official_list_price",
    sourceUrl: "https://neon.tech/pricing",
    lowUsd: 10,
    expectedUsd: 28,
    highUsd: 95,
    workloadAssumption:
      "Planning assumption: 0.25–0.5 CU average with scale-to-zero on non-prod branches; 15–40 GB-month storage for audit and session data, priced at published CU-hour and GB-month rates.",
  },
  {
    id: "object-storage",
    category: "Object storage",
    provider: "Cloudflare",
    planOrResource: "R2 Standard storage",
    officialPriceUsd: "$0.015/GB-month (10 GB-month free tier on Standard)",
    whatItProvides: "Artifacts, exports, and static policy bundles with zero egress fees on R2",
    officialListPriceKind: "official_list_price",
    sourceUrl: "https://developers.cloudflare.com/r2/pricing/",
    lowUsd: 0,
    expectedUsd: 3,
    highUsd: 18,
    workloadAssumption:
      "Planning assumption: remain within published free tier early; grow with audit exports priced at $0.015/GB-month.",
  },
  {
    id: "edge-workers",
    category: "Edge / workers (optional)",
    provider: "Cloudflare",
    planOrResource: "Workers Paid plan",
    officialPriceUsd: "$5/month minimum; 10M requests included on Standard usage model",
    whatItProvides: "Optional edge hooks, rate limits, or webhook ingress separate from Vercel",
    officialListPriceKind: "official_list_price",
    sourceUrl: "https://developers.cloudflare.com/workers/platform/pricing/",
    lowUsd: 0,
    expectedUsd: 5,
    highUsd: 25,
    workloadAssumption:
      "Planning assumption: $0 if unused; $5/month published Workers Paid minimum if edge enforcement is split from Vercel.",
  },
  {
    id: "observability",
    category: "Monitoring / logging",
    provider: "Vercel",
    planOrResource: "Observability Plus (optional)",
    officialPriceUsd: "$1.20 per 1 million observability events",
    whatItProvides: "Extended retention and event-based observability beyond default logs",
    officialListPriceKind: "official_list_price",
    sourceUrl: "https://vercel.com/docs/pricing",
    lowUsd: 0,
    expectedUsd: 0,
    highUsd: 36,
    workloadAssumption:
      "Planning assumption: default platform logs only; high band uses published $1.20 / 1M observability events if Observability Plus is enabled.",
  },
  {
    id: "domain",
    category: "Domain",
    provider: "Registrar (example)",
    planOrResource: ".com registration",
    officialPriceUsd: "Varies by TLD and registrar (not fixed by Peffle)",
    whatItProvides: "Production hostname and TLS",
    officialListPriceKind: "varies_by_vendor",
    sourceUrl: "https://vercel.com/docs/plans/pro-plan",
    lowUsd: 1,
    expectedUsd: 2,
    highUsd: 4,
    workloadAssumption:
      "Planning assumption: ~$12–$40/year amortized monthly; registrar pricing varies (not a single Peffle vendor list price).",
  },
  {
    id: "email",
    category: "Email",
    provider: "Resend",
    planOrResource: "Transactional email",
    officialPriceUsd: "Free: 3,000 emails/mo · Pro: $20/mo for 50,000 emails",
    whatItProvides: "Verification, password reset, and merchant notification email",
    officialListPriceKind: "official_list_price",
    sourceUrl: "https://resend.com/pricing",
    lowUsd: 0,
    expectedUsd: 20,
    highUsd: 35,
    workloadAssumption:
      "Planning assumption: published Free tier (3k emails/mo) at low; published Pro $20/mo at expected when volume exceeds free tier.",
  },
  {
    id: "third-party",
    category: "Third-party APIs",
    provider: "Razorpay · model providers",
    planOrResource: "Pass-through / BYO",
    officialPriceUsd: "Merchant- and customer-specific (not Peffle infrastructure)",
    whatItProvides:
      "Payment capture (Razorpay) and LLM inference billed to the merchant or their model account",
    officialListPriceKind: "not_peffle_infra",
    sourceUrl: "https://razorpay.com/pricing/",
    lowUsd: 0,
    expectedUsd: 0,
    highUsd: 0,
    workloadAssumption:
      "Not Peffle platform COGS: payment and LLM usage are merchant or customer accounts. Shown for completeness at $0 on this table.",
  },
];

export function sumInfrastructureUsd(which: "low" | "expected" | "high"): number {
  return EARLY_PRODUCTION_INFRA.reduce((sum, row) => sum + row[which === "low" ? "lowUsd" : which === "high" ? "highUsd" : "expectedUsd"], 0);
}

export type ScaleScenario = {
  id: string;
  title: string;
  customers: number;
  actionsPerCustomer: number;
  totalActions: number;
  infraUsd: number;
  infraNote: string;
};

/** Modelled infra — not measured production spend. */
export const SCALE_SCENARIOS: ScaleScenario[] = [
  {
    id: "early",
    title: "Early Production",
    customers: 10,
    actionsPerCustomer: 100_000,
    totalActions: 1_000_000,
    infraUsd: sumInfrastructureUsd("expected"),
    infraNote:
      "Uses Early Production expected column. Single-region Vercel + Neon with moderate observability.",
  },
  {
    id: "growth",
    title: "Growth",
    customers: 100,
    actionsPerCustomer: 500_000,
    totalActions: 50_000_000,
    infraUsd: 780,
    infraNote:
      "Modelled estimate: larger Neon compute, higher Vercel on-demand, Resend Scale, added observability. Not vendor-quote.",
  },
  {
    id: "enterprise-scale",
    title: "Enterprise Scale",
    customers: 500,
    actionsPerCustomer: 1_000_000,
    totalActions: 500_000_000,
    infraUsd: 4_200,
    infraNote:
      "Modelled estimate: multi-environment Postgres, higher egress, dedicated support tooling, security add-ons. Planning figure only.",
  },
];

export function scenarioGovernedActions(scenario: ScaleScenario): number {
  return scenario.customers * scenario.actionsPerCustomer;
}

export function scenarioMetrics(scenario: ScaleScenario) {
  const totalActions = scenarioGovernedActions(scenario);
  const revenueInr = governedActionsRevenueInr(totalActions);
  const infraInr = usdToInrApprox(scenario.infraUsd);
  const grossContributionInr = revenueInr - infraInr;
  const grossMarginPct = revenueInr > 0 ? (grossContributionInr / revenueInr) * 100 : 0;
  return { totalActions, revenueInr, infraInr, grossContributionInr, grossMarginPct };
}

export function breakEvenGovernedActions(monthlyInfraInr: number): number {
  return Math.ceil(monthlyInfraInr / PEFFLE_CREDIT_INR_PER_ACTION);
}

export const CUSTOMER_COUNT_EXAMPLES = [10, 50, 100] as const;

export function revenueForCustomers(
  customers: number,
  actionsPerCustomerPerMonth: number,
): number {
  return governedActionsRevenueInr(customers * actionsPerCustomerPerMonth);
}

export const DEPLOYMENT_DISCLAIMER =
  "Actual costs depend on request complexity, database workload, storage, observability, network traffic, and customer architecture. These scenarios are planning models, not financial forecasts.";

export const INFRA_SOURCES_FOOTNOTE = `Official provider list prices are cited for reference. Monthly USD bands and totals are ${LABEL_PLANNING_ASSUMPTION.toLowerCase()}s — not Peffle production invoices. Pricing checked ${PRICING_RESEARCH_CHECKED_DATE}. USD → INR uses an approximate rate for illustration only.`;
