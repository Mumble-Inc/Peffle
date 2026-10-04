import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/errors";
import { requireStaffSession } from "@/lib/auth/request";
import { killAgent, killAllAgents, reviveAgent, reviveAllAgents } from "@/lib/peffle/control";

export async function POST(request: Request) {
  try {
    await requireStaffSession(request);
    const body = (await request.json()) as { action?: string; agentId?: string };
    const action = body.action?.trim();
    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : undefined;

    if (action !== "kill" && action !== "revive" && action !== "kill-all" && action !== "revive-all") {
      return NextResponse.json({ error: "action must be kill, revive, kill-all, or revive-all" }, { status: 400 });
    }

    const state =
      action === "kill-all"
        ? killAllAgents("merchant kill all")
        : action === "revive-all"
          ? reviveAllAgents()
          : action === "kill"
            ? killAgent(agentId ?? "", "merchant kill switch")
            : reviveAgent(agentId ?? "");
    return NextResponse.json(state);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("POST /api/admin/peffle/kill failed:", error);
    return NextResponse.json({ error: "Could not update agent protection" }, { status: 500 });
  }
}
