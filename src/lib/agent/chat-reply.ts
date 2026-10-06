import { GoogleGenAI } from "@google/genai";
import type { ChatHistoryTurn } from "@/lib/agent/chat-history";
import { getGeminiApiKey, getGeminiModel, GEMINI_REQUEST_TIMEOUT_MS } from "@/lib/gemini/config";
import { geminiErrorText, withGeminiRetry } from "@/lib/gemini/retry";
import { groqChatCompletion } from "@/lib/groq/config";
import { guideReplyDeterministic } from "@/lib/agent/desk-guide";

export type ChatReplyPlanner = "gemini" | "groq" | "deterministic";

const BASE_SYSTEM = `You are Peffle on the buyer desk. Your job in THIS chat is to explain how the product works in plain language (2-5 short sentences).
Do NOT act as catalog search — buyers search products with the top command bar (⌘K), which runs the merchant agent and shows recommendations in the main canvas.
Explain when relevant: intent → catalog match → add to cart → policy check → Peffle guard → Authorize → Razorpay Test checkout → audit.
Chat can demo guarded actions (discount/refund requests) when the user explicitly asks to try them; results come from server tools only.
Never invent prices, stock, or payment outcomes. Never claim success unless a tool result says ok=true.
If they want products, tell them to use the top search bar with budget and use case.
Match the user's tone briefly but stay professional. Answer the specific question; do not repeat the same paragraph twice in a thread.`;

function geminiContents(message: string, history: ChatHistoryTurn[]) {
  const prior = history.map((turn) => ({
    role: turn.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: turn.content }],
  }));
  return [...prior, { role: "user" as const, parts: [{ text: message }] }];
}

function groqMessages(system: string, message: string, history: ChatHistoryTurn[]) {
  return [
    { role: "system" as const, content: system },
    ...history.map((turn) => ({
      role: (turn.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: turn.content,
    })),
    { role: "user" as const, content: message },
  ];
}

export async function generateAgentChatReply(
  message: string,
  context: { merchantName: string; toolSummary: string },
  history: ChatHistoryTurn[] = [],
): Promise<{ reply: string; planner: ChatReplyPlanner }> {
  const system = `${BASE_SYSTEM}\nMerchant: ${context.merchantName}\n${context.toolSummary}`;

  if (getGeminiApiKey()) {
    try {
      const reply = await withGeminiRetry(async () => {
        const client = new GoogleGenAI({ apiKey: getGeminiApiKey()! });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);
        try {
          const response = await client.models.generateContent({
            model: getGeminiModel(),
            contents: geminiContents(message, history),
            config: {
              abortSignal: controller.signal,
              systemInstruction: system,
              temperature: 0.45,
            },
          });
          const text = response.text?.trim();
          if (!text) throw new Error("Gemini returned an empty reply");
          return text;
        } finally {
          clearTimeout(timeout);
        }
      });
      return { reply, planner: "gemini" };
    } catch (error) {
      console.info(`chat_reply gemini_fallback:${geminiErrorText(error)}`);
    }
  }

  try {
    const groq = await groqChatCompletion(groqMessages(system, message, history));
    if (groq) {
      return { reply: groq, planner: "groq" };
    }
  } catch (error) {
    console.info(`chat_reply groq_failed:${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    reply: guideReplyDeterministic(message),
    planner: "deterministic",
  };
}
