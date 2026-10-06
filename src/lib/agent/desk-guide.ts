/** Copy for rail chat: explain the desk, not replace catalog search. */
export const DESK_CHAT_PLACEHOLDER = "Ask how search, cart, policy, or checkout works…";

export function guideReplyDeterministic(message: string): string {
  const text = message.trim().toLowerCase();
  if (!text) {
    return "Ask how the desk works: catalog search, cart, Peffle guard, or Razorpay checkout.";
  }
  if (/\b(search|catalog|find|product|sku|halo|headphone)\b/.test(text)) {
    return "Use the search bar at the top (⌘K) to find catalog products. Describe what you need and your budget, then run search. Chat here is for how the desk works, not product lookup.";
  }
  if (/\b(cart|add|line item)\b/.test(text)) {
    return "After search, add products from the grid or recommendation. Open the Cart tab to review lines and totals before checkout.";
  }
  if (/\b(policy|margin|discount|guard|peffle|budget|kill)\b/.test(text)) {
    return "Merchant policy sets discount ceilings and margins. Peffle guard enforces execution budgets and can block checkout. Policy tab shows the verdict; Demo Mode trace shows guard events for staff.";
  }
  if (/\b(checkout|authorize|pay|razorpay|payment|capture)\b/.test(text)) {
    return "When the agent marks the offer ready, use Authorize on the Cart tab. Razorpay Test Mode opens for payment. Peffle checks the order before the gateway is called.";
  }
  if (/\b(refund|decline|fail|recovery)\b/.test(text)) {
    return "Simulate decline demos failure recovery. Real refunds on captured orders go through guarded tools and may need operator approval.";
  }
  if (/\b(chat|this panel|here)\b/.test(text)) {
    return "This chat explains how Peffle works. Product search lives in the top bar. You can also ask me to try a discount or refund request when you are testing guardrails.";
  }
  if (/\b(admin|staff|control|portal|merchant)\b/.test(text)) {
    return "Admin and Control are for verified staff only. Buyers stay on the desk. Staff sign in with a merchant account to see policies, orders, and Peffle control.";
  }
  if (/\b(hardcoded|scripted|bot|real ai|are you ai|are u ai)\b/.test(text)) {
    return "When Gemini or Groq keys are configured, answers are generated per message with conversation context. Without keys, you get short built-in desk guides. Discount and refund demos always run real guarded server tools.";
  }
  if (/\b(how|what).*(peffle|this desk)\b/.test(text) || /\bpeffle work/.test(text)) {
    return "Peffle guards side effects: checkout, discounts, and refunds. Flow is search (top bar) → recommendation → cart → policy check → Peffle guard → Authorize → Razorpay Test Mode → audit.";
  }
  if (/^(hi|hello|hey|yo)\b/.test(text) || /\bbro\b/.test(text)) {
    return "Hey. I can walk you through search, cart, policy, guardrails, and checkout. What part of the desk do you want to understand?";
  }
  return `On "${message.trim().slice(0, 48)}${message.length > 48 ? "…" : ""}": use the top bar to search products; ask me about cart, policy, Peffle guard, or checkout. For guard demos, request a specific discount or refund.`;
}

export function shouldRunChatGuardedTools(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  if (/\brefund\b/i.test(text)) return true;
  if (/\bdiscount\b/i.test(text)) return true;
  if (/\b(\d{1,2})\s*%\s*off\b/i.test(text)) return true;
  if (/\b(give me|apply|try)\b.*\b(off|discount)\b/i.test(text)) return true;
  if (/(?:₹|rs\.?|inr)\s*[\d,]+\s*off/i.test(text)) return true;
  if (/[\d,]+\s*(?:rupees?|rs)\s*off/i.test(text)) return true;
  return false;
}
