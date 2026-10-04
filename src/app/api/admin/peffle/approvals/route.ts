import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/errors";
import { requireStaffSession } from "@/lib/auth/request";
import { getPeffleControlState } from "@/lib/peffle/control";
import { resolvePeffleApproval } from "@/lib/peffle/resolve-approval";

export async function GET(request: Request) {
  try {
    await requireStaffSession(request);
    const state = getPeffleControlState();
    return NextResponse.json({ pending: state.pendingApprovals });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not load approvals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireStaffSession(request);
    const body = (await request.json()) as { eventId?: string; decision?: string };
    const eventId = body.eventId?.trim();
    const decision = body.decision?.trim();
    if (!eventId || (decision !== "approve" && decision !== "deny")) {
      return NextResponse.json({ error: "eventId and decision (approve|deny) are required" }, { status: 400 });
    }
    const resolved = await resolvePeffleApproval(eventId, decision);
    return NextResponse.json({ ...resolved, state: getPeffleControlState() });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("POST /api/admin/peffle/approvals failed:", error);
    return NextResponse.json({ error: "Could not resolve approval" }, { status: 500 });
  }
}
