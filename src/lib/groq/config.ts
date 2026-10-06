export const GROQ_REQUEST_TIMEOUT_MS = 15_000;

export function getGroqApiKey(): string | null {
  const key = process.env.GROQ_API_KEY?.trim();
  return key || null;
}

export function getGroqModel(): string {
  return process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b";
}

export async function groqChatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<string | null> {
  const apiKey = getGroqApiKey();
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GROQ_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getGroqModel(),
        messages,
        temperature: 0.35,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Groq ${response.status}: ${text.slice(0, 200)}`);
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    return content || null;
  } finally {
    clearTimeout(timeout);
  }
}
