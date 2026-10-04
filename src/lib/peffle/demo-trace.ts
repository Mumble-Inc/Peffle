import type { AuditEventType } from "@prisma/client";
import { db } from "@/lib/db";
import { getPeffle } from "@/lib/peffle/client";
import { getPeffleControlState } from "@/lib/peffle/control";
import { sessionAgentId } from "@/lib/peffle/runtime";
import type { PeffleControlState } from "@/lib/peffle/types";

export function isDemoModeEnabled() {
  return process.env.DEMO_MODE === "1";
}

const PEFFLE_AUDIT_TYPES: AuditEventType[] = [
  "AGENT_TOOL_ALLOWED",
  "AGENT_TOOL_BLOCKED",
  "AGENT_TOOL_APPROVAL_REQUIRED",
  "AGENT_TOOL_APPROVED",
  "AGENT_TOOL_DENIED",
];

const COMMERCE_REASON_CODES = new Set([
  "DISCOUNT_CEILING",
  "MARGIN_FLOOR",
  "OUT_OF_STOCK",
  "ORDER_NOT_CAPTURED",
]);

const COMMERCE_THEN_PEFFLE = new Set(["apply_discount", "issue_refund", "checkout.create"]);

export type DemoTraceDecision = "ALLOW" | "BLOCK" | "APPROVE" | "KILL" | "FAIL" | "IDLE";

export type DemoMerchantStage = { label: "Merchant policy"; outcome: "PASS" | "COMMERCE BLOCK" };
export type DemoPeffleStage = {
  label: "Peffle guard";
  outcome: "ALLOW" | "REQUIRED" | "EXCEEDED" | "KILLED" | "DENIED" | "FAILED";
};

export type DemoTraceRow = {
  id: string;
  action: string;
  decision: DemoTraceDecision;
  headline: string;
  reasonCode: string;
  amountPaise: number | null;
  eventId: string | null;
  timestamp: string;
  agentId: string | null;
  merchant: DemoMerchantStage | null;
  peffle: DemoPeffleStage | null;
  execution: string;
};

export type DemoTracePayload = {
  sessionId: string | null;
  latest: DemoTraceRow | null;
  history: DemoTraceRow[];
  allAgentsKilled: boolean;
  discountSpend: PeffleControlState["discountSpend"];
  checkoutSpend: PeffleControlState["spend"];
};

export type DemoAuditInput = {
  id: string;
  type: string;
  createdAt: string;
  data: Record<string, unknown>;
};

export type DemoLedgerInput = {
  id: string;
  action: string;
  agentId: string;
  amount?: number;
  status: string;
  ruleId?: string;
  createdAt: string;
  sessionId?: string;
};

function str(value: unknown): string | null {
  return typeof value === "string" && value.length ? value : null;
}

function intPaise(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function ledgerReason(event: DemoLedgerInput): string {
  if (event.status === "completed") return "ALLOWED";
  if (event.ruleId === "kill-switch") return "AGENT_KILLED";
  if (event.ruleId === "checkout-daily-cap" || event.ruleId === "discount-daily-cap") return "BUDGET_EXCEEDED";
  if (event.status === "pending" || event.status === "approved") return "APPROVAL_REQUIRED";
  if (event.status === "failed") return "PEFFLE_UNAVAILABLE";
  if (event.status === "approval_denied") return "APPROVAL_DENIED";
  if (event.ruleId === "default") return "POLICY_DENIED";
  return event.ruleId ?? event.status.toUpperCase();
}

function executionFor(action: string, decision: DemoTraceDecision, reasonCode: string): string {
  if (decision === "APPROVE") return "Awaiting merchant approval";
  if (decision === "ALLOW") return "Executed";
  if (decision === "FAIL") return "Handler failed after authorization";
  if (reasonCode === "AGENT_KILLED" && action === "checkout.create") return "No payment order created.";
  if (reasonCode === "BUDGET_EXCEEDED" && action === "apply_discount") return "No discount write";
  if (COMMERCE_REASON_CODES.has(reasonCode)) return "Not executed";
  return "Not executed";
}

function fromAudit(audit: DemoAuditInput, ledgerById: Map<string, DemoLedgerInput>): DemoTraceRow {
  const eventId = str(audit.data.peffleEventId);
  const ledger = eventId ? ledgerById.get(eventId) : undefined;
  const action = str(audit.data.tool) ?? ledger?.action ?? "unknown";
  const reasonCode = str(audit.data.reasonCode) ?? (ledger ? ledgerReason(ledger) : "UNKNOWN");
  const amountPaise = intPaise(audit.data.amountPaise) ?? (typeof ledger?.amount === "number" ? ledger.amount : null);
  const commerceBlock = audit.type === "AGENT_TOOL_BLOCKED" && COMMERCE_REASON_CODES.has(reasonCode) && !eventId;

  let decision: DemoTraceDecision = "BLOCK";
  let headline = "ACTION BLOCKED";
  let merchant: DemoMerchantStage | null = null;
  let peffle: DemoPeffleStage | null = null;

  if (commerceBlock) {
    merchant = { label: "Merchant policy", outcome: "COMMERCE BLOCK" };
    decision = "BLOCK";
    headline = "COMMERCE BLOCK";
  } else if (audit.type === "AGENT_TOOL_APPROVAL_REQUIRED" || reasonCode === "APPROVAL_REQUIRED") {
    if (COMMERCE_THEN_PEFFLE.has(action)) merchant = { label: "Merchant policy", outcome: "PASS" };
    peffle = { label: "Peffle guard", outcome: "REQUIRED" };
    decision = "APPROVE";
    headline = "ACTION PAUSED";
  } else if (audit.type === "AGENT_TOOL_ALLOWED" || (audit.type === "AGENT_TOOL_APPROVED" && audit.data.ok === true)) {
    if (COMMERCE_THEN_PEFFLE.has(action) || eventId) {
      if (COMMERCE_THEN_PEFFLE.has(action)) merchant = { label: "Merchant policy", outcome: "PASS" };
    }
    if (eventId) peffle = { label: "Peffle guard", outcome: "ALLOW" };
    decision = "ALLOW";
    headline = "ACTION ALLOWED";
  } else if (reasonCode === "AGENT_KILLED") {
    if (COMMERCE_THEN_PEFFLE.has(action) && eventId) merchant = { label: "Merchant policy", outcome: "PASS" };
    peffle = { label: "Peffle guard", outcome: "KILLED" };
    decision = "KILL";
    headline = "ACTION BLOCKED";
  } else if (reasonCode === "BUDGET_EXCEEDED") {
    if (COMMERCE_THEN_PEFFLE.has(action)) merchant = { label: "Merchant policy", outcome: "PASS" };
    peffle = { label: "Peffle guard", outcome: "EXCEEDED" };
    decision = "BLOCK";
    headline = "ACTION BLOCKED";
  } else if (audit.type === "AGENT_TOOL_DENIED") {
    if (COMMERCE_THEN_PEFFLE.has(action) && eventId) merchant = { label: "Merchant policy", outcome: "PASS" };
    peffle = { label: "Peffle guard", outcome: "DENIED" };
    decision = "BLOCK";
    headline = "ACTION BLOCKED";
  } else if (eventId) {
    if (COMMERCE_THEN_PEFFLE.has(action)) merchant = { label: "Merchant policy", outcome: "PASS" };
    peffle = { label: "Peffle guard", outcome: "DENIED" };
    decision = "BLOCK";
    headline = "ACTION BLOCKED";
  }

  return {
    id: audit.id,
    action,
    decision,
    headline,
    reasonCode,
    amountPaise,
    eventId,
    timestamp: audit.createdAt,
    agentId: ledger?.agentId ?? null,
    merchant,
    peffle,
    execution: executionFor(action, decision, reasonCode),
  };
}

function fromLedger(event: DemoLedgerInput): DemoTraceRow {
  const reasonCode = ledgerReason(event);
  const commerceFirst = COMMERCE_THEN_PEFFLE.has(event.action);
  let decision: DemoTraceDecision = "BLOCK";
  let headline = "ACTION BLOCKED";
  let peffle: DemoPeffleStage | null = { label: "Peffle guard", outcome: "DENIED" };

  if (event.status === "completed") {
    decision = "ALLOW";
    headline = "ACTION ALLOWED";
    peffle = { label: "Peffle guard", outcome: "ALLOW" };
  } else if (event.status === "pending" || event.status === "approved") {
    decision = "APPROVE";
    headline = "ACTION PAUSED";
    peffle = { label: "Peffle guard", outcome: "REQUIRED" };
  } else if (reasonCode === "AGENT_KILLED") {
    decision = "KILL";
    peffle = { label: "Peffle guard", outcome: "KILLED" };
  } else if (reasonCode === "BUDGET_EXCEEDED") {
    peffle = { label: "Peffle guard", outcome: "EXCEEDED" };
  } else if (event.status === "failed") {
    decision = "FAIL";
    headline = "EXECUTION FAILED";
    peffle = { label: "Peffle guard", outcome: "FAILED" };
  }

  const merchant: DemoMerchantStage | null = commerceFirst && !COMMERCE_REASON_CODES.has(reasonCode)
    ? { label: "Merchant policy", outcome: "PASS" }
    : null;

  return {
    id: event.id,
    action: event.action,
    decision,
    headline,
    reasonCode,
    amountPaise: typeof event.amount === "number" ? event.amount : null,
    eventId: event.id,
    timestamp: event.createdAt,
    agentId: event.agentId,
    merchant,
    peffle,
    execution: executionFor(event.action, decision, reasonCode),
  };
}

export function buildDemoTrace(audits: DemoAuditInput[], ledger: DemoLedgerInput[]): DemoTraceRow[] {
  const ledgerById = new Map(ledger.map((event) => [event.id, event]));
  const rows = audits.map((audit) => fromAudit(audit, ledgerById));
  const used = new Set(rows.map((row) => row.eventId).filter(Boolean));
  for (const event of ledger) {
    if (used.has(event.id)) continue;
    rows.push(fromLedger(event));
  }
  return rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));
}

function ledgerSessionId(metadata: Record<string, unknown> | undefined): string | undefined {
  const value = metadata?.sessionId;
  return typeof value === "string" ? value : undefined;
}

export async function loadDemoTrace(sessionId: string | null): Promise<DemoTracePayload> {
  const control = getPeffleControlState();
  const empty: DemoTracePayload = {
    sessionId,
    latest: null,
    history: [],
    allAgentsKilled: control.allAgentsKilled,
    discountSpend: control.discountSpend,
    checkoutSpend: control.spend,
  };
  if (!sessionId) return empty;

  const [audits, rawLedger] = await Promise.all([
    db.auditEvent.findMany({
      where: { sessionId, type: { in: PEFFLE_AUDIT_TYPES } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    Promise.resolve(getPeffle().query({ limit: 100 })),
  ]);

  const deskAgent = sessionAgentId(sessionId);
  const ledger: DemoLedgerInput[] = rawLedger
    .filter((event) => {
      const metaSession = ledgerSessionId(event.metadata);
      return metaSession === sessionId || event.agent.agentId === deskAgent || event.resource === `session:${sessionId}`;
    })
    .map((event) => ({
      id: event.id,
      action: event.action,
      agentId: event.agent.agentId,
      amount: event.amount,
      status: event.status,
      ruleId: event.ruleId,
      createdAt: event.createdAt,
      sessionId: ledgerSessionId(event.metadata),
    }));

  const history = buildDemoTrace(
    audits.map((row) => ({
      id: row.id,
      type: row.type,
      createdAt: row.createdAt.toISOString(),
      data: row.data && typeof row.data === "object" && !Array.isArray(row.data) ? (row.data as Record<string, unknown>) : {},
    })),
    ledger,
  );

  return {
    ...empty,
    latest: history[0] ?? null,
    history: history.slice(0, 8),
  };
}
