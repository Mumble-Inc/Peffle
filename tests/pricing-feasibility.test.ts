import { describe, expect, it } from "vitest";
import {
  governedActionsRevenueInr,
  PEFFLE_CREDIT_INR_PER_1000_ACTIONS,
  PEFFLE_CREDIT_INR_PER_ACTION,
  usdToInrApprox,
} from "@/lib/peffle/pricing-constants";
import {
  breakEvenGovernedActions,
  SCALE_SCENARIOS,
  scenarioGovernedActions,
  scenarioMetrics,
  sumInfrastructureUsd,
} from "@/lib/peffle/deployment-feasibility";

describe("Peffle business page math", () => {
  it("computes illustrative customer bills at ₹49 per 1k actions", () => {
    expect(PEFFLE_CREDIT_INR_PER_ACTION).toBe(0.049);
    expect(governedActionsRevenueInr(10_000)).toBe(490);
    expect(governedActionsRevenueInr(500_000)).toBe(24_500);
    expect(governedActionsRevenueInr(5_000_000)).toBe(245_000);
    expect(governedActionsRevenueInr(1_000_000)).toBe(49_000);
    expect(governedActionsRevenueInr(50_000_000)).toBe(2_450_000);
    expect(governedActionsRevenueInr(500_000_000)).toBe(24_500_000);
  });

  it("sums early production infrastructure bands", () => {
    const expected = sumInfrastructureUsd("expected");
    expect(expected).toBe(93);
    expect(sumInfrastructureUsd("low")).toBe(31);
    expect(sumInfrastructureUsd("high")).toBe(303);
    expect(sumInfrastructureUsd("low")).toBeLessThanOrEqual(expected);
    expect(sumInfrastructureUsd("high")).toBeGreaterThanOrEqual(expected);
  });

  it("computes break-even actions from infrastructure INR", () => {
    const monthlyInr = 10_000;
    const actions = breakEvenGovernedActions(monthlyInr);
    expect(actions * PEFFLE_CREDIT_INR_PER_ACTION).toBeGreaterThanOrEqual(monthlyInr);
    expect(actions).toBe(Math.ceil(monthlyInr / PEFFLE_CREDIT_INR_PER_ACTION));
  });

  it("matches break-even to expected early-production planning column", () => {
    const expectedUsd = sumInfrastructureUsd("expected");
    const infraInr = usdToInrApprox(expectedUsd);
    const actions = breakEvenGovernedActions(infraInr);
    expect(infraInr).toBe(7766);
    expect(actions).toBe(158_490);
    expect(governedActionsRevenueInr(actions)).toBeGreaterThanOrEqual(infraInr);
  });

  it("keeps scale scenario volumes and revenue consistent", () => {
    for (const scenario of SCALE_SCENARIOS) {
      expect(scenarioGovernedActions(scenario)).toBe(scenario.totalActions);
      const m = scenarioMetrics(scenario);
      expect(m.revenueInr).toBe(governedActionsRevenueInr(scenario.totalActions));
      expect(m.grossContributionInr).toBe(m.revenueInr - m.infraInr);
      if (m.revenueInr > 0) {
        expect(m.grossMarginPct).toBeCloseTo((m.grossContributionInr / m.revenueInr) * 100, 5);
      }
    }
  });
});
