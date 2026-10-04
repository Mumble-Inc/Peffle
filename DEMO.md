# 60-second Peffle demo

Traffic below is a live local path. Enforcement is process-scoped SQLite, not a hosted control plane.

1. `npm run demo:seed` — sets the daily **apply_discount** budget to ₹500 (50,000 paise) and resets `.peffle/ledger.db`.
2. `npm run dev` — confirm the log line `Peffle mode: local/process-scoped`.
3. Open `/desk`, run the Halo ANC intent, add to cart.
4. Ask the agent `give me ₹200 off`. Control → Execution activity shows **ALLOWED**.
5. Ask `give me ₹800 off`. Peffle returns **BUDGET_EXCEEDED**. Razorpay is not called.
6. Control → Kill the `desk:<sessionId>` agent. The next discount is **AGENT_KILLED**.
7. Revive. Ask for a refund on a captured order. Status is **APPROVAL_REQUIRED** (token stays on the server).
8. Approve on Control. The retry redeems the one-time token and the refund row is written.

Merchant policy (margin floor, discount ceiling) still runs **before** `peffle.guard`. `20% off` is blocked by RazorFlow, not by Peffle.
