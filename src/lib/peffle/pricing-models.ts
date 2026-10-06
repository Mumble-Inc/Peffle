export type PricingModelId = "payg" | "enterprise" | "ecosystem";

export type PricingModel = {
  id: PricingModelId;
  name: string;
  priceLabel: string;
  priceSubtitle: string;
  audience: string;
  features: string[];
  footnote?: string;
  cta: { label: string; href: string };
  emphasized?: boolean;
};

export const PEFFLE_PRICING_MODELS: PricingModel[] = [
  {
    id: "payg",
    name: "Pay as you go",
    priceLabel: "From ₹49",
    priceSubtitle: "Per 1,000 governed agent actions",
    audience: "For startups and teams validating autonomous workflows.",
    features: [
      "Peffle Credits",
      "Execution policies",
      "Tool permissions",
      "Budgets and limits",
      "Approval workflows",
      "Audit trail",
      "Commerce checkout controls",
    ],
    footnote: "Pay only for governed activity.",
    cta: { label: "Open the desk", href: "/desk" },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceLabel: "Custom",
    priceSubtitle: "Platform + committed usage",
    audience:
      "For organizations running agents across multiple teams, brands, or environments.",
    emphasized: true,
    features: [
      "Everything in Pay as you go",
      "Shared policy infrastructure",
      "Multiple environments",
      "Advanced approvals",
      "SSO / enterprise identity",
      "Extended audit retention",
      "Compliance controls",
      "Dedicated support",
      "Higher execution volumes",
    ],
    cta: { label: "Talk to sales", href: "mailto:hello@peffle.dev?subject=Peffle%20Enterprise" },
  },
  {
    id: "ecosystem",
    name: "Ecosystem",
    priceLabel: "Partner",
    priceSubtitle: "Platform and integration revenue",
    audience:
      "For platforms, payment providers, and developers embedding Peffle into their own products.",
    features: [
      "SDK / API access",
      "Premium integrations",
      "White-label capabilities",
      "Partner policy templates",
      "Usage / revenue sharing",
      "Developer tooling",
    ],
    cta: { label: "Join the ecosystem", href: "mailto:hello@peffle.dev?subject=Peffle%20Ecosystem" },
  },
];

export const ILLUSTRATIVE_CUSTOMER_PROFILES = [
  {
    label: "Small volume",
    actionsPerMonth: 10_000,
  },
  {
    label: "Medium volume",
    actionsPerMonth: 500_000,
  },
  {
    label: "Large volume",
    actionsPerMonth: 5_000_000,
  },
] as const;
