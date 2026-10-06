"use client";

import { useEffect, useRef, useState } from "react";
import { PaperPlaneRight, ShieldCheck, Sparkle, X } from "@phosphor-icons/react";
import { ADMIN_GUARDRAILS_PLACEHOLDER } from "@/lib/agent/admin-guardrails-planner";

type ChatPlanner = "gemini" | "groq" | "deterministic";

type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  planner?: ChatPlanner;
};

const STARTERS = [
  "Show current guardrails",
  "Set discount ceiling to 10%",
  "Set checkout daily cap to ₹15000",
];

export function dispatchAdminGuardrailsUpdated() {
  window.dispatchEvent(new Event("razorflow:admin-guardrails-updated"));
}

export function AdminGuardrailsChatPanel({
  mobileOpen = false,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns, busy]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? message).trim();
    if (!text || busy) return;

    const userTurn: ChatTurn = { id: `u-${Date.now()}`, role: "user", text };
    const nextTurns = [...turns, userTurn];
    setTurns(nextTurns);
    setMessage("");
    setBusy(true);
    setError(null);

    try {
      const history = nextTurns.slice(0, -1).map((turn) => ({
        role: turn.role,
        content: turn.text,
      }));

      const response = await fetch("/api/admin/guardrails/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const payload = (await response.json()) as {
        reply?: string;
        planner?: ChatPlanner;
        tools?: Array<{ ok: boolean }>;
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Could not send message.");
        return;
      }

      setTurns((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: payload.reply ?? "No reply",
          planner: payload.planner,
        },
      ]);

      if (payload.tools?.some((tool) => tool.ok)) {
        dispatchAdminGuardrailsUpdated();
      }
    } finally {
      setBusy(false);
    }
  }

  const panelClass = mobileOpen
    ? "rf-admin-guardrails-rail rf-admin-guardrails-rail-mobile"
    : "rf-admin-guardrails-rail hidden lg:flex";

  return (
    <aside
      className={panelClass}
      aria-label="Guardrails assistant"
      data-testid="admin-guardrails-chat"
    >
      <section className="rf-admin-guardrails-chat">
        <header className="rf-admin-guardrails-chat-head">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rf-admin-guardrails-chat-avatar" aria-hidden>
              <ShieldCheck className="size-4 text-accent" weight="regular" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Guardrails assistant</p>
              <p className="text-[0.7rem] text-muted">Natural language policy edits</p>
            </div>
          </div>
          {mobileOpen && onMobileClose ? (
            <button
              type="button"
              className="rf-peffle-icon-btn shrink-0"
              aria-label="Close guardrails assistant"
              onClick={onMobileClose}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </header>

        <div ref={scrollRef} className="rf-admin-guardrails-chat-scroll">
          {turns.length === 0 ? (
            <div className="rf-admin-guardrails-welcome">
              <p className="text-[0.8125rem] leading-relaxed text-ink-soft">
                Set merchant limits or Peffle execution caps in plain language. Changes are validated
                server-side and audited.
              </p>
              <div className="rf-admin-guardrails-starters">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    className="rf-peffle-guide-starter"
                    disabled={busy}
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
                data-testid={turn.role === "assistant" ? "admin-guardrails-reply" : undefined}
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
                        {turn.planner === "gemini" || turn.planner === "groq" ? "AI" : "Guide"}
                      </span>
                    </span>
                  ) : null}
                  <p className="whitespace-pre-wrap">{turn.text}</p>
                </div>
              </li>
            ))}
            {busy ? (
              <li className="rf-peffle-chat-row rf-peffle-chat-row-assistant" aria-busy="true">
                <span className="rf-peffle-chat-avatar-sm" aria-hidden>
                  <ShieldCheck className="size-3.5 text-accent" />
                </span>
                <div className="rf-peffle-chat-bubble" data-role="assistant">
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

        <footer className="rf-admin-guardrails-chat-footer">
          <div className="rf-peffle-chat-composer">
            <input
              data-testid="admin-guardrails-input"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={ADMIN_GUARDRAILS_PLACEHOLDER}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <button
              type="button"
              data-testid="admin-guardrails-send"
              disabled={busy || !message.trim()}
              onClick={() => void send()}
              className="rf-peffle-icon-btn rf-peffle-chat-send"
              aria-label="Send message"
            >
              <PaperPlaneRight className="size-4" />
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-[0.75rem] text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </footer>
      </section>
    </aside>
  );
}
