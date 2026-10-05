---
format: 1920x1080
duration: 42s
message: "The agent decides. Peffle controls execution."
arc: Future Pacing
audience: Razorpay Buildathon judges and technical founders
mode: autonomous
music: none
captions: skipped (narrator explains; on-screen type is the product)
---

## Video direction

Palette from `frame.md`: canvas cream `#0C1116`, ink `#ECEAE4`, voltage coral `#2A9D96` (settlement teal, scarce), success tile-strong `#3DBA78` only on ALLOWED, danger `#E0564F` only on BLOCKED/KILLED. Display Outfit 400 sentence case. Mono IBM Plex Mono for IDs, budgets, stamps, counters. No AI purple, no neon bloom, no Geist, no em dashes in UI chrome.

Motion grammar: long-tail `power3` eases; overlay-paced reveals (on-screen type is the VO); freeze is a weapon on the Guard beat. Hold Frame 3 after BLOCKED and Frame 6 lockup. Subtle jitter only on the red-team counter. Caption keep-out: top 83%. Idle budget: stillness over breathing camera.

Never: floating brains, robots, generic SOC maps, fake payment-gateway chrome, invented dashboard widgets, crypto terminals, slideshow (front-load then freeze), screensaver (everything floating independently).

Held frames: Frame 3 (hero freeze), Frame 6 (lockup).

---

## Frame 1 — Who controls

- status: animated
- duration: 5s
- poster: 2.4s
- transition_in: cut
- type: hook
- beat: tension
- blueprint: typewriter-reveal (Adapt)
- voiceover: "AI agents can call real tools. Peffle decides what they may execute."
- scene: Black field, a caret types the two-line question
- asset_candidates: screenshots/scroll-000.png — first viewport of the desk
- focal: screenshots/scroll-000.png
- roles: screenshots/scroll-000.png = background (dim 0% until hard cut)
- sfx: whoosh-short at 4.4s desk punch
- src: compositions/frames/01-who-controls.html

Hook. Authority question before any product chrome.

Adapt: keep the live caret + character-by-character type-on signature; drop the collapse-to-logo spring-pop. Resolve by a hard cut into the captured desk instead of a brand lockup.

Scene 1 (0.0–2.2s): solid canvas field; a 2px ink caret seats center-left; types “AI agents can act.” Display type, sentence case. Centered, ~50% of frame. Hold. Nothing else.
Scene 2 (2.2–4.4s): beat of stillness; second line types “But who controls what they’re allowed to do?” Same lockup, slightly smaller. Centered, two-line stack. No ornaments.
Scene 3 (4.4–5.0s): hard cut — desk screenshot punches in full-bleed, dim ~20%. Signature: live caret then hard cut.

---

## Frame 2 — Intent to action

- status: animated
- duration: 7s
- poster: 3.5s
- transition_in: cut
- type: feature_showcase
- beat: autonomy
- blueprint: prompt-type-submit-generate (Adapt)
- voiceover: "A buyer wants headphones under 7,500 rupees. Peffle finds Halo ANC in policy and writes the cart."
- scene: Real desk command bar receives the intent; catalog and cart move; overlay INTENT → DISCOVERY → ACTION
- asset_candidates: screenshots/full-page.png — full desk; screenshots/scroll-000.png — viewport; halo-anc.png — Halo ANC product photo
- focal: screenshots/full-page.png
- roles: screenshots/full-page.png = background · screenshots/scroll-000.png = supporting · halo-anc.png = cutout
- sfx: typing 0.1s; pop at 2.3s; click at 4.55s
- src: compositions/frames/02-intent-action.html

Show the real Peffle desk. Do not paint a second search bar on the live command field. Buyer intent types as a large editorial card over the hero. Then the Halo card is selected in place, a discovery lockup states why, and the cart line docks on the right rail.

Adapt: type-submit-generate. Machine answer is catalog highlight + discovery reason + cart, not a fake autocomplete.

Scene 1 (0.0–2.2s): full-bleed captured desk, dimmed. Editorial card types “Find me the best headphones under ₹7,500.” Pipeline: INTENT.
Scene 2 (2.2–4.6s): prompt clears. search_products ALLOWED. Teal hairline on Halo ANC. Discovery lockup: name, ₹7,490, under ceiling / in policy. Pipeline: DISCOVERY.
Scene 3 (4.6–7.0s): cart line docks on the actual rail. Pipeline: ACTION. Hold.

---

## Frame 3 — Guard block

- status: animated
- duration: 8s
- poster: 5s
- transition_in: cut
- type: benefit_highlight
- beat: authority
- blueprint: compose
- voiceover: "The agent tries a 20 percent discount. Authority and budget exceeded. Peffle blocks it. Nothing executes."
- scene: Freeze. Compact Peffle Guard panel. BLOCKED. AGENT REQUEST → PEFFLE → BLOCK
- asset_candidates: screenshots/full-page.png — full desk
- focal: screenshots/full-page.png
- roles: screenshots/full-page.png = background (freeze)
- sfx: typing 0.05s; error plus bass hit at 2.15s freeze
- src: compositions/frames/03-guard-block.html

Hero moment. Merchant policy ceiling + Peffle budget — the offer does not execute. Compact panel, not a SOC overlay.

Compose: freeze as the weapon; compact Guard card; pipeline strip. No catalog block matched a freeze-then-stamp hero.

Scene 1 (0.0–1.6s): same desk world; chat/composer types “Apply 20% discount.” Camera locked. Centered on the composer region.
Scene 2 (1.6–2.2s): freeze the UI (no camera, no jitter) — one extra window of stillness.
Scene 3 (2.2–5.4s): compact Guard card springs from the rail: kicker PEFFLE GUARD, DISCOUNT REQUEST, AUTHORITY: EXCEEDED, BUDGET: EXCEEDED, stamp BLOCKED in danger. Centered overlay, ~40% of frame. Teal hairline, no glow.
Scene 4 (5.4–8.0s): pipeline strip AGENT REQUEST → PEFFLE → BLOCK. Held read. Signature: freeze then stamp.

---

## Frame 4 — Red team

- status: animated
- duration: 8s
- poster: 4s
- transition_in: cut
- type: social_proof
- beat: scale
- blueprint: grid-card-assemble (Adapt)
- voiceover: "These controls sit on every tool call. Spend limit, approval, kill switch, audit. 50 executed, 150 blocked."
- scene: Control labels assemble; attempt counter 17→200; 50 EXECUTED / 150 BLOCKED as a labeled red-team demo
- asset_candidates: screenshots/full-page.png — full desk
- focal: screenshots/full-page.png
- roles: screenshots/full-page.png = background (dim 45%)
- sfx: clicks 0.15–1.35s; bass hit at 5.4s
- src: compositions/frames/04-red-team.html

Controlled red-team demonstration, never live production stats. Labels match real Peffle controls.

Adapt: keep staggered cascade into a 2×2 grid; add count-up as the live-populate coda, not a second blueprint.

Scene 1 (0.0–2.4s): dim desk; four mono cards cascade: SPEND LIMIT, APPROVAL, KILL SWITCH, AUDIT TRAIL. 2×2 grid, 3 depth layers.
Scene 2 (2.4–5.4s): attempt counter count-up 17 → 48 → 103 → 200 in mono tabular. Signature: staggered assemble + count-up.
Scene 3 (5.4–8.0s): two tall figures land: 50 EXECUTED / 150 BLOCKED. Tiny kicker: CONTROLLED RED-TEAM DEMO. Hold.

---

## Frame 5 — Kill switch

- status: animated
- duration: 8s
- poster: 4.5s
- transition_in: cut
- type: feature_showcase
- beat: stop
- blueprint: compose
- voiceover: "Kill switch. The agent is killed. The audit trail keeps every blocked call for the merchant."
- scene: Guard shows AGENT STATUS KILLED; three BLOCKED stamps; audit rows of what happened
- asset_candidates: screenshots/full-page.png — full desk
- focal: screenshots/full-page.png
- roles: screenshots/full-page.png = background (dim 50%)
- sfx: bass hit at 0.08s; clicks at 2.45 / 3.15 / 3.85s
- src: compositions/frames/05-kill-switch.html

Kill is Peffle, not a payment decline.

Compose: sequential stamps then audit list. No single blueprint covers kill-then-audit.

Scene 1 (0.0–2.4s): Guard panel: PEFFLE GUARD / AGENT STATUS / KILLED. Centered, ~45%.
Scene 2 (2.4–5.0s): three BLOCKED stamps stack rapidly, same type treatment as Frame 3.
Scene 3 (5.0–8.0s): audit list in mono (search_products ALLOWED, apply_discount BLOCKED, checkout.create BLOCKED, AGENT_KILLED). Hold.

---

## Frame 6 — Lockup

- status: animated
- duration: 6s
- poster: 3.5s
- transition_in: cut
- type: branding
- beat: thesis
- blueprint: logo-assemble-lockup (Adapt)
- voiceover: "The agent makes the decision. Peffle controls the execution."
- scene: Dark pull-back. Two-line thesis. PEFFLE wordmark. Execution control for AI agents. Final line.
- asset_candidates: screenshots/scroll-000.png — first viewport of the desk
- focal: screenshots/scroll-000.png
- roles: screenshots/scroll-000.png = background (fade to black)
- sfx: whoosh-short at 0.05s; bass hit at 3.8s lockup
- src: compositions/frames/06-lockup.html

Close on the category claim, not a checkout CTA.

Adapt: keep text-clears then mark-blooms lockup signature; desk fades to canvas first; teal only on the word Peffle in line two.

Scene 1 (0.0–2.2s): desk pulls back / fades; “The agent makes the decision.” Display type, centered.
Scene 2 (2.2–3.8s): “Peffle controls the execution.” Voltage on the word Peffle only.
Scene 3 (3.8–6.0s): lockup PEFFLE; subline Execution control for AI agents.; small line AI can act. Authority should be enforced. Signature: wordmark assemble then hold.
