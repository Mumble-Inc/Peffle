"use client";

import { Container } from "@/components/marketing/Container";
import { GlassButton } from "@/components/marketing/GlassButton";
import { PrimaryButton } from "@/components/marketing/PrimaryButton";
import { LandingTrace } from "@/components/landing/landing-trace";
import { CloudShader } from "@/components/ui/cloud-shader";
import type { LandingShowcase } from "@/lib/services/desk-context";

type Props = {
  showcase: LandingShowcase;
};

export function LandingMarketingHero({ showcase }: Props) {
  return (
    <section className="m-hero rf-env-atmosphere" id="top" data-testid="glass-env-wash">
      <div className="m-hero__sky" data-testid="hero-cloud-shader" aria-hidden>
        <CloudShader className="h-full min-h-0 w-full" />
      </div>
      <Container>
        <p className="m-hero__chip">{showcase.merchant.name}</p>
        <h1 id="hero-heading" className="m-hero__title">
          AI commerce without giving AI a blank cheque.
        </h1>
        <p className="m-hero__lead">
          Peffle matches a buyer to your catalog, checks merchant policy, and authorizes execution
          before Razorpay sees an order.
        </p>
        <div className="m-hero__actions">
          <PrimaryButton href="/desk">Open the desk</PrimaryButton>
          <GlassButton reflective href="#live-trace">
            See live trace
          </GlassButton>
        </div>
        <div className="m-hero__stage">
          <LandingTrace showcase={showcase} />
        </div>
      </Container>
    </section>
  );
}
