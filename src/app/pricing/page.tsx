import type { Metadata } from "next";
import { AmbientBackground } from "@/components/landing/ambient-background";
import { PricingPageContent } from "@/components/marketing/pricing-page-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "../peffle-business-pages.css";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Peffle execution-control pricing: pay as you go credits, enterprise platform, and ecosystem partnerships for governed agent actions.",
};

export default function PricingPage() {
  return (
    <div className="rf-landing-page m-landing-shell">
      <AmbientBackground />
      <SiteHeader />
      <PricingPageContent />
      <SiteFooter />
    </div>
  );
}
