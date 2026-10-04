"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui/design-system";

type ChatPayload = {
  reply: string;
  planner: "gemini" | "deterministic";
  tools: Array<{ ok: boolean; tool: string; reasonCode: string; message: string }>;
};

export function AgentChatPanel({
  sessionId,
  onTurn,
}: {
  sessionId: string | null;
  onTurn?: (turn: { planner: "gemini" | "deterministic" }) => void;
}) {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!sessionId || !message.trim()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: message.trim() }),
      });
      const payload = (await response.json()) as ChatPayload & { error?: string };
      setReply(payload.reply ?? payload.error ?? "No reply");
      if (payload.planner === "gemini" || payload.planner === "deterministic") {
        onTurn?.({ planner: payload.planner });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 border-t border-line/60 pt-4" data-testid="agent-chat">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Ask the agent</p>
      <div className="mt-2 flex gap-2">
        <Input
          data-testid="agent-chat-input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="e.g. give me ₹200 off"
        />
        <Button
          type="button"
          variant="secondary"
          data-testid="agent-chat-send"
          disabled={busy || !sessionId}
          onClick={() => void send()}
        >
          Send
        </Button>
      </div>
      {reply ? (
        <p className="mt-2 text-sm text-ink-soft" data-testid="agent-chat-reply">
          {reply}
        </p>
      ) : null}
    </div>
  );
}
