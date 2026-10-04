import { executeAgentTool } from "@/lib/services/agent-tools";
import { getPendingApproval, takePendingApproval } from "@/lib/peffle/approvals";
import { getPeffle } from "@/lib/peffle/client";
import { recordAuditEvent } from "@/lib/audit";

export async function resolvePeffleApproval(eventId: string, decision: "approve" | "deny") {
  const pending = getPendingApproval(eventId);
  if (decision === "deny") {
    getPeffle().deny(eventId);
    takePendingApproval(eventId);
    if (pending) {
      await recordAuditEvent(pending.sessionId, "AGENT_TOOL_DENIED", "staff", {
        peffleEventId: eventId,
        tool: pending.tool,
        reasonCode: "APPROVAL_DENIED",
      });
    }
    return { ok: true, decision: "deny" as const, result: null };
  }

  getPeffle().approve(eventId);
  const retry = takePendingApproval(eventId);
  if (!retry) {
    return { ok: true, decision: "approve" as const, result: null };
  }

  const result = await executeAgentTool(retry.tool, retry.args, {
    sessionId: retry.sessionId,
    merchantId: retry.merchantId,
    approval: { eventId: retry.eventId, token: retry.token },
  });

  await recordAuditEvent(retry.sessionId, "AGENT_TOOL_APPROVED", "staff", {
    peffleEventId: eventId,
    tool: retry.tool,
    reasonCode: result.reasonCode,
    ok: result.ok,
  });

  return { ok: result.ok, decision: "approve" as const, result };
}
