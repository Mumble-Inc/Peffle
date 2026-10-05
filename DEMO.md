# 60-second Peffle demo

Traffic below is a live local path. Enforcement is process-scoped SQLite, not a hosted control plane. Full setup, env vars, and talking points: [README.md](./README.md#demo). The 42s execution-control film is [`videos/peffle-brag/renders/peffle-brag.mp4`](./videos/peffle-brag/renders/peffle-brag.mp4).

## Prepare

```bash
npm run db:seed
npm run demo:seed
# .env.local: DEMO_MODE=1  (staff-only live trace)
npm run dev
```

Confirm the log line `Peffle mode: local/process-scoped`. `demo:seed` sets the daily **apply_discount** budget to ₹500 (50,000 paise) and resets `.peffle/ledger.db`. Numbers: `docs/demo-numbers.md`.

Sign in as staff if you want Demo Mode or Control.

## Commerce (desk)

1. Open `/desk`.
2. Command bar: `halo-anc Halo ANC for a 14-hour flight, budget ₹8,500` (or a quick action).
3. **Add** Halo ANC. Context rail → **Cart**.
4. **Authorize** → Razorpay Test Mode. Without keys, checkout fails honestly.

## Peffle guard (chat + Control)

1. Chat: `give me ₹200 off` → execution activity **ALLOWED**.
2. Chat: `give me ₹800 off` → **BUDGET_EXCEEDED**. Razorpay is not called.
3. Chat: `20% off` → **merchant policy** (12% ceiling), not Peffle.
4. Control → kill `desk:<sessionId>` → next discount **AGENT_KILLED**.
5. Revive. Refund on a captured order → **APPROVAL_REQUIRED**. Approve on Control, then retry.

## Demo Mode

Staff + `DEMO_MODE=1` only. Top-right **Live desk** → **Demo Mode**. Context rail **Trace** reads live Peffle Guard events for this session. Buyers never see the toggle.
