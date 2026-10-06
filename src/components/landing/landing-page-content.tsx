import { Money } from "@/components/money";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingGovernanceList } from "@/components/landing/landing-governance-list";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingSettlementRail } from "@/components/landing/landing-settlement-rail";
import { LandingMarketingHero } from "@/components/landing/landing-marketing-hero";
import { ButtonLink } from "@/components/ui/design-system";
import { SettlementGate } from "@/components/ui/settlement-primitives";
import type { LandingShowcase } from "@/lib/services/desk-context";

type LandingMetrics = {
  weekGmv: number;
  attachRevenue: number;
  policyBlocks: number;
  policyEvaluated: number;
};

type LandingPageContentProps = {
  showcase: LandingShowcase;
  metrics: LandingMetrics;
  policyBlockLabel: string;
};

export function LandingPageContent({
  showcase,
  metrics,
  policyBlockLabel,
}: LandingPageContentProps) {
  const featured = showcase.featured;
  const discount = showcase.policyCopy.find((item) => item.id === "discount");

  return (
    <main id="content" className="m-main rf-landing bg-canvas">
      <LandingMarketingHero showcase={showcase} />

      <section
        className="rf-land-section rf-surface-section-alt"
        aria-labelledby="how-heading"
        id="how-it-works"
      >
        <div className="rf-land-section-inner">
          <p className="rf-section-label">How Peffle works</p>
          <h2 id="how-heading" className="rf-land-section-title">
            One request, one settlement line
          </h2>
          <p className="rf-land-section-lede">
            Intent moves down the line. Policy and approval decide whether commerce and settlement
            may continue.
          </p>
          <LandingHowItWorks />
        </div>
      </section>

      {featured && discount ? (
        <section className="rf-land-section" aria-labelledby="gate-heading" id="the-gate">
          <div className="rf-land-section-inner">
            <p className="rf-section-label">The gate</p>
            <h2 id="gate-heading" className="rf-land-section-title">
              Same product. This request stops.
            </h2>
            <p className="rf-land-section-lede">
              The trace above stays inside policy. This request crosses the discount ceiling, so
              Razorpay never sees an order.
            </p>
            <div className="rf-gate-demo">
              <div className="rf-gate-demo-rail">
                <LandingSettlementRail
                  activeStepId="policy"
                  mode="blocked"
                  blockedAt="policy"
                />
              </div>
              <div className="rf-gate-demo-detail">
                <div className="rf-refusal-request rf-land-card">
                  <p className="rf-trace-meta">Buyer request</p>
                  <p className="rf-trace-statement" translate="no">
                    {featured.name}, more than {showcase.discountCeilingPct}% off list.
                  </p>
                  <p className="rf-trace-note">
                    List price <Money value={featured.price} />. The agent can recommend it. It
                    cannot discount past the ceiling.
                  </p>
                </div>
                <SettlementGate
                  elevated
                  title="Stopped at the gate"
                  reason={`${discount.title}. ${discount.rule} Peffle blocked checkout before Razorpay.`}
                  className="rf-gate-card"
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rf-land-section rf-surface-section" aria-labelledby="guardrails-heading">
        <div className="rf-land-section-inner">
          <p className="rf-section-label">Rules</p>
          <h2 id="guardrails-heading" className="rf-land-section-title">
            The rules behind that block
          </h2>
          <p className="rf-land-section-lede">{showcase.guardrailSummary}</p>
          <LandingGovernanceList items={showcase.policyCopy} />
        </div>
      </section>

      <section className="rf-land-section" aria-labelledby="metrics-heading" id="ledger">
        <div className="rf-land-section-inner">
          <p className="rf-section-label">Ledger</p>
          <h2 id="metrics-heading" className="rf-land-section-title">
            What the ledger has verified
          </h2>
          <p className="rf-land-section-lede">
            Captured payments and policy evaluations only. Figures stay at zero until the store has
            processed activity.
          </p>
          <div className="rf-metrics-band" data-testid="landing-ledger">
            <figure className="rf-metrics-band-cell">
              <figcaption className="rf-metrics-band-label">GMV this week</figcaption>
              <p className="rf-metrics-band-value">
                <Money value={metrics.weekGmv} />
              </p>
              <p className="rf-metrics-band-hint">Verified Razorpay captures only</p>
            </figure>
            <figure className="rf-metrics-band-cell">
              <figcaption className="rf-metrics-band-label">Attach revenue</figcaption>
              <p className="rf-metrics-band-value text-accent">
                <Money value={metrics.attachRevenue} delta />
              </p>
            </figure>
            <figure className="rf-metrics-band-cell">
              <figcaption className="rf-metrics-band-label">Policy blocks</figcaption>
              <p className="rf-metrics-band-value">{policyBlockLabel}</p>
            </figure>
            <figure className="rf-metrics-band-cell">
              <figcaption className="rf-metrics-band-label">Evaluations</figcaption>
              <p className="rf-metrics-band-value">{metrics.policyEvaluated || "0"}</p>
            </figure>
          </div>
        </div>
      </section>

      <section className="rf-land-section rf-surface-section-alt" aria-labelledby="faq-heading">
        <div className="rf-land-section-inner">
          <h2 id="faq-heading" className="rf-land-section-title">
            Before you open the desk
          </h2>
          <LandingFaq />
        </div>
      </section>

      <section className="rf-land-cta rf-env-atmosphere">
        <div className="rf-land-cta-inner">
          <div>
            <h2 className="rf-land-cta-title">See the block on a live catalog</h2>
            <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-muted">
              Merchant policy still prices the offer. Peffle decides whether checkout may execute
              before Razorpay.
            </p>
          </div>
          <ButtonLink href="/desk" className="shrink-0">
            Start on the desk
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
