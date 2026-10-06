import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/errors";
import { requireBuyerSession } from "@/lib/auth/request";
import { normalizeChatHistory } from "@/lib/agent/chat-history";
import { runAgentChat } from "@/lib/agent/agent-chat";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      message?: string;
      history?: unknown;
    };
    const sessionId = body.sessionId?.trim();
    const message = body.message?.trim() ?? "";
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }
    if (!message || message.length > 2000) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    await requireBuyerSession(request, sessionId);
    const history = normalizeChatHistory(body.history);
    const result = await runAgentChat(sessionId, message, history);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to run agent chat";
    const status = message === "Session not found" ? 404 : 500;
    console.error("POST /api/agent/chat failed:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
