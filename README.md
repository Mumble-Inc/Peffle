# RazorFlow

AI merchant commerce agent for the Razorpay Buildathon (AI Growth & Agentic Commerce).

RazorFlow turns buyer intent into a **policy-governed, auditable sale** on Razorpay. It is not a chatbot. The server owns catalog truth, policy enforcement, checkout amounts, and payment capture.

**Commerce pipeline:** Understand → Identify → Decide → Govern → Transact → Recover

Peffle (`peffle@0.1.7`) sits on the live agent tool path and `checkout.create`. Merchant policy still owns price, margin, stock, and discount ceiling. Peffle owns whether the agent may execute, the global daily discount budget, refund approval, and the kill switch.

| Layer | Enforces | Does not enforce |
| --- | --- | --- |
| **Commerce** (Postgres policy + catalog) | Margin floor, discount ceiling, stock, commercial validity | Spend caps, kill switch, one-time approvals |
| **Peffle** (`guard()`) | Global daily budgets, `require_approval` refunds, agent kill | Catalog prices, Razorpay capture |
| **Audit** | Record of allowed / blocked / approved / killed | Enforcement |

---

## What RazorFlow does today

| Capability | Summary |
| --- | --- |
| **Buyer desk** | Natural-language intent → structured extraction → catalog discovery → policy check → explicit cart → Razorpay Test Mode checkout → verified capture or failure recovery |
| **Hybrid AI intent** | Gemini structured JSON when `GEMINI_API_KEY` is set; deterministic fallback through the same discovery pipeline when not |
| **Deterministic catalog** | PostgreSQL-backed Northline catalog (40 SKUs); filter, rank, sort, and paginate matches server-side |
| **Policy engine** | Discount ceiling, margin floor, order cap, budget fit, evidenced cross-sell; staff-configured and persisted |
| **User-controlled cart** | Recommendations are not cart lines until the buyer taps **Add to cart**; checkout totals come from server cart state |
| **Razorpay payments** | Order + payment persistence, Checkout.js, HMAC signature verification, webhooks (`payment.captured` / `payment.failed`), idempotent processing |
| **Recovery** | Re-evaluate policy and catalog before retry after failure or abandoned checkout |
| **Buyer accounts** | Register, email verification (SMTP or dev outbox), sign-in, password reset; verified buyers required for checkout |
| **Merchant admin** | Overview, orders, payments, recovery queue, products, policies, activity audit, insights, staff management |
| **Peffle execution control** | `peffle@0.1.7` guards `checkout.create`, `search_products`, `apply_discount`, and `issue_refund` inside `guard()`. Kill switch, daily discount budget, refund approval. Local SQLite only |
| **Agent chat tools** | `POST /api/agent/chat` — Gemini function calling when `GEMINI_API_KEY` is set; deterministic planner otherwise. Amounts recomputed server-side |
| **Live metrics** | Landing page GMV and policy stats from captured payments only (no fabricated revenue) |

---

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **UI:** Tailwind CSS v4, Motion, Phosphor icons
- **Data:** PostgreSQL, Prisma 6
- **Payments:** Razorpay (server SDK + Checkout.js)
- **AI (optional):** Google Gemini (`@google/genai`) for intent extraction and agent tool choice
- **Execution control:** `peffle@0.1.7` (local SQLite, process-scoped)
- **Auth:** bcrypt passwords, signed session tokens, email verification (Nodemailer)
- **Quality:** Vitest (integration), Playwright (E2E on port **3011**)

Local development and demos target **PostgreSQL on localhost**. Vercel is not the current workflow.

---

## Demo merchant: Northline Audio

Seeded merchant id: `northline-audio` (override with `DEMO_MERCHANT_ID`).

- **40 products** across headphones, earbuds, speakers, soundbars, cases, cables, chargers, adapters
- **Hero assets:** PNG photography for the original four SKUs (`halo-anc`, `halo-case`, `drift-buds`, `field-speaker`)
- **Expanded catalog:** deterministic SVG renders at `public/products/{sku}.svg`

Regenerate expanded SVGs:

```bash
npm run catalog:images
```

**Seed behavior:** `npm run db:seed` clears transactional runtime data (sessions, carts, orders, payments, audit events) and preserves merchant, policy, and catalog. Re-seeding does not accumulate fake GMV.

---

## Surfaces

| Route | Who | Purpose |
| --- | --- | --- |
| `/` | Public | Product story, workflow rail, **live** weekly GMV / attach / policy block metrics |
| `/desk` | Buyer | Intent → agent decision browser → cart in Transaction column → authorize → Razorpay → completed sale state |
| `/cart` | Buyer | Redirects to `/desk` (cart lives in Transaction) |
| `/verify-email` | Buyer | Email verification completion |
| `/reset-password` | Buyer | Password reset |
| `/policies` | Public URL | Redirects buyers to `/desk`; staff use `/admin/policies` |
| `/admin` | Staff | **Peffle control plane**: protection status, spend cap, kill switch, execution ledger; plus commerce GMV |
| `/admin/orders` | Staff | Order list and detail |
| `/admin/payments` | Staff | Payment list and detail |
| `/admin/recovery` | Staff | Failed / abandoned checkout recovery queue |
| `/admin/products` | Staff | Catalog CRUD (activate/deactivate, inventory, metadata) |
| `/admin/inventory` | Staff | Inventory-focused product view |
| `/admin/policies` | Staff | Merchant guardrails (discount, margin, cap, cross-sell, budget fit) |
| `/admin/activity` | Staff | Audit activity feed |
| `/admin/insights` | Staff | Revenue and funnel-style insights from persisted data |
| `/admin/staff` | Administrator | Staff email allowlist management |

There is **no public `/ledger` page**. `GET /api/ledger` returns merchant-authenticated JSON used by the landing page.

---

## Roles and access

| Role | Access |
| --- | --- |
| **Anonymous buyer** | Desk sessions, agent run, cart (session-scoped) |
| **Verified buyer** | Checkout and payment (email verified account linked to session where required) |
| **Staff** | `/admin/*` except staff management; read/write policies via admin APIs |
| **Administrator** | Staff capabilities + `/admin/staff`; bootstrap via `INITIAL_ADMIN_EMAIL` after normal email verification |

Buyers see policy **outcomes** on the desk (allowed/blocked). They cannot read or change merchant guardrails. Policy mutation requires a verified staff session (`/api/admin/policies`, not public buyer routes).

---

## End-to-end desk flow

1. **Intent** — Buyer enters natural language on `/desk` (or uses demo prompt chips).
2. **Session** — `POST /api/sessions` persists `BuyerSession` + structured `BuyerIntent` + audit events.
3. **Agent run** — `POST /api/agent/run` loads catalog and policies from PostgreSQL, runs discovery + policy engine, persists `AgentDecision`.
4. **Browse** — Multiple matches show **Option X of Y** with Previous/Next; single-intent prompts show one primary recommendation.
5. **Cart** — **Add to cart** only; Transaction column is the cart source of truth (`POST/PATCH/DELETE /api/cart`).
6. **Checkout** — `POST /api/checkout` with `{ sessionId, source: "cart" }` (or legacy `decisionId` path): server recomputes amount, re-validates merchant policy, Peffle-guards execution, creates `Order` + `OrderLineItem` + `Payment`, creates Razorpay order.
7. **Pay** — Razorpay Checkout.js (public key + `order_id` only).
8. **Verify** — `POST /api/payments/verify` validates signature server-side before UI shows success.
9. **Complete** — Transaction shows captured summary; state survives reload until **Start new sale** (`POST /api/desk/reset`).
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

**Browse vs single:** `discovery.mode=browse` returns up to four options for desk pagination; `single` returns one recommendation.

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
| Abandon modal | `POST /api/payments/abandon` | Order/Payment cancelled, session restored, `CHECKOUT_ABANDONED` |
| Client success callback | `POST /api/payments/verify` | Signature check → `CAPTURED` / `PAID` or `PAYMENT_VERIFICATION_FAILED` |
| Simulate decline (demo) | `POST /api/payments/fail` | `FAILED` without treating client callback as truth |
| Webhook | `POST /api/webhooks/razorpay` | `payment.captured` / `payment.failed`, idempotent via `ProcessedWebhook` |

**Security:** Never trust client amount, price, discount, or payment status. Amounts are always derived from persisted cart or decision rows in paise.

Configure Razorpay Test Mode webhook:

```text
POST https://<your-host>/api/webhooks/razorpay
Events: payment.captured, payment.failed
```

For local webhooks, expose port 3010 with ngrok or similar and set `RAZORPAY_WEBHOOK_SECRET`.

---

## API overview

### Buyer / desk

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/sessions` | Create session + intent |
| POST | `/api/agent/run` | Server agent + decision persistence |
| GET/POST/PATCH/DELETE | `/api/cart` | Session cart lines |
| POST | `/api/checkout` | Cart or decision checkout |
| POST | `/api/payments/verify` | Razorpay signature verification |
| POST | `/api/payments/fail` | Record failure |
| POST | `/api/payments/abandon` | Abandoned checkout |
| POST | `/api/recovery/evaluate` | Pre-retry policy/catalog check |
| GET | `/api/desk/context` | Desk session snapshot |
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
| GET/POST | `/api/admin/products`, `/api/admin/products/[productId]` |
| GET/PUT | `/api/admin/policies` |
| GET/POST/DELETE | `/api/admin/staff` |

### Legacy / merchant

| Method | Path |
| --- | --- |
| GET/PUT | `/api/policies` | Staff-oriented; buyers redirected at UI |
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

Copy `.env.example` to `.env.local` (and `.env` for Prisma CLI).

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DEMO_MERCHANT_ID` | No | Default `northline-audio` |
| `RAZORPAY_KEY_ID` | For real checkout | Server Razorpay API |
| `RAZORPAY_KEY_SECRET` | For real checkout | Server only; never expose to client |
| `RAZORPAY_WEBHOOK_SECRET` | For webhooks | Webhook HMAC verification |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | For Checkout.js | Public key only |
| `GEMINI_API_KEY` | No | LLM intent extraction (server only) |
| `GEMINI_MODEL` | No | Default `gemini-3.6-flash` |
| `RAZORFLOW_SESSION_SECRET` | Production | Signed auth/session tokens |
| `SMTP_*`, `SMTP_FROM` | No | Real verification emails |
| `INITIAL_ADMIN_EMAIL` | No | Bootstrap administrator after verification |
| `RAZORFLOW_USE_DEV_EMAIL` | Test/E2E | Capture mail in dev outbox (`1`) |
| `PEFFLE_STORAGE` | No | Local SQLite ledger path (default `.peffle/ledger.db`, server-only) |
| `PEFFLE_POLICY` | No | Peffle execution policy JSON (default `peffle.policy.json`) |
| `PEFFLE_CHECKOUT_CAP_PAISE` | No | Optional override of the `checkout.create` daily cap (integer paise). Policy default is `1000000` (₹10,000 / UTC day). |

Without Razorpay keys, checkout returns a clear error; the UI does **not** fake payment success.

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

### 3. Environment

```bash
cp .env.example .env.local
cp .env.example .env
```

Peffle uses local SQLite at `.peffle/ledger.db` (gitignored). The demo execution cap is ₹10,000 per UTC day (`1000000` paise in `peffle.policy.json`). Override with `PEFFLE_CHECKOUT_CAP_PAISE`. Merchant offer policy remains in Postgres.

### 4. Migrate and seed

```bash
npm run db:migrate
npm run db:seed
```

### 5. Run

```bash
npm run dev
```

App URL: **http://localhost:3010**

### Email and admin bootstrap

For Gmail SMTP, use an [App Password](https://support.google.com/accounts/answer/185833) in `SMTP_PASSWORD`. Set `INITIAL_ADMIN_EMAIL` to the account that should become administrator after completing normal 6-digit email verification.

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
| `npm run redteam` | Scripted guarded/unguarded benchmark → `docs/redteam-results.md` |
| `npm run demo:seed` | Reset Peffle ledger, set 50000 paise discount cap, write `docs/demo-numbers.md` |
| `npm run preflight` | PASS/FAIL env, DB, Gemini, Razorpay Test keys, ledger, single-node |
| `npm run verify:clean` | Fresh clone → install → generate → test → build |

---

## Testing

```bash
npm test
npm run build
npm run test:e2e
```

- **Vitest:** 25+ integration test files against PostgreSQL (`tests/*.test.ts`). Uses the same `DATABASE_URL` as local dev.
- **Playwright:** Starts its own Next.js dev server on port **3011** with `RAZORFLOW_USE_DEV_EMAIL=1` and **without** `GEMINI_API_KEY` (deterministic intent in E2E). Includes journeys, cart, recovery, admin, auth, and payment boundary specs under `e2e/`.
- Stop any manual `npm run dev` on 3010 if Playwright reports a dev-server lock conflict.

Payment E2E reaches the Razorpay Checkout boundary when Test Mode keys are present; completing the external modal is manual. Without keys, tests assert graceful checkout failure (no fabricated capture).

---

## Project documentation

| File | Contents |
| --- | --- |
| `architecture.md` | Pipeline, intent layers, cart, Peffle checkout guard, payments, recovery |
| `DESIGN.md` | Visual identity and UI tokens |
| `decisions.md` | Architectural decision notes |
| `DEMO.md` | 60-second Peffle demo |
| `docs/redteam-results.md` | Scripted red-team counts (generated by `npm run redteam`) |

---

## Known limitations

- **Peffle is local/process-scoped.** The ledger is SQLite on disk (or `:memory:` in tests). Approval tokens are process-local and do not survive restart. Run as a **single Node server**, not serverless / multi-instance. This repo does not implement hosted or multi-instance enforcement.
- **Payments are Razorpay Test Mode.** Captures are real Test Mode API calls when keys are set; they are not production settlements. Refund HTTP is stubbed in E2E unless a real captured Razorpay payment id exists (`RAZORFLOW_STUB_RAZORPAY_REFUND=1`).
- **`npm run redteam` is scripted** with a deterministic planner unless a live Gemini probe succeeds. Counts in `docs/redteam-results.json` are exact for that run, not organic traffic.
- **Gemini status:** key and `gemini-3.6-flash` work; free-tier `generate_content` quota is 5 rpm and produces HTTP 429 (`RESOURCE_EXHAUSTED`). Chat retries with backoff then falls back. Do not claim Gemini planned a turn unless the row says `planner=gemini`.
- **Injection resistance is structural**, not model-level: there is no set-price tool. Gemini can still choose `apply_discount`; commerce/Peffle still gate money.

---

## Design principles

- **Original RazorFlow identity** — trust-first fintech UI; settlement teal accent; no generic AI-purple SaaS chrome
- **Server authority** — catalog, merchant policy, amounts, and capture state live in PostgreSQL; Peffle authorizes checkout execution immediately before Razorpay order creation
- **Auditable agent** — user-safe explanations only; no chain-of-thought in UI or audit payloads
- **Honest metrics** — GMV from verified captures only

Built for the Razorpay Buildathon: demonstrate governed agentic commerce, not a scripted chatbot.
