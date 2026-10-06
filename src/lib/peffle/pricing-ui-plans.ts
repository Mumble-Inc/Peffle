import type { PricingPlan } from "@/components/ui/pricing";
import { PEFFLE_PRICING_MODELS } from "@/lib/peffle/pricing-models";

/** Maps Peffle pricing models to the shadcn Pricing card schema (INR, no fake annual discount). */
export function pefflePricingUiPlans(): PricingPlan[] {
  return PEFFLE_PRICING_MODELS.map((model) => {
    const isPayg = model.id === "payg";
    return {
      name: model.name,
      price: isPayg ? "49" : undefined,
      priceDisplay: isPayg ? undefined : model.priceLabel,
      yearlyPrice: isPayg ? "49" : undefined,
      period: model.priceSubtitle,
      features: model.features,
      description: model.audience,
      buttonText: model.cta.label,
      href: model.cta.href,
      isPopular: Boolean(model.emphasized),
      footnote: model.footnote,
      showUsageToggle: isPayg,
    };
  });
}
