export type ChatHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

export function normalizeChatHistory(raw: unknown): ChatHistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatHistoryTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: string }).role;
    const content = (item as { content?: string }).content?.trim() ?? "";
    if (!content || content.length > 2000) continue;
    if (role !== "user" && role !== "assistant") continue;
    out.push({ role, content });
  }
  return out.slice(-10);
}
