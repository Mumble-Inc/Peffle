import { afterEach, describe, expect, it } from "vitest";
import { assertPeffleGuardEnv, peffleGuardEnabled } from "@/lib/peffle/runtime";

const env = process.env as { NODE_ENV?: string };

describe("PEFFLE_GUARD=0", () => {
  const previousNode = process.env.NODE_ENV;
  const previousGuard = process.env.PEFFLE_GUARD;

  afterEach(() => {
    env.NODE_ENV = previousNode;
    if (previousGuard === undefined) delete process.env.PEFFLE_GUARD;
    else process.env.PEFFLE_GUARD = previousGuard;
  });

  it("throws at assert when PEFFLE_GUARD=0 and NODE_ENV is not test", () => {
    process.env.PEFFLE_GUARD = "0";
    env.NODE_ENV = "production";
    expect(() => assertPeffleGuardEnv()).toThrow(/only allowed when NODE_ENV=test/);
  });

  it("skips guard() only when NODE_ENV=test", () => {
    process.env.PEFFLE_GUARD = "0";
    env.NODE_ENV = "test";
    expect(peffleGuardEnabled()).toBe(false);
  });

  it("keeps guard on when the flag is not 0", () => {
    delete process.env.PEFFLE_GUARD;
    env.NODE_ENV = "production";
    expect(peffleGuardEnabled()).toBe(true);
  });
});
