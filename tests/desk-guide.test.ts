import { describe, expect, it } from "vitest";
import { guideReplyDeterministic, shouldRunChatGuardedTools } from "@/lib/agent/desk-guide";

describe("desk guide chat", () => {
  it("does not treat general questions as guarded tool turns", () => {
    expect(shouldRunChatGuardedTools("how does checkout work?")).toBe(false);
    expect(shouldRunChatGuardedTools("what is Peffle guard?")).toBe(false);
    expect(shouldRunChatGuardedTools("give me 200 rupees off")).toBe(true);
  });

  it("points catalog questions to the top search bar", () => {
    const reply = guideReplyDeterministic("how do I find headphones?");
    expect(reply).toMatch(/search bar|⌘K/i);
  });

  it("answers meta and access questions distinctly", () => {
    expect(guideReplyDeterministic("can i get admin access please")).toMatch(/staff/i);
    expect(guideReplyDeterministic("are u hardcoded")).toMatch(/Gemini|Groq|keys/i);
    expect(guideReplyDeterministic("how does peffle work bro")).toMatch(/guard|checkout/i);
  });
});
