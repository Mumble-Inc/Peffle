import type { Metadata } from "next";
import { AmbientBackground } from "@/components/landing/ambient-background";
import { DeploymentPageContent } from "@/components/marketing/deployment-page-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "../peffle-business-pages.css";

export const metadata: Metadata = {
  title: "Deployment & Feasibility",
  description:
    "Estimated infrastructure costs, scale scenarios, and break-even planning for running Peffle with cited cloud provider pricing.",
};

export default function DeploymentPage() {
  return (
    <div className="rf-landing-page m-landing-shell">
      <AmbientBackground />
      <SiteHeader />
      <DeploymentPageContent />
      <SiteFooter />
    </div>
  );
}
