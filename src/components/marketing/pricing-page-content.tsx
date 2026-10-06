"use client";

import { Container } from "@/components/marketing/Container";
import { Pricing } from "@/components/ui/pricing";
import { pefflePricingUiPlans } from "@/lib/peffle/pricing-ui-plans";

export function PricingPageContent() {
  return (
    <main id="content" className="rf-biz-page m-main">
      <Container>
        <Pricing plans={pefflePricingUiPlans()} title="Pricing" />
      </Container>
    </main>
  );
}
