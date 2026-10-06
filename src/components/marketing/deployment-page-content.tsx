"use client";

import Link from "next/link";
import { BusinessDisclosure, BusinessSection } from "@/components/marketing/business/business-page-chrome";
import { Container } from "@/components/marketing/Container";
import { PrimaryButton } from "@/components/marketing/PrimaryButton";
import {
  formatInr,
  formatUsd,
  PEFFLE_CREDIT_INR_PER_1000_ACTIONS,
  PEFFLE_CREDIT_INR_PER_ACTION,
  PRICING_RESEARCH_CHECKED_DATE,
  USD_TO_INR_APPROX,
  usdToInrApprox,
} from "@/lib/peffle/pricing-constants";
import {
  breakEvenGovernedActions,
  CUSTOMER_COUNT_EXAMPLES,
  DEPLOYMENT_DISCLAIMER,
  EARLY_PRODUCTION_INFRA,
  INFRA_SOURCES_FOOTNOTE,
  LABEL_ILLUSTRATIVE_MODEL,
  LABEL_PLANNING_ASSUMPTION,
  PROTOTYPE_VS_PRODUCTION_COPY,
  revenueForCustomers,
  SCALE_SCENARIOS,
  scenarioGovernedActions,
  scenarioMetrics,
  sumInfrastructureUsd,
} from "@/lib/peffle/deployment-feasibility";

const WORKLOAD_ASSUMPTION =
  "Single production region, one Next.js app on Vercel Pro, Neon Launch Postgres for sessions and audit, modest object storage, transactional email for auth. No dedicated LLM cluster.";

export function DeploymentPageContent() {
  const lowUsd = sumInfrastructureUsd("low");
  const expectedUsd = sumInfrastructureUsd("expected");
  const highUsd = sumInfrastructureUsd("high");
  const expectedInfraInr = usdToInrApprox(expectedUsd);
  const breakEvenActions = breakEvenGovernedActions(expectedInfraInr);
  const actionsPerCustomerEarly = 100_000;

  return (
    <main id="content" className="rf-biz-page m-main">
      <Container>
        <header className="rf-biz-hero rf-biz-hero--compact">
          <p className="rf-biz-eyebrow">Operations</p>
          <h1>Deployment &amp; Feasibility</h1>
          <p className="rf-biz-hero-lead">What does it actually cost to run Peffle?</p>
          <p className="rf-biz-hero-meta">
            Official provider list prices where available · estimates labelled · FX: USD 1 ≈ ₹
            {USD_TO_INR_APPROX} (approximate)
          </p>
        </header>

        <BusinessDisclosure className="rf-biz-prototype-callout">
          <strong>{LABEL_PLANNING_ASSUMPTION}.</strong> {PROTOTYPE_VS_PRODUCTION_COPY}
        </BusinessDisclosure>

        <BusinessSection
          title="Early Production — estimated monthly infrastructure"
          lead={`${WORKLOAD_ASSUMPTION} Monthly totals are ${LABEL_PLANNING_ASSUMPTION.toLowerCase()}s built from official list prices plus workload assumptions — not actual production spend.`}
        >
          <div className="rf-biz-table-wrap">
            <table className="rf-biz-table rf-biz-table--dense">
              <thead>
                <tr>
                  <th scope="col">Component</th>
                  <th scope="col">Provider</th>
                  <th scope="col">Official provider pricing (reference)</th>
                  <th scope="col">Planning assumption (USD/mo)</th>
                  <th scope="col">≈ INR/mo (expected band)</th>
                  <th scope="col">List price type</th>
                </tr>
              </thead>
              <tbody>
                {EARLY_PRODUCTION_INFRA.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.category}</strong>
                      <span className="rf-biz-table-sub">{row.workloadAssumption}</span>
                    </td>
                    <td>{row.provider}</td>
                    <td>
                      <span className="rf-biz-table-sub">{row.planOrResource}</span>
                      {row.officialPriceUsd}
                    </td>
                    <td className="rf-biz-mono">
                      {formatUsd(row.lowUsd)} – {formatUsd(row.highUsd)}
                      <span className="rf-biz-table-sub">{LABEL_PLANNING_ASSUMPTION}</span>
                    </td>
                    <td className="rf-biz-mono">{formatInr(usdToInrApprox(row.expectedUsd))}</td>
                    <td>
                      <span className="rf-biz-tag rf-biz-tag--official">
                        {row.officialListPriceKind === "official_list_price"
                          ? "Listed unit / minimum"
                          : row.officialListPriceKind === "varies_by_vendor"
                            ? "Varies by vendor"
                            : "Not platform COGS"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={3}>
                    Total monthly infrastructure ({LABEL_PLANNING_ASSUMPTION})
                  </th>
                  <td className="rf-biz-mono">
                    {formatUsd(lowUsd)} – {formatUsd(highUsd)}
                  </td>
                  <td className="rf-biz-mono">{formatInr(expectedInfraInr)}</td>
                  <td />
                </tr>
                <tr>
                  <th scope="row" colSpan={3}>
                    Total yearly ({LABEL_ILLUSTRATIVE_MODEL}: expected column × 12)
                  </th>
                  <td colSpan={2} className="rf-biz-mono">
                    {formatInr(expectedInfraInr * 12)} / year
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <BusinessDisclosure>{INFRA_SOURCES_FOOTNOTE}</BusinessDisclosure>
        </BusinessSection>

        <BusinessSection
          title="Scale scenarios"
          lead={`${LABEL_ILLUSTRATIVE_MODEL}. Hypothetical customer counts and volumes — not current Peffle traction, revenue, or production workloads.`}
        >
          <div className="rf-biz-table-wrap">
            <table className="rf-biz-table">
              <thead>
                <tr>
                  <th scope="col">Scenario</th>
                  <th scope="col">Customers</th>
                  <th scope="col">Actions / customer / mo</th>
                  <th scope="col">Total governed actions</th>
                  <th scope="col">Modelled infra (USD)</th>
                  <th scope="col">Illustrative revenue (INR)</th>
                  <th scope="col">Gross contribution*</th>
                  <th scope="col">Gross margin*</th>
                </tr>
              </thead>
              <tbody>
                {SCALE_SCENARIOS.map((scenario) => {
                  const m = scenarioMetrics(scenario);
                  return (
                    <tr key={scenario.id}>
                      <td>
                        <strong>{scenario.title}</strong>
                        <span className="rf-biz-table-sub">{scenario.infraNote}</span>
                      </td>
                      <td className="rf-biz-mono">{scenario.customers}</td>
                      <td className="rf-biz-mono">
                        {scenario.actionsPerCustomer.toLocaleString("en-IN")}
                      </td>
                      <td className="rf-biz-mono">
                        {scenarioGovernedActions(scenario).toLocaleString("en-IN")}
                      </td>
                      <td className="rf-biz-mono">
                        {formatUsd(scenario.infraUsd)}
                        <span className="rf-biz-table-sub">{LABEL_PLANNING_ASSUMPTION}</span>
                      </td>
                      <td className="rf-biz-mono">
                        {formatInr(m.revenueInr)}
                        <span className="rf-biz-table-sub">{LABEL_ILLUSTRATIVE_MODEL}</span>
                      </td>
                      <td className="rf-biz-mono">{formatInr(m.grossContributionInr)}</td>
                      <td className="rf-biz-mono">{m.grossMarginPct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <BusinessDisclosure>
            *Gross contribution and margin exclude salaries, sales, support, and payment-provider
            fees. {DEPLOYMENT_DISCLAIMER}
          </BusinessDisclosure>
        </BusinessSection>

        <BusinessSection
          title="Break-even illustration (infrastructure only)"
          lead={`${LABEL_ILLUSTRATIVE_MODEL}. Covers shared infrastructure only — excludes payroll, sales, support, and payment fees. Not a statement of current profitability.`}
        >
          <p className="rf-biz-prose">
            List price: ₹{PEFFLE_CREDIT_INR_PER_1000_ACTIONS} per 1,000 governed actions (₹
            {PEFFLE_CREDIT_INR_PER_ACTION} per action). Monthly infrastructure{" "}
            {LABEL_PLANNING_ASSUMPTION.toLowerCase()}: {formatInr(expectedInfraInr)} (≈{" "}
            {formatUsd(expectedUsd)} at USD 1 ≈ ₹{USD_TO_INR_APPROX}).
          </p>
          <div className="rf-biz-math-block">
            <p className="rf-biz-mono">
              Break-even governed actions = ceil(monthly infrastructure ÷ revenue per action)
            </p>
            <p className="rf-biz-mono">
              = ceil({expectedInfraInr} ÷ {PEFFLE_CREDIT_INR_PER_ACTION}) ={" "}
              {breakEvenActions.toLocaleString("en-IN")} actions / month
            </p>
            <p className="rf-biz-mono rf-biz-math-result">
              Check: {breakEvenActions.toLocaleString("en-IN")} × ₹{PEFFLE_CREDIT_INR_PER_ACTION} ≈{" "}
              {formatInr(Math.round(breakEvenActions * PEFFLE_CREDIT_INR_PER_ACTION))} revenue
            </p>
          </div>
          <div className="rf-biz-table-wrap">
            <table className="rf-biz-table">
              <thead>
                <tr>
                  <th scope="col">Customers</th>
                  <th scope="col">Assumed actions / customer / mo</th>
                  <th scope="col">Illustrative model — monthly revenue</th>
                </tr>
              </thead>
              <tbody>
                {CUSTOMER_COUNT_EXAMPLES.map((count) => (
                  <tr key={count}>
                    <td>{count} customers</td>
                    <td className="rf-biz-mono">{actionsPerCustomerEarly.toLocaleString("en-IN")}</td>
                    <td className="rf-biz-mono">
                      {formatInr(revenueForCustomers(count, actionsPerCustomerEarly))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <BusinessDisclosure>
            {LABEL_ILLUSTRATIVE_MODEL}. Hypothetical customer counts only — Peffle does not imply
            these customers exist today. Assumes {actionsPerCustomerEarly.toLocaleString("en-IN")}{" "}
            governed actions per customer per month at ₹{PEFFLE_CREDIT_INR_PER_1000_ACTIONS} / 1,000
            actions.
          </BusinessDisclosure>
        </BusinessSection>

        <BusinessSection title="Sources" compact>
          <ul className="rf-biz-sources">
            {EARLY_PRODUCTION_INFRA.map((row) => (
              <li key={row.id}>
                <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {row.provider} — {row.category}
                </a>
              </li>
            ))}
          </ul>
          <p className="rf-biz-table-sub">Pricing checked {PRICING_RESEARCH_CHECKED_DATE}.</p>
        </BusinessSection>

        <footer className="rf-biz-page-foot">
          <PrimaryButton href="/pricing">Back to pricing</PrimaryButton>
          <Link href="/desk" className="rf-biz-text-link">Open the desk →</Link>
        </footer>
      </Container>
    </main>
  );
}
