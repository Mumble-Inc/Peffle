"use client";

import { useEffect, useRef, useState } from "react";
import { PaperPlaneRight, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { DESK_CHAT_PLACEHOLDER } from "@/lib/agent/desk-guide";

type ChatPlanner = "gemini" | "groq" | "deterministic";

type ChatPayload = {
  reply: string;
  planner: ChatPlanner;
  tools: Array<{ ok: boolean; tool: string; reasonCode: string; message: string }>;
};

type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  planner?: ChatPlanner;
};

const STARTERS = [
  "How does Peffle guard checkout?",
  "What is the top search bar for?",
  "Walk me through cart to payment",
];

function plannerLabel(planner: ChatPlanner | undefined) {
  if (planner === "gemini" || planner === "groq") return "AI";
  return "Guide";
}

export function AgentChatPanel({
  sessionId,
  onTurn,
  onEnsureSession,
  chatLocked = false,
}: {
  sessionId: string | null;
  onTurn?: (turn: { planner: ChatPlanner }) => void;
  onEnsureSession?: (seed?: string) => Promise<string | null>;
  chatLocked?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const inputDisabled = busy || chatLocked;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns, busy]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? message).trim();
    if (!text || inputDisabled) return;

    const userTurn: ChatTurn = { id: `u-${Date.now()}`, role: "user", text };
    const nextTurns = [...turns, userTurn];
    setTurns(nextTurns);
    setMessage("");
    setBusy(true);
    setError(null);
    try {
      let activeSessionId = sessionId;
      if (!activeSessionId && onEnsureSession) {
        activeSessionId = await onEnsureSession(text);
      }
      if (!activeSessionId) {
        setError("Could not start a desk session. Try a catalog search from the top bar first.");
        return;
      }

      const history = nextTurns.slice(0, -1).map((turn) => ({
        role: turn.role,
        content: turn.text,
      }));

      const response = await fetch("/api/agent/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId, message: text, history }),
      });
      const payload = (await response.json()) as ChatPayload & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Chat could not be sent.");
        return;
      }
      const replyText = payload.reply ?? "No reply";
      setTurns((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: replyText,
          planner: payload.planner,
        },
      ]);
      if (payload.planner === "gemini" || payload.planner === "groq" || payload.planner === "deterministic") {
        onTurn?.({ planner: payload.planner });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rf-peffle-guide-chat" data-testid="agent-chat" aria-label="Peffle guide chat">
      <header className="rf-peffle-guide-chat-head">
        <div className="flex items-center gap-2">
          <span className="rf-peffle-guide-chat-avatar" aria-hidden>
            <ShieldCheck className="size-4 text-accent" weight="regular" />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">Peffle guide</p>
            <p className="text-[0.7rem] text-muted">Desk help, not catalog search</p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="rf-peffle-guide-chat-scroll">
        {turns.length === 0 ? (
          <div className="rf-peffle-guide-chat-welcome">
            <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
              Ask how search, cart, policy, guardrails, and Razorpay checkout fit together. Product
              lookup stays in the top bar (<kbd className="rf-peffle-kbd">⌘K</kbd>).
            </p>
            <div className="rf-peffle-guide-chat-starters">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  className="rf-peffle-guide-starter"
                  disabled={inputDisabled}
                  onClick={() => void send(starter)}
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <ul className="rf-peffle-chat-dialog">
          {turns.map((turn) => (
            <li
              key={turn.id}
              className={`rf-peffle-chat-row rf-peffle-chat-row-${turn.role}`}
              data-testid={turn.role === "assistant" ? "agent-chat-reply" : "agent-chat-user"}
            >
              {turn.role === "assistant" ? (
                <span className="rf-peffle-chat-avatar-sm" aria-hidden>
                  <ShieldCheck className="size-3.5 text-accent" />
                </span>
              ) : null}
              <div className="rf-peffle-chat-bubble" data-role={turn.role}>
                {turn.role === "assistant" ? (
                  <span className="rf-peffle-chat-meta">
                    <span>Peffle</span>
                    <span className="rf-peffle-chat-planner">
                      {turn.planner === "gemini" || turn.planner === "groq" ? (
                        <Sparkle className="size-3" aria-hidden />
                      ) : null}
                      {plannerLabel(turn.planner)}
                    </span>
                  </span>
                ) : null}
                <p>{turn.text}</p>
              </div>
            </li>
          ))}
          {busy ? (
            <li className="rf-peffle-chat-row rf-peffle-chat-row-assistant" aria-busy="true">
              <span className="rf-peffle-chat-avatar-sm" aria-hidden>
                <ShieldCheck className="size-3.5 text-accent" />
              </span>
              <div className="rf-peffle-chat-bubble" data-role="assistant">
                <span className="rf-peffle-chat-meta">
                  <span>Peffle</span>
                  <span className="rf-peffle-chat-planner">Thinking…</span>
                </span>
                <p className="rf-peffle-chat-typing">
                  <span />
                  <span />
                  <span />
                </p>
              </div>
            </li>
          ) : null}
        </ul>
      </div>

      <footer className="rf-peffle-guide-chat-footer">
        <div className="rf-peffle-chat-composer">
          <input
            data-testid="agent-chat-input"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={DESK_CHAT_PLACEHOLDER}
            autoComplete="off"
            spellCheck={false}
            name="peffle-chat"
            disabled={inputDisabled}
            aria-disabled={inputDisabled}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button
            type="button"
            data-testid="agent-chat-send"
            disabled={inputDisabled || !message.trim()}
            onClick={() => void send()}
            className="rf-peffle-icon-btn rf-peffle-chat-send"
            aria-label="Send message"
          >
            <PaperPlaneRight className="size-4" />
          </button>
        </div>
        {error ? (
          <p className="mt-2 text-[0.75rem] text-danger" data-testid="agent-chat-error">
            {error}
          </p>
        ) : null}
      </footer>
    </section>
  );
}
