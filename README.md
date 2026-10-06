# Peffle

AI merchant commerce agent for the Razorpay Buildathon (AI Growth & Agentic Commerce).

Peffle turns buyer intent into a **policy-governed, auditable sale** on Razorpay. It is not a chatbot. The server owns catalog truth, policy enforcement, checkout amounts, and payment capture.

**Visible commerce workflow:** buyer intent → understand → catalog → recommend → upsell / cross-sell → policy check → authorization → Razorpay payment → success / failure → audit → revenue impact

Peffle (`peffle@0.1.7`) sits on the live agent tool path and `checkout.create`. Merchant policy still owns price, margin, stock, and discount ceiling. Peffle owns whether the agent may execute, the global daily discount budget, refund approval, and the kill switch.

| Layer | Enforces | Does not enforce |
| --- | --- | --- |
| **Commerce** (Postgres policy + catalog) | Margin floor, discount ceiling, stock, commercial validity | Spend caps, kill switch, one-time approvals |
| **Peffle** (`guard()`) | Global daily budgets, `require_approval` refunds, agent kill | Catalog prices, Razorpay capture |
| **Audit** | Record of allowed / blocked / approved / killed | Enforcement |

Local development and demos target **PostgreSQL on localhost**. Run as a **single Node process**. Vercel / serverless is not the supported workflow.

---

## What Peffle does today

| Capability | Summary |
| --- | --- |
| **Buyer desk** | Native commerce workspace: command bar intent, catalog grid, context rail (Chat / Cart / Policy / Trace), Razorpay Test Mode checkout, verified capture or failure recovery |
| **Hybrid AI intent** | Gemini structured JSON when `GEMINI_API_KEY` is set; deterministic fallback through the same discovery pipeline when not |
| **Deterministic catalog** | PostgreSQL-backed Northline catalog (40 SKUs); filter, rank, sort, and paginate matches server-side |
| **Policy engine** | Discount ceiling, margin floor, order cap, budget fit, evidenced cross-sell; staff-configured and persisted |
| **User-controlled cart** | Recommendations are not cart lines until the buyer taps **Add**; checkout totals come from server cart state |
| **Razorpay payments** | Order + payment persistence, Checkout.js, HMAC signature verification, webhooks (`payment.captured` / `payment.failed`), idempotent processing |
| **Recovery** | Re-evaluate policy and catalog before retry after failure or abandoned checkout |
| **Buyer accounts** | Register, email verification (SMTP or dev outbox), sign-in, password reset; verified buyers required for checkout |
| **Merchant admin** | Overview, orders, payments, recovery queue, products, policies, activity audit, insights, staff, Peffle control plane |
| **Peffle execution control** | Guards `checkout.create`, `search_products`, `apply_discount`, and `issue_refund` inside `guard()`. Kill switch, daily discount budget, refund approval. Local SQLite only |
| **Agent chat tools** | `POST /api/agent/chat` — Gemini function calling when `GEMINI_API_KEY` is set; deterministic planner otherwise. Amounts recomputed server-side |
| **Demo Mode** | Staff-only live Peffle Guard trace on `/desk` when `DEMO_MODE=1`. Reads real ledger events. Does not invent traces |
| **Live metrics** | Landing page GMV and policy stats from captured payments only (no fabricated revenue) |

---

## Quick start

**Node 22** (see `.nvmrc`). `npm run dev` and other scripts use `scripts/with-supported-node.sh`, which prefers Homebrew `node@22` when installed (`brew install node@22`). On Apple Silicon, if `node -v` fails with a `simdjson` dylib error, run `brew reinstall simdjson` or use `node@22` only.

```bash
npm install
docker compose up -d
cp .env.example .env.local
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run demo:seed
npm run dev
```

App URL: **http://localhost:3010**

Open `/desk` as Northline Audio. For the Peffle judge script, also set `DEMO_MODE=1` in `.env.local` and sign in as staff (see [Demo](#demo)).

Check the environment:

```bash
npx tsx scripts/preflight.ts
```

---

## Demo

Use this for judges. Enforcement is **process-scoped SQLite**, not a hosted control plane. Numbers in `docs/demo-numbers.md` are written from the live catalog by `npm run demo:seed`.

### Prepare

1. Complete [Quick start](#quick-start).
2. Put Razorpay **Test Mode** keys in `.env.local` if you want a real Checkout.js modal. Without keys, checkout fails honestly (no fake capture).
3. Optional but recommended for the guard story:

```bash
# .env.local
DEMO_MODE=1
GEMINI_API_KEY=...          # optional; desk still works without it
INITIAL_ADMIN_EMAIL=you@example.com
RAZORFLOW_USE_DEV_EMAIL=1   # skip SMTP; use the dev outbox
```

4. Restart `npm run dev`. Confirm the log line `Peffle mode: local/process-scoped`.
5. Register / verify that email, then sign in. That account becomes administrator after verification.

`npm run demo:seed` resets `.peffle/ledger.db` and sets the daily **apply_discount** budget to ₹500 (50,000 paise). Re-run it before each judged pass so the budget is empty.

### Stable demo numbers (after seed)

| Field | Value |
| --- | --- |
| Product | Northline Halo ANC (`halo-anc`) |
| List price | ₹7,490 (749000 paise) |
| List margin | ~31.64% |
| Merchant margin floor | 18% |
| Merchant discount ceiling | 12% |
| Peffle discount budget | ₹500 / UTC day, global |
| Discount that Peffle allows | ₹200 off |
| Merchant policy block | 20% off (above 12% ceiling) |

### 60-second commerce path (buyer desk)

1. Open **http://localhost:3010/desk**.
2. In the command bar, run:

   `halo-anc Halo ANC for a 14-hour flight, budget ₹8,500`

   Or use the three quick actions: **Recommend under ₹15,000**, **Compare Halo vs Transit**, **Show bestsellers**.
3. Catalog highlights the live SKU. Add **Halo ANC** (and the suggested case if you want attach).
4. Context rail → **Cart**. Totals are server cart state.
5. **Authorize** → Razorpay Test Mode Checkout.js → pay with a [test card](https://razorpay.com/docs/payments/payments/test-cards/).
6. Desk shows captured state. Landing `/` GMV only moves after a **verified** capture.

Do **not** claim revenue that is not a captured, signature-verified payment.

### Peffle execution path (staff)

Stay on `/desk` with a staff session, or use `/admin` Control.

1. Add Halo ANC to cart (or keep the captured order from the commerce path).
2. Context rail **Chat**: `give me ₹200 off`. Control → Execution activity: **ALLOWED**.
3. Chat: `give me ₹800 off`. Peffle returns **BUDGET_EXCEEDED**. Razorpay is not called.
4. Chat: `20% off`. **Merchant policy** blocks this (12% ceiling), not Peffle.
5. Control → kill the `desk:<sessionId>` agent. The next discount is **AGENT_KILLED**.
6. Revive. Ask for a refund on a captured order. Status is **APPROVAL_REQUIRED** (token stays on the server).
7. Approve on Control. Retry redeems the one-time token.

### Demo Mode (live trace)

Buyers never see this. Staff see **Live desk** in the top-right of `/desk` only when `DEMO_MODE=1`.

1. Sign in as staff.
2. Toggle **Live desk** → **Demo Mode**.
3. Context rail **Trace** reads `GET /api/admin/peffle/trace` for this session.
4. Send a chat turn (`search halo`). Trace shows the real guarded action (`search_products`, ALLOWED / BLOCKED). Empty trace means no guarded action yet, not a fake waiting state for judges.

Toggle off before handing the laptop to a buyer.

### What to say

- Gemini (optional) understands language. Postgres is catalog truth. Merchant policy is the offer. Peffle is the last gate before Razorpay.
- The desk is a commerce workspace: catalog, cart, policy meter, payment. It is not a chat demo with a fake checkout.
- Kill switch and daily budget are Peffle. Price and margin are merchant policy.

A shorter copy of this script lives in [`DEMO.md`](./DEMO.md).

---

## Product film

42-second brag film for judges: Peffle as the **execution-control layer** between an AI agent and tools with side effects. It is not a payment-gateway, fraud, or SOC story.

| Beat | What it shows |
| --- | --- |
| 0–5s | Agents can call real tools. Peffle decides what they may execute. |
| 5–12s | Buyer intent under ₹7,500 → Halo ANC in policy → cart |
| 12–20s | 20% discount request → authority / budget exceeded → **BLOCKED** |
| 20–28s | Spend limit, approval, kill switch, audit. Red-team demo: 50 executed / 150 blocked |
| 28–36s | Kill switch. Agent killed. Audit trail of blocked calls |
| 36–42s | The agent makes the decision. Peffle controls the execution. |

Rendered MP4: [`videos/peffle-brag/renders/peffle-brag.mp4`](./videos/peffle-brag/renders/peffle-brag.mp4)

Source is a HyperFrames project (Outfit + IBM Plex Mono, captured `/desk`, ElevenLabs VO + SFX):

```bash
cd videos/peffle-brag
npm run dev      # Studio preview
npm run check    # lint + runtime + layout + contrast
npm run render   # encode MP4
```

---

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **UI:** Tailwind CSS v4, Motion, Phosphor icons (Outfit + IBM Plex Mono)
- **Data:** PostgreSQL 16, Prisma 6
- **Payments:** Razorpay (server SDK + Checkout.js)
- **AI (optional):** Google Gemini (`@google/genai`) for intent extraction and agent tool choice
- **Execution control:** `peffle@0.1.7` (local SQLite, process-scoped)
- **Auth:** bcrypt passwords, signed session tokens, email verification (Nodemailer)
- **Quality:** Vitest (integration), Playwright (E2E on port **3011**)

---

## Surfaces

| Route | Who | Purpose |
| --- | --- | --- |
| `/` | Public | Product story, workflow, **live** weekly GMV / attach / policy block metrics |
| `/desk` | Buyer / staff | Commerce workspace (see below) |
| `/cart` | Buyer | Redirects to `/desk` (cart lives in the context rail) |
| `/verify-email` | Buyer | Email verification completion |
| `/reset-password` | Buyer | Password reset |
| `/policies` | Public URL | Redirects buyers to `/desk`; staff use `/admin/policies` |
| `/admin` | Staff | **Peffle control plane**: protection status, spend cap, kill switch, execution ledger; plus commerce GMV |
| `/admin/orders` | Staff | Order list and detail |
| `/admin/payments` | Staff | Payment list and detail |
| `/admin/recovery` | Staff | Failed / abandoned checkout recovery queue |
| `/admin/products` | Staff | Catalog CRUD (activate / deactivate, inventory, metadata) |
| `/admin/inventory` | Staff | Inventory-focused product view |
| `/admin/policies` | Staff | Merchant guardrails (discount, margin, cap, cross-sell, budget fit) |
| `/admin/activity` | Staff | Audit activity feed |
| `/admin/insights` | Staff | Revenue and funnel-style insights from persisted data |
| `/admin/staff` | Administrator | Staff email allowlist management |

There is **no public `/ledger` page**. `GET /api/ledger` returns merchant-authenticated JSON used by the landing page.

### Desk workspace

`/desk` is a desktop commerce app, not a marketing landing page and not an UNDERSTAND → DECIDE → TRANSACT wizard.

| Region | Job |
| --- | --- |
| **Left nav** | Desk, Catalog, Orders, Policies, Control, Analytics |
| **Command bar** | Natural-language intent (`data-testid="intent-input"`). Submit runs the agent (`run-agent`) |
| **Top-right** | Merchant chip (Northline Audio), settings, account, Live desk / Demo Mode (staff + `DEMO_MODE=1` only) |
| **Hero** | Live catalog photography (Halo ANC PNG when seeded), three quick actions |
| **Catalog** | 40 real SKUs, filters, sort, add-to-cart. Photos: PNG for `halo-anc`, `halo-case`, `drift-buds`, `field-speaker`; SVG for the expanded range |
| **Context rail (~376px)** | Tabs: Chat, Cart, Policy, Trace. Authorize / simulate decline. Peffle Guard meter (order vs cap, discount, margin) |

Agent copy on the desk is user-safe only: decision, short reason, evidence, policy result, action, outcome. No chain-of-thought.

---

## Demo merchant: Northline Audio

Seeded merchant id: `northline-audio` (override with `DEMO_MERCHANT_ID`).

- **40 products** across headphones, earbuds, speakers, soundbars, cases, cables, chargers, adapters
- **Hero photography:** PNG for the original four SKUs (`halo-anc`, `halo-case`, `drift-buds`, `field-speaker`)
- **Expanded catalog:** deterministic SVG renders at `public/products/{sku}.svg`

Regenerate expanded SVGs:

```bash
npm run catalog:images
```

**Seed behavior:** `npm run db:seed` clears transactional runtime data (sessions, carts, orders, payments, audit events) and preserves merchant, policy, and catalog. Re-seeding does not accumulate fake GMV.

Amounts in the UI use `en-IN` INR formatting.

---

## Roles and access

| Role | Access |
| --- | --- |
| **Anonymous buyer** | Desk sessions, agent run, cart (session-scoped) |
| **Verified buyer** | Checkout and payment (email verified account linked to session where required) |
| **Staff** | `/admin/*` except staff management; Demo Mode toggle when `DEMO_MODE=1` |
| **Administrator** | Staff capabilities + `/admin/staff`; bootstrap via `INITIAL_ADMIN_EMAIL` after normal email verification |

Buyers see policy **outcomes** on the desk (allowed / blocked). They cannot read or change merchant guardrails. Policy mutation requires a verified staff session (`/api/admin/policies`).

---

## End-to-end desk flow

1. **Intent** — Buyer enters natural language on `/desk` (command bar or quick actions).
2. **Session** — `POST /api/sessions` persists `BuyerSession` + structured `BuyerIntent` + audit events.
3. **Agent run** — `POST /api/agent/run` loads catalog and policies from PostgreSQL, runs discovery + policy engine, persists `AgentDecision`.
4. **Browse** — Multiple matches can paginate options; single-intent prompts show one primary recommendation. The catalog grid always shows live SKUs.
5. **Cart** — **Add** only; context rail Cart is the source of truth (`POST` / `PATCH` / `DELETE /api/cart`).
6. **Checkout** — `POST /api/checkout` with `{ sessionId, source: "cart" }` (or legacy `decisionId` path): server recomputes amount, re-validates merchant policy, Peffle-guards execution, creates `Order` + `OrderLineItem` + `Payment`, creates Razorpay order.
7. **Pay** — Razorpay Checkout.js (public key + `order_id` only).
8. **Verify** — `POST /api/payments/verify` validates signature server-side before UI shows success.
9. **Complete** — Rail shows captured summary; state survives reload until **Start new sale** (`POST /api/desk/reset`).
10. **Recover** — On failure or dismiss: `POST /api/payments/fail` or `abandon`; `POST /api/recovery/evaluate` before retry.

GMV and ledger metrics count **only** payments with `status = CAPTURED` and verified signatures.

---

## Hybrid AI discovery

| Layer | Responsibility |
| --- | --- |
| **Gemini** (`gemini-intent-provider.ts`) | Natural language → validated `StructuredIntent` (category, budget paise, exclusions, `discovery.mode`, count, sort, soft preferences). **No catalog, no SKUs, no prices.** |
| **Deterministic engine** (`discover-catalog.ts`, `resolve-exact-product.ts`, `match-catalog.ts`) | Exact name resolution → category filter → budget → exclusions → rank → sort → take N |
| **Policy engine** (`run-agent.ts`) | Margin, discount ceiling, order cap, budget fit on the offer |

When `GEMINI_API_KEY` is unset or Gemini fails, `parse-intent.ts` feeds the **same** discovery pipeline (audit: `INTENT_DETERMINISTIC_FALLBACK`).

**Browse vs single:** `discovery.mode=browse` returns up to four options; `single` returns one recommendation.

Live validation (requires DB + API key):

```bash
GEMINI_MODEL=gemini-3.6-flash npm run validate:gemini-discovery
```

Smoke test (intent only):

```bash
npm run smoke:gemini-intent
```

---

## Payments and webhooks

| Step | API / service | Persistent state |
| --- | --- | --- |
| Start checkout | `POST /api/checkout` | Merchant policy, then Peffle `checkout.create` guard, then Order `CREATED`, Payment `PENDING`, session `PAYMENT_PENDING` |
| Abandon modal | `POST /api/payments/abandon` | Order / Payment cancelled, session restored, `CHECKOUT_ABANDONED` |
| Client success callback | `POST /api/payments/verify` | Signature check → `CAPTURED` / `PAID` or `PAYMENT_VERIFICATION_FAILED` |
| Simulate decline (demo) | `POST /api/payments/fail` | `FAILED` without treating client callback as truth |
| Webhook | `POST /api/webhooks/razorpay` | `payment.captured` / `payment.failed`, idempotent via `ProcessedWebhook` |

**Security:** Never trust client amount, price, discount, or payment status. Amounts are always derived from persisted cart or decision rows in paise. Razorpay secrets stay on the server.

Configure Razorpay Test Mode webhook:

```text
POST https://<your-host>/api/webhooks/razorpay
Events: payment.captured, payment.failed
```

For local webhooks, expose port **3010** with ngrok or similar and set `RAZORPAY_WEBHOOK_SECRET`.

---

## API overview

### Buyer / desk

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/sessions` | Create session + intent |
| POST | `/api/agent/run` | Server agent + decision persistence |
| POST | `/api/agent/chat` | Tool-calling chat on an existing session |
| GET / POST / PATCH / DELETE | `/api/cart` | Session cart lines |
| POST | `/api/checkout` | Cart or decision checkout |
| POST | `/api/payments/verify` | Razorpay signature verification |
| POST | `/api/payments/fail` | Record failure |
| POST | `/api/payments/abandon` | Abandoned checkout |
| POST | `/api/recovery/evaluate` | Pre-retry policy / catalog check |
| GET | `/api/desk/context` | Merchant, catalog, policies, auth, Demo Mode flag |
| POST | `/api/desk/reset` | Start new sale |
| GET | `/api/catalog` | Active catalog (public read) |
| GET | `/api/health` | Health check |

### Auth

| Method | Path |
| --- | --- |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` |
| GET | `/api/auth/session` |
| POST | `/api/auth/email/request`, `/api/auth/email/verify`, `/api/auth/verify-email`, `/api/auth/verify-code` |
| POST | `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/resend-verification` |
| POST | `/api/auth/change-email` |
| GET | `/api/auth/merchant` |

Dev-only (when `RAZORFLOW_USE_DEV_EMAIL=1`): `/api/auth/dev/verification-code`, `/api/auth/dev/verify-email`

### Admin (staff)

| Method | Path |
| --- | --- |
| GET | `/api/admin/overview`, `/api/admin/insights`, `/api/admin/activity` |
| GET | `/api/admin/orders`, `/api/admin/orders/[orderId]` |
| GET | `/api/admin/payments`, `/api/admin/payments/[paymentId]` |
| GET | `/api/admin/recovery`, `/api/admin/recovery/[decisionId]` |
| GET / POST | `/api/admin/products`, `/api/admin/products/[productId]` |
| GET / PUT | `/api/admin/policies` |
| GET / POST / DELETE | `/api/admin/staff` |
| GET | `/api/admin/peffle` | Control plane snapshot |
| POST | `/api/admin/peffle/cap`, `/api/admin/peffle/discount-cap` | Daily budgets |
| POST | `/api/admin/peffle/kill` | Kill / revive agent |
| POST | `/api/admin/peffle/approvals` | Refund approval tokens |
| GET | `/api/admin/peffle/trace` | Demo Mode live trace (`DEMO_MODE=1` + staff) |

### Legacy / merchant

| Method | Path |
| --- | --- |
| GET / PUT | `/api/policies` | Staff-oriented; buyers redirected at UI |
| GET | `/api/ledger` | Authenticated metrics JSON |

### Webhooks

| Method | Path |
| --- | --- |
| POST | `/api/webhooks/razorpay` |

---

## Data model (Prisma)

Core commerce: `Merchant`, `Product`, `Policy`, `BuyerSession`, `BuyerIntent`, `AgentDecision`, `CartLine`, `Order`, `OrderLineItem`, `Payment`, `AuditEvent`, `ProcessedWebhook`

Accounts: `BuyerIdentity`, `BuyerAccount`, `AccountVerificationCode`, `AccountAuthSession`, `AccountToken`, `EmailVerificationChallenge`, `MerchantStaffEmail`

Money is stored as **integer paise**. See `prisma/schema.prisma` and `architecture.md` for relationships and enums.

---

## Environment variables

Copy `.env.example` to `.env.local` (and `.env` for Prisma CLI). Never commit secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DEMO_MERCHANT_ID` | No | Default `northline-audio` |
| `RAZORPAY_KEY_ID` | For real checkout | Server Razorpay API |
| `RAZORPAY_KEY_SECRET` | For real checkout | Server only; never expose to client |
| `RAZORPAY_WEBHOOK_SECRET` | For webhooks | Webhook HMAC verification |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | For Checkout.js | Public key only |
| `GEMINI_API_KEY` | No | LLM intent extraction and agent chat (server only) |
| `GROQ_API_KEY` | No | Optional agent chat replies when Gemini is unavailable (`GROQ_MODEL`, default `llama-3.3-70b-versatile`) |
| `GEMINI_MODEL` | No | Default `gemini-3.6-flash` |
| `RAZORFLOW_SESSION_SECRET` | Production | Signed auth / session tokens |
| `SMTP_*`, `SMTP_FROM` | No | Real verification emails |
| `INITIAL_ADMIN_EMAIL` | No | Bootstrap administrator after verification |
| `RAZORFLOW_USE_DEV_EMAIL` | Test / E2E | Capture mail in dev outbox (`1`) |
| `DEMO_MODE` | Demo | `1` enables staff-only live trace on `/desk`. Never enable for public buyers |
| `PEFFLE_STORAGE` | No | Local SQLite ledger path (default `.peffle/ledger.db`, server-only) |
| `PEFFLE_POLICY` | No | Peffle execution policy JSON (default `peffle.policy.json`) |
| `PEFFLE_CHECKOUT_CAP_PAISE` | No | Override `checkout.create` daily cap (integer paise). Policy default `1000000` (₹10,000 / UTC day) |
| `PEFFLE_DISCOUNT_CAP_PAISE` | No | Override `apply_discount` daily cap. Policy default `500000`; `demo:seed` sets `50000` |

Without Razorpay keys, checkout returns a clear error; the UI does **not** fake payment success.

`PEFFLE_GUARD=0` skips `peffle.guard` wrapping and is **test-only**. The process throws at startup unless `NODE_ENV=test`.

---

## Local setup

### 1. Install

```bash
npm install
```

### 2. PostgreSQL

```bash
docker compose up -d
```

Default: `postgresql://razorflow:razorflow@localhost:5432/razorflow` (user, password, and database `razorflow`).

### 3. Environment

```bash
cp .env.example .env.local
cp .env.example .env
```

Peffle uses local SQLite at `.peffle/ledger.db` (gitignored).

### 4. Migrate and seed

```bash
npm run db:migrate
npm run db:seed
npm run demo:seed
```

### 5. Run

```bash
npm run dev
```

App URL: **http://localhost:3010** (Playwright uses **3011**). Next.js allows only one `next dev` per repo directory.

### Email and admin bootstrap

For Gmail SMTP, use an [App Password](https://support.google.com/accounts/answer/185833) in `SMTP_PASSWORD`. Set `INITIAL_ADMIN_EMAIL` to the account that should become administrator after completing normal 6-digit email verification.

For judged demos without SMTP, set `RAZORFLOW_USE_DEV_EMAIL=1` and use the dev verification helpers.

---

## NPM scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server on port 3010 |
| `npm run build` | Prisma generate + production build |
| `npm run start` | Production server on 3010 |
| `npm test` | Vitest integration tests |
| `npm run test:e2e` | Playwright (isolated server on **3011**) |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:seed` | Seed Northline catalog + policy |
| `npm run db:studio` | Prisma Studio |
| `npm run catalog:images` | Regenerate product SVG assets |
| `npm run validate:gemini-discovery` | Live Gemini + DB discovery validation |
| `npm run smoke:gemini-intent` | Gemini intent extraction smoke |
| `npm run redteam` | Scripted guarded / unguarded benchmark → `docs/redteam-results.md` |
| `npm run demo:seed` | Reset Peffle ledger, set 50000 paise discount cap, write `docs/demo-numbers.md` |
| `npm run screenshots` | Playwright stills for docs |
| `npm run verify:clean` | Fresh clone → install → generate → test → build |
| `npx tsx scripts/preflight.ts` | PASS / FAIL env, DB, Gemini, Razorpay Test keys, ledger, single-node |

---

## Testing

```bash
npm test
npm run build
npm run test:e2e
```

- **Vitest:** 32 integration files against PostgreSQL (`tests/*.test.ts`). Uses the same `DATABASE_URL` as local dev.
- **Playwright:** Starts its own Next.js dev server on port **3011** with `RAZORFLOW_USE_DEV_EMAIL=1` and **without** `GEMINI_API_KEY` (deterministic intent in E2E). Specs under `e2e/` cover journeys, cart, recovery, admin, auth, Demo Mode, and payment boundary.
- Stop any manual `npm run dev` on 3010 if Playwright reports a Next.js lock conflict.

Payment E2E reaches the Razorpay Checkout boundary when Test Mode keys are present; completing the external modal is manual. Without keys, tests assert graceful checkout failure (no fabricated capture).

---

## Project documentation

| File | Contents |
| --- | --- |
| `DEMO.md` | Short 60-second Peffle demo |
| `videos/peffle-brag/renders/peffle-brag.mp4` | 42s execution-control product film |
| `architecture.md` | Pipeline, intent layers, cart, Peffle checkout guard, payments, recovery |
| `DESIGN.md` | Visual identity and UI tokens |
| `decisions.md` | Architectural decision notes |
| `roadmap.md` | MVP vs later work |
| `docs/demo-numbers.md` | Live Halo ANC numbers after `npm run demo:seed` |
| `docs/redteam-results.md` | Scripted red-team counts (generated by `npm run redteam`) |

---

## Known limitations

- **Peffle is local / process-scoped.** The ledger is SQLite on disk (or `:memory:` in tests). Approval tokens are process-local and do not survive restart. Run as a **single Node server**, not serverless / multi-instance. This repo does not implement hosted or multi-instance enforcement.
- **Payments are Razorpay Test Mode.** Captures are real Test Mode API calls when keys are set; they are not production settlements. Refund HTTP is stubbed in E2E unless a real captured Razorpay payment id exists (`RAZORFLOW_STUB_RAZORPAY_REFUND=1`).
- **`npm run redteam` is scripted** with a deterministic planner unless a live Gemini probe succeeds. Counts in `docs/redteam-results.json` are exact for that run, not organic traffic.
- **Gemini status:** key and `gemini-3.6-flash` work; free-tier `generate_content` quota is tight and can return HTTP 429. Chat retries with backoff then falls back. Do not claim Gemini planned a turn unless the row says `planner=gemini`.
- **Injection resistance is structural**, not model-level: there is no set-price tool. Gemini can still choose `apply_discount`; commerce / Peffle still gate money.
- **Demo Mode is presentation, not a second ledger.** It only renders live Peffle events for staff.

---

## Design principles

- **Original Peffle identity** — trust-first fintech UI; settlement teal accent; Outfit + IBM Plex Mono; no generic AI-purple SaaS chrome
- **Desk density** — commerce workspace first; catalog in the first viewport; context rail is a working panel, not a thin chatbot sidebar
- **Server authority** — catalog, merchant policy, amounts, and capture state live in PostgreSQL; Peffle authorizes checkout execution immediately before Razorpay order creation
- **Auditable agent** — user-safe explanations only; no chain-of-thought in UI or audit payloads
- **Honest metrics** — GMV from verified captures only

Built for the Razorpay Buildathon: demonstrate governed agentic commerce, not a scripted chatbot.
