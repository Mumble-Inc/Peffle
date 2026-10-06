import { describe, expect, it } from "vitest";
import {
  parseIndianInrPhrase,
  planAdminGuardrailsIntents,
} from "@/lib/agent/admin-guardrails-planner";

describe("admin guardrails planner", () => {
  it("detects summarize intent", () => {
    const intents = planAdminGuardrailsIntents("Show current guardrails");
    expect(intents).toEqual([{ kind: "summarize" }]);
  });

  it("parses discount ceiling update", () => {
    const intents = planAdminGuardrailsIntents("Set discount ceiling to 10%");
    expect(intents).toContainEqual({
      kind: "update_merchant_policy",
      patch: { maxDiscountPct: 10 },
    });
  });

  it("parses checkout cap in inr", () => {
    const intents = planAdminGuardrailsIntents("Set checkout daily cap to ₹15000");
    expect(intents).toContainEqual({ kind: "set_checkout_cap_inr", inr: 15000 });
  });

  it("parses lakh for daily spend limit", () => {
    expect(parseIndianInrPhrase("1 lakh")).toBe(100_000);
    const intents = planAdminGuardrailsIntents("set daily spend limit to 1 lakh");
    expect(intents).toContainEqual({ kind: "set_checkout_cap_inr", inr: 100_000 });
  });

  it("requires confirmation before disable agent", () => {
    const intents = planAdminGuardrailsIntents("Disable agent");
    expect(intents).toContainEqual({ kind: "disable_agent", confirmed: false });
    const confirmed = planAdminGuardrailsIntents("Confirm disable agent");
    expect(confirmed).toContainEqual({ kind: "disable_agent", confirmed: true });
  });
});
