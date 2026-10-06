"use client";

import Link from "next/link";
import { AgentAuthorityDiagram } from "@/components/marketing/business/agent-authority-diagram";
import {
  BusinessDisclosure,
  BusinessSection,
  FlowDiagram,
  InlineLinkCta,
} from "@/components/marketing/business/business-page-chrome";
import { UnitEconomicsChart } from "@/components/marketing/business/unit-economics-chart";
import { Container } from "@/components/marketing/Container";
import { GlassButton } from "@/components/marketing/GlassButton";
import { PrimaryButton } from "@/components/marketing/PrimaryButton";
import {
  formatInr,
  governedActionsRevenueInr,
  PEFFLE_CREDIT_INR_PER_1000_ACTIONS,
} from "@/lib/peffle/pricing-constants";
import { LABEL_ILLUSTRATIVE_MODEL, PROTOTYPE_VS_PRODUCTION_COPY } from "@/lib/peffle/deployment-feasibility";
import {
  ILLUSTRATIVE_CUSTOMER_PROFILES,
  PEFFLE_PRICING_MODELS,
} from "@/lib/peffle/pricing-models";

export function PricingPageContent() {
  return (
    <main id="content" className="rf-biz-page m-main">
      <Container>
        <header className="rf-biz-hero rf-biz-hero--compact">
          <p className="rf-biz-eyebrow">Pricing models</p>
          <h1>Control autonomous software. Pay for what you govern.</h1>
          <p className="rf-biz-hero-lead">
            Peffle is a B2B execution-control layer for AI agents. Start with governed commerce
            actions and scale into enterprise agent infrastructure.
          </p>
          <p className="rf-biz-hero-meta">Model-agnostic. Payment-rail agnostic. Usage-based.</p>
          <BusinessDisclosure className="rf-biz-prototype-callout">
            {PROTOTYPE_VS_PRODUCTION_COPY}
          </BusinessDisclosure>
        </header>

        <BusinessSection title="Ways to work with Peffle" lead="Three pricing models for how you buy and deploy control.">
          <div className="rf-biz-tier-grid">
            {PEFFLE_PRICING_MODELS.map((tier) => (
              <article
                key={tier.id}
                className="rf-biz-tier"
                data-emphasized={tier.emphasized ? "true" : "false"}
              >
                <header className="rf-biz-tier-head">
                  <h3>{tier.name}</h3>
                  <p className="rf-biz-tier-price">{tier.priceLabel}</p>
                  <p className="rf-biz-tier-sub">{tier.priceSubtitle}</p>
                  <p className="rf-biz-tier-audience">{tier.audience}</p>
                </header>
                <ul className="rf-biz-tier-features">
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {tier.footnote ? <p className="rf-biz-tier-foot">{tier.footnote}</p> : null}
                <div className="rf-biz-tier-cta">
                  {tier.emphasized ? (
                    <PrimaryButton href={tier.cta.href}>{tier.cta.label}</PrimaryButton>
                  ) : (
                    <GlassButton reflective href={tier.cta.href} className="rf-biz-cta-full">
                      {tier.cta.label}
                    </GlassButton>
                  )}
                </div>
              </article>
            ))}
          </div>
        </BusinessSection>

        <BusinessSection
          id="economics"
          title="Revenue scales with autonomous activity."
          lead={`Peffle Credits meter governed actions — policy checks, tool calls, approvals, and checkout gates that actually execute. Revenue examples below are ${LABEL_ILLUSTRATIVE_MODEL.toLowerCase()}s at the published list price — not reported company revenue.`}
        >
          <FlowDiagram
            lines={[
              "More agent activity",
              "More governed actions",
              "More Peffle Credits",
              "More revenue",
            ]}
          />
          <p className="rf-biz-prose">
            Peffle does not need to charge every customer a large fixed subscription. A small company
            can start with low usage, while an enterprise running millions of governed actions becomes
            a much larger customer.
          </p>
          <div className="rf-biz-table-wrap">
            <table className="rf-biz-table">
              <thead>
                <tr>
                  <th scope="col">Volume profile ({LABEL_ILLUSTRATIVE_MODEL})</th>
                  <th scope="col">Governed actions / month</th>
                  <th scope="col">Bill at list price</th>
                </tr>
              </thead>
              <tbody>
                {ILLUSTRATIVE_CUSTOMER_PROFILES.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className="rf-biz-mono">{row.actionsPerMonth.toLocaleString("en-IN")}</td>
                    <td className="rf-biz-mono">
                      {formatInr(governedActionsRevenueInr(row.actionsPerMonth))}
                      <span className="rf-biz-table-sub">
                        at ₹{PEFFLE_CREDIT_INR_PER_1000_ACTIONS} / 1,000 actions
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <BusinessDisclosure>
            {LABEL_ILLUSTRATIVE_MODEL}. Hypothetical volumes and bills — not current contracts, live
            customers, or reported Peffle revenue. List price ₹{PEFFLE_CREDIT_INR_PER_1000_ACTIONS} /
            1,000 actions used for math only.
          </BusinessDisclosure>
          <p className="rf-biz-prose">
            For infrastructure assumptions and break-even math, see{" "}
            <InlineLinkCta href="/deployment">Deployment &amp; Feasibility</InlineLinkCta>.
          </p>
        </BusinessSection>

        <BusinessSection title="Why Peffle can scale efficiently">
          <div className="rf-biz-points">
            <div className="rf-biz-point">
              <h3>1. No proprietary LLM infrastructure</h3>
              <p>Customers bring their own models or use the models they already depend on.</p>
            </div>
            <div className="rf-biz-point">
              <h3>2. Lightweight control layer</h3>
              <p>
                Peffle primarily needs application compute, shared state, database, storage, and
                observability.
              </p>
            </div>
            <div className="rf-biz-point">
              <h3>3. Usage-aligned revenue</h3>
              <p>As governed activity increases, Peffle revenue increases with it.</p>
            </div>
            <div className="rf-biz-point">
              <h3>4. Shared infrastructure</h3>
              <p>
                Production infrastructure can scale horizontally instead of requiring a separate
                deployment for every customer.
              </p>
            </div>
          </div>
          <FlowDiagram
            lines={["Customer AI", "Peffle", "Customer tools", "Real-world action"]}
          />
          <BusinessDisclosure>
            Peffle does not pay for the customer&apos;s LLM or GPU inference. Model spend stays on the
            customer&apos;s provider account.
          </BusinessDisclosure>
        </BusinessSection>

        <BusinessSection title="Peffle does not need its own foundation model." compact>
          <p className="rf-biz-prose">
            OpenAI, Anthropic, Google, and open-source models provide intelligence. Peffle provides
            execution authority.
          </p>
          <AgentAuthorityDiagram />
        </BusinessSection>

        <BusinessSection title="Commerce is the starting point, not the destination.">
          <div className="rf-biz-roadmap">
            <div className="rf-biz-roadmap-col">
              <p className="rf-biz-roadmap-phase">Today · Commerce</p>
              <ul>
                <li>Checkout</li>
                <li>Discounts</li>
                <li>Refunds</li>
              </ul>
            </div>
            <div className="rf-biz-roadmap-col">
              <p className="rf-biz-roadmap-phase">Next · Email</p>
              <ul>
                <li>Send email</li>
                <li>Issue customer credits</li>
                <li>Automated outreach</li>
              </ul>
            </div>
            <div className="rf-biz-roadmap-col">
              <p className="rf-biz-roadmap-phase">Then · Deployment</p>
              <ul>
                <li>Deploy</li>
                <li>Roll back</li>
                <li>Modify infrastructure</li>
              </ul>
            </div>
            <div className="rf-biz-roadmap-col">
              <p className="rf-biz-roadmap-phase">Future</p>
              <p>Any consequential agent action</p>
            </div>
          </div>
          <p className="rf-biz-prose rf-biz-prose--emphasis">
            The agent changes. The tool changes. The control layer stays the same.
          </p>
        </BusinessSection>

        <BusinessSection title="Why Peffle?">
          <p className="rf-biz-prose">
            The market is moving toward agent runtime security and authorization. Peffle&apos;s
            opportunity is to be a developer-first, model-agnostic execution-control layer focused
            specifically on consequential actions.
          </p>
          <div className="rf-biz-roles">
            <div>
              <h3>Peffle does not replace</h3>
              <ul>
                <li>OpenAI / Anthropic / Gemini</li>
                <li>Razorpay / Stripe</li>
                <li>Cloud providers</li>
              </ul>
            </div>
            <div className="rf-biz-roles-callout">
              <p>AI models provide intelligence.</p>
              <p>Payment providers move money.</p>
              <p>Cloud platforms provide infrastructure.</p>
              <p className="rf-biz-roles-accent">Peffle controls execution authority.</p>
            </div>
          </div>
        </BusinessSection>

        <BusinessSection title="Infrastructure cost vs Peffle revenue">
          <UnitEconomicsChart />
        </BusinessSection>

        <footer className="rf-biz-page-foot">
          <PrimaryButton href="/desk">Open the desk</PrimaryButton>
          <Link href="/deployment" className="rf-biz-text-link">
            Deployment &amp; feasibility →
          </Link>
        </footer>
      </Container>
    </main>
  );
}
