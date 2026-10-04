import type { ActionEvent } from "peffle";
import { listPendingApprovals } from "@/lib/peffle/approvals";
import {
  getCheckoutCapPaise,
  getDiscountCapPaise,
  getLoadedExecutionPolicy,
  getPeffle,
  isAllAgentsKilled,
  listKnownAgentIds,
  PEFFLE_CHECKOUT_ACTION,
  PEFFLE_CHECKOUT_AGENT_ID,
  PEFFLE_DISCOUNT_ACTION,
  queryPeffleCheckoutEvents,
  setAllAgentsKilled,
} from "@/lib/peffle/client";
import type { PeffleControlEvent, PeffleControlState, PeffleEventResult } from "@/lib/peffle/types";

function utcDayStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function eventResult(status: ActionEvent["status"]): PeffleEventResult {
  switch (status) {
    case "completed":
      return "ALLOWED";
    case "denied":
    case "approval_denied":
      return "BLOCKED";
    case "failed":
      return "FAILED";
    case "pending":
    case "approved":
      return "PENDING";
    default:
      return "IN_PROGRESS";
  }
}

function eventReason(event: ActionEvent): string | null {
  if (event.status === "completed") return null;
  if (event.ruleId === "kill-switch") return "Agent disabled";
  if (event.ruleId === "checkout-daily-cap" || event.ruleId === "discount-daily-cap") return "Spend limit exceeded";
  if (event.ruleId === "default") return "No matching allow rule";
  if (event.ruleId) return event.ruleId;
  if (event.status === "failed") return "Handler failed after authorization";
  return null;
}

function toControlEvent(event: ActionEvent): PeffleControlEvent {
  return {
    id: event.id,
    createdAt: event.createdAt,
    agentId: event.agent.agentId,
    action: event.action,
    amountPaise: typeof event.amount === "number" ? event.amount : null,
    result: eventResult(event.status),
    reason: eventReason(event),
  };
}

function dailySpentPaise(events: ActionEvent[]): number {
  const start = utcDayStartIso();
  return events.reduce((sum, event) => {
    if (event.status !== "completed" && event.status !== "in_progress") return sum;
    if (event.createdAt < start) return sum;
    if (typeof event.amount !== "number") return sum;
    return sum + event.amount;
  }, 0);
}

export function getPeffleControlState(): PeffleControlState {
  const peffle = getPeffle();
  const policy = getLoadedExecutionPolicy();
  const advisory = peffle.checkPolicy({
    agent: { agentId: PEFFLE_CHECKOUT_AGENT_ID },
    action: PEFFLE_CHECKOUT_ACTION,
    amount: 0,
  });
  const killed = advisory.outcome === "deny" && "reason" in advisory && advisory.reason === "agent_killed";

  const ledger = getPeffle().query({ limit: 100 });
  const events = ledger.length ? ledger : queryPeffleCheckoutEvents();
  const checkoutEvents = events.filter((event) => event.action === PEFFLE_CHECKOUT_ACTION);
  const discountEvents = events.filter((event) => event.action === PEFFLE_DISCOUNT_ACTION);
  const limitPaise = getCheckoutCapPaise();
  const spentPaise = dailySpentPaise(checkoutEvents);
  const remainingPaise = Math.max(0, limitPaise - spentPaise);
  const discountLimit = getDiscountCapPaise();
  const discountSpent = dailySpentPaise(discountEvents);
  const last = events[0] ?? null;

  const pendingApprovals = listPendingApprovals().map((row) => ({
    eventId: row.eventId,
    tool: row.tool,
    sessionId: row.sessionId,
    amountPaise: typeof row.request.amount === "number" ? row.request.amount : null,
    action: row.request.action,
  }));

  const agentIds = new Set<string>([PEFFLE_CHECKOUT_AGENT_ID, ...events.map((event) => event.agent.agentId)]);
  const agents = [...agentIds].map((agentId) => {
    const decision = peffle.checkPolicy({ agent: { agentId }, action: PEFFLE_CHECKOUT_ACTION, amount: 0 });
    const agentKilled = decision.outcome === "deny" && "reason" in decision && decision.reason === "agent_killed";
    return { agentId, killed: agentKilled };
  });

  return {
    agentId: PEFFLE_CHECKOUT_AGENT_ID,
    killed,
    protection: killed ? "disabled" : "protected",
    executionGuard: killed ? "disabled" : "active",
    lastActivityAt: last?.createdAt ?? null,
    spend: {
      spentPaise,
      limitPaise,
      remainingPaise,
      window: "daily",
      currency: "INR",
    },
    merchantPolicy: {
      layer: "merchant",
      status: "active",
      controls: ["catalog", "pricing", "discounts", "margin rules", "commercial validity"],
    },
    executionPolicy: {
      layer: "peffle",
      status: "active",
      controls: ["whether the agent may execute", "spend limits", "kill switch", "execution constraints"],
      onNoMatchingRule: policy.defaults.onNoMatchingRule,
    },
    events: events.map(toControlEvent),
    discountSpend: {
      spentPaise: discountSpent,
      limitPaise: discountLimit,
      remainingPaise: Math.max(0, discountLimit - discountSpent),
      window: "daily",
      currency: "INR",
    },
    pendingApprovals,
    agents,
    allAgentsKilled: isAllAgentsKilled() || agents.every((agent) => agent.killed),
  };
}

export function killAgent(agentId: string, reason?: string): PeffleControlState {
  const id = agentId.trim() || PEFFLE_CHECKOUT_AGENT_ID;
  getPeffle().kill(id, reason ? { reason } : undefined);
  return getPeffleControlState();
}

export function reviveAgent(agentId: string): PeffleControlState {
  const id = agentId.trim() || PEFFLE_CHECKOUT_AGENT_ID;
  getPeffle().revive(id);
  return getPeffleControlState();
}

export function killAllAgents(reason?: string): PeffleControlState {
  setAllAgentsKilled(true);
  const peffle = getPeffle();
  for (const agentId of listKnownAgentIds()) {
    peffle.kill(agentId, reason ? { reason } : { reason: "kill-all" });
  }
  return getPeffleControlState();
}

export function reviveAllAgents(): PeffleControlState {
  setAllAgentsKilled(false);
  const peffle = getPeffle();
  for (const agentId of listKnownAgentIds()) {
    peffle.revive(agentId);
  }
  return getPeffleControlState();
}

export function killCheckoutAgent(reason?: string): PeffleControlState {
  return killAgent(PEFFLE_CHECKOUT_AGENT_ID, reason);
}

export function reviveCheckoutAgent(): PeffleControlState {
  return reviveAgent(PEFFLE_CHECKOUT_AGENT_ID);
}
