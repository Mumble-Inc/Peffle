import { getApprovalRedemption, type ActionRequest, type ApprovalRequiredError } from "peffle";

export type PendingToolRetry = {
  eventId: string;
  token: string;
  request: ActionRequest;
  tool: "apply_discount" | "issue_refund" | "search_products";
  args: Record<string, unknown>;
  sessionId: string;
  merchantId: string;
};

const pending = new Map<string, PendingToolRetry>();

export function rememberApproval(
  error: ApprovalRequiredError,
  input: Omit<PendingToolRetry, "eventId" | "token">,
) {
  const redemption = getApprovalRedemption(error);
  pending.set(redemption.eventId, {
    ...input,
    eventId: redemption.eventId,
    token: redemption.token,
  });
}

export function getPendingApproval(eventId: string): PendingToolRetry | null {
  return pending.get(eventId) ?? null;
}

export function takePendingApproval(eventId: string): PendingToolRetry | null {
  const row = pending.get(eventId) ?? null;
  if (row) pending.delete(eventId);
  return row;
}

export function listPendingApprovals(): Array<Omit<PendingToolRetry, "token">> {
  return [...pending.values()].map((row) => ({
    eventId: row.eventId,
    request: row.request,
    tool: row.tool,
    args: row.args,
    sessionId: row.sessionId,
    merchantId: row.merchantId,
  }));
}

export function clearPendingApprovalsForTests() {
  pending.clear();
}
