import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/errors";
import { requireStaffSession } from "@/lib/auth/request";
import { normalizeChatHistory } from "@/lib/agent/chat-history";
import { runAdminGuardrailsChat } from "@/lib/agent/admin-guardrails-chat";
import { AdminPolicyError } from "@/lib/services/admin-policies";

export async function POST(request: Request) {
  try {
    const { merchantId } = await requireStaffSession(request);
    const body = (await request.json()) as { message?: string; history?: unknown };
    const message = body.message?.trim() ?? "";
    if (!message || message.length > 2000) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const history = normalizeChatHistory(body.history);
    const result = await runAdminGuardrailsChat(merchantId, message, history);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AdminPolicyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const msg = error instanceof Error ? error.message : "Failed to run guardrails chat";
    console.error("POST /api/admin/guardrails/chat failed:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
