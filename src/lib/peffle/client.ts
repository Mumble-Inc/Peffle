import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  AgentKilledError,
  ApprovalRequiredError,
  BudgetExceededError,
  createPeffle,
  loadPolicyFromJson,
  PeffleError,
  PolicyDeniedError,
  type ActionEvent,
  type ActionRequest,
  type GuardOptions,
  type Peffle,
  type PeffleConfig,
  type PolicyConfig,
} from "peffle";
import { CheckoutError } from "@/lib/services/checkout-errors";
import type { PeffleCheckoutBlock } from "@/lib/peffle/types";
import { peffleGuardEnabled } from "@/lib/peffle/runtime";

export { mapPeffleError } from "@/lib/peffle/errors";

export const PEFFLE_CHECKOUT_AGENT_ID = "razorflow-desk";
export const PEFFLE_CHECKOUT_ACTION = "checkout.create";
export const CHECKOUT_CAP_BUDGET_ID = "checkout-daily-cap";
export const DISCOUNT_CAP_BUDGET_ID = "discount-daily-cap";
export const PEFFLE_SEARCH_ACTION = "search_products";
export const PEFFLE_DISCOUNT_ACTION = "apply_discount";
export const PEFFLE_REFUND_ACTION = "issue_refund";

const DEFAULT_STORAGE = ".peffle/ledger.db";
const DEFAULT_POLICY = "peffle.policy.json";

export type CheckoutGuardInput = {
  sessionId: string;
  merchantId: string;
  principal: string;
  amountPaise: number;
  source: "cart" | "decision";
};

type PeffleGlobals = {
  instance: Peffle | null;
  loadedPolicy: PolicyConfig | null;
  runtimeCheckoutCapPaise: number | null;
  runtimeDiscountCapPaise: number | null;
  loggedMode: boolean;
  allAgentsKilled: boolean;
};

const peffleGlobal = globalThis as typeof globalThis & { __razorflowPeffle?: PeffleGlobals };

function peffleState(): PeffleGlobals {
  if (!peffleGlobal.__razorflowPeffle) {
    peffleGlobal.__razorflowPeffle = {
      instance: null,
      loadedPolicy: null,
      runtimeCheckoutCapPaise: null,
      runtimeDiscountCapPaise: null,
      loggedMode: false,
      allAgentsKilled: false,
    };
  }
  return peffleGlobal.__razorflowPeffle;
}

function resolveStoragePath(value: string | undefined, fallback: string) {
  const raw = value && value.trim() ? value.trim() : fallback;
  if (raw === ":memory:") return raw;
  return resolve(raw);
}

function parseEnvCheckoutCapPaise(): number | null {
  const raw = process.env.PEFFLE_CHECKOUT_CAP_PAISE?.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new CheckoutError("Peffle checkout cap is invalid", 500, "PEFFLE_CONFIG_INVALID");
  }
  return parsed;
}

function overlayBudget(policy: PolicyConfig, id: string, action: string, cap: number): PolicyConfig {
  const budgets = policy.budgets.map((budget) => (budget.id === id ? { ...budget, limit: cap } : budget));
  const hasBudget = budgets.some((budget) => budget.id === id);
  return {
    ...policy,
    budgets: hasBudget
      ? budgets
      : [...budgets, { id, scope: "global", window: "daily", limit: cap, match: { action } }],
  };
}

function parseEnvDiscountCapPaise(): number | null {
  const raw = process.env.PEFFLE_DISCOUNT_CAP_PAISE?.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new CheckoutError("Peffle discount cap is invalid", 500, "PEFFLE_CONFIG_INVALID");
  }
  return parsed;
}

function loadExecutionPolicy(): PolicyConfig {
  const state = peffleState();
  const policyPath = resolveStoragePath(process.env.PEFFLE_POLICY, DEFAULT_POLICY);
  let policy = loadPolicyFromJson(readFileSync(policyPath, "utf8"));
  const checkoutCap = state.runtimeCheckoutCapPaise ?? parseEnvCheckoutCapPaise();
  if (checkoutCap != null) {
    policy = overlayBudget(policy, CHECKOUT_CAP_BUDGET_ID, PEFFLE_CHECKOUT_ACTION, checkoutCap);
  }
  const discountCap = state.runtimeDiscountCapPaise ?? parseEnvDiscountCapPaise();
  if (discountCap != null) {
    policy = overlayBudget(policy, DISCOUNT_CAP_BUDGET_ID, PEFFLE_DISCOUNT_ACTION, discountCap);
  }
  return policy;
}

function logPeffleModeOnce() {
  const state = peffleState();
  if (state.loggedMode) return;
  state.loggedMode = true;
  console.info("Peffle mode: local/process-scoped");
}

function createConfiguredPeffle(config?: PeffleConfig): Peffle {
  const state = peffleState();
  logPeffleModeOnce();
  if (config) {
    state.loadedPolicy = config.policy ?? state.loadedPolicy;
    return createPeffle(config);
  }

  const storagePath = resolveStoragePath(process.env.PEFFLE_STORAGE, DEFAULT_STORAGE);
  if (storagePath !== ":memory:") {
    mkdirSync(dirname(storagePath), { recursive: true, mode: 0o700 });
  }

  const policy = loadExecutionPolicy();
  state.loadedPolicy = policy;
  return createPeffle({
    storagePath,
    policy,
  });
}

export function getPeffle(): Peffle {
  const state = peffleState();
  if (!state.instance) {
    state.instance = createConfiguredPeffle();
  }
  return state.instance;
}

export function getLoadedExecutionPolicy(): PolicyConfig {
  getPeffle();
  const policy = peffleState().loadedPolicy;
  if (!policy) {
    throw new CheckoutError("Peffle execution policy is unavailable", 503, "PEFFLE_UNAVAILABLE");
  }
  return policy;
}

function budgetLimit(id: string): number {
  const policy = getLoadedExecutionPolicy();
  const budget = policy.budgets.find((item) => item.id === id);
  if (budget) return budget.limit;
  return policy.budgets[0]?.limit ?? 0;
}

export function getCheckoutCapPaise(): number {
  return budgetLimit(CHECKOUT_CAP_BUDGET_ID);
}

export function getDiscountCapPaise(): number {
  return budgetLimit(DISCOUNT_CAP_BUDGET_ID);
}

export function reloadPeffleFromConfig(): void {
  const state = peffleState();
  state.instance?.close();
  state.instance = createConfiguredPeffle();
}

export function setRuntimeCheckoutCapPaise(capPaise: number): void {
  if (!Number.isInteger(capPaise) || capPaise < 0 || capPaise > 1_000_000_000_000) {
    throw new CheckoutError("Checkout cap must be a whole number of paise", 400, "PEFFLE_CAP_INVALID");
  }
  peffleState().runtimeCheckoutCapPaise = capPaise;
  reloadPeffleFromConfig();
}

export function setRuntimeDiscountCapPaise(capPaise: number): void {
  if (!Number.isInteger(capPaise) || capPaise < 0 || capPaise > 1_000_000_000_000) {
    throw new CheckoutError("Discount cap must be a whole number of paise", 400, "PEFFLE_CAP_INVALID");
  }
  peffleState().runtimeDiscountCapPaise = capPaise;
  reloadPeffleFromConfig();
}

/** Test-only: replace the process-wide singleton. */
export function resetPeffleForTests(config?: PeffleConfig): void {
  const state = peffleState();
  if (!config) {
    state.runtimeCheckoutCapPaise = null;
    state.runtimeDiscountCapPaise = null;
    state.allAgentsKilled = false;
  }
  state.instance?.close();
  state.instance = createConfiguredPeffle(config);
}

export function setAllAgentsKilled(killed: boolean): void {
  peffleState().allAgentsKilled = killed;
}

export function isAllAgentsKilled(): boolean {
  return peffleState().allAgentsKilled;
}

export function listKnownAgentIds(): string[] {
  const ids = new Set<string>([PEFFLE_CHECKOUT_AGENT_ID]);
  for (const event of getPeffle().query({ limit: 500 })) {
    ids.add(event.agent.agentId);
  }
  return [...ids];
}

export async function guardAction<T>(
  request: ActionRequest,
  fn: () => Promise<T> | T,
  opts?: GuardOptions,
): Promise<T> {
  if (!peffleGuardEnabled()) return fn();
  if (peffleState().allAgentsKilled) {
    getPeffle().kill(request.agent.agentId, { reason: "kill-all" });
  }
  return getPeffle().guard(request, fn, opts);
}

function peffleBlock(
  code: PeffleCheckoutBlock["code"],
  input: CheckoutGuardInput | undefined,
  extras?: { limitPaise?: number; spentPaise?: number },
): PeffleCheckoutBlock {
  return {
    blocked: true,
    code,
    agentId: PEFFLE_CHECKOUT_AGENT_ID,
    action: PEFFLE_CHECKOUT_ACTION,
    amountPaise: input?.amountPaise ?? 0,
    limitPaise: extras?.limitPaise ?? getCheckoutCapPaise(),
    spentPaise: extras?.spentPaise ?? null,
  };
}

export function mapPeffleCheckoutError(error: unknown, input?: CheckoutGuardInput): CheckoutError {
  if (error instanceof CheckoutError) return error;

  if (error instanceof BudgetExceededError) {
    return new CheckoutError(
      "Checkout exceeded the execution spend cap",
      403,
      "PEFFLE_BUDGET_EXCEEDED",
      peffleBlock("PEFFLE_BUDGET_EXCEEDED", input, {
        limitPaise: error.limit,
        spentPaise: error.spent,
      }),
    );
  }
  if (error instanceof AgentKilledError) {
    return new CheckoutError(
      "Checkout is blocked by the execution kill switch",
      403,
      "PEFFLE_AGENT_KILLED",
      peffleBlock("PEFFLE_AGENT_KILLED", input),
    );
  }
  if (error instanceof PolicyDeniedError) {
    return new CheckoutError(
      "Checkout is not allowed by the execution policy",
      403,
      "PEFFLE_POLICY_DENIED",
      peffleBlock("PEFFLE_POLICY_DENIED", input),
    );
  }
  if (error instanceof ApprovalRequiredError) {
    return new CheckoutError(
      "Checkout requires operator approval",
      403,
      "PEFFLE_APPROVAL_REQUIRED",
      peffleBlock("PEFFLE_APPROVAL_REQUIRED", input),
    );
  }

  return new CheckoutError(
    "Checkout could not be authorized",
    503,
    "PEFFLE_UNAVAILABLE",
    peffleBlock("PEFFLE_UNAVAILABLE", input),
  );
}

export async function guardCheckoutCreate<T>(
  input: CheckoutGuardInput,
  fn: () => Promise<T> | T,
): Promise<T> {
  try {
    if (peffleState().allAgentsKilled) {
      getPeffle().kill(PEFFLE_CHECKOUT_AGENT_ID, { reason: "kill-all" });
    }
    return await getPeffle().guard(
      {
        agent: {
          agentId: PEFFLE_CHECKOUT_AGENT_ID,
          principal: input.principal,
        },
        action: PEFFLE_CHECKOUT_ACTION,
        resource: `session:${input.sessionId}`,
        amount: input.amountPaise,
        metadata: {
          merchantId: input.merchantId,
          sessionId: input.sessionId,
          source: input.source,
        },
      },
      fn,
    );
  } catch (error) {
    if (error instanceof CheckoutError) throw error;
    if (error instanceof PeffleError) throw mapPeffleCheckoutError(error, input);
    throw error;
  }
}

export function queryPeffleCheckoutEvents(sessionId?: string): ActionEvent[] {
  const events = getPeffle().query({
    agentId: PEFFLE_CHECKOUT_AGENT_ID,
    action: PEFFLE_CHECKOUT_ACTION,
    limit: 100,
  });
  if (!sessionId) return events;
  return events.filter((event) => event.resource === `session:${sessionId}` || event.metadata?.sessionId === sessionId);
}
