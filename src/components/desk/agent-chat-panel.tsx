"use client";

import { useState } from "react";
import { PaperPlaneRight } from "@phosphor-icons/react";

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
      setMessage("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="agent-chat">
      <div className="rf-peffle-chat-composer">
        <input
          data-testid="agent-chat-input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask Peffle anything..."
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="button"
          data-testid="agent-chat-send"
          disabled={busy || !sessionId}
          onClick={() => void send()}
          className="rf-peffle-icon-btn"
          aria-label="Send"
        >
          <PaperPlaneRight className="size-4" />
        </button>
      </div>
      {reply ? (
        <p className="mt-2 text-[0.8125rem] text-ink-soft" data-testid="agent-chat-reply">
          {reply}
        </p>
      ) : null}
    </div>
  );
}
