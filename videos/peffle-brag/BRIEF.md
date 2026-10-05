---
workflow: product-launch-video
flow: automation
storyboard: no
message: "The agent decides. Peffle controls execution."
destination: youtube
aspect: 1920x1080
language: en
audience: Razorpay Buildathon judges and technical founders
length: 42s
angle: authority
narration: no
VO_MODE: verbatim
style_preset: code-editorial
---

## Intent

Cinematic 35–45s product brag for Peffle: an execution-control layer that sits between an AI agent and tools with real-world side effects. Premium startup launch film mixed with a technical product demo. Confident, minimal, dark, sharp, futuristic. Not a payment gateway, not an AI model, not fraud detection, not generic cybersecurity.

Tone: confident, technical, slightly intimidating. Make the viewer think these people actually built this.

## Assets

- http://localhost:3015/desk — live Northline Audio commerce workspace (command bar, catalog, context rail, Peffle Guard)
- http://localhost:3015/ — landing
- http://localhost:3015/admin — Peffle control plane when reachable
- public/products/halo-anc.png — real catalog photography

## Customizations

- Feature captured Peffle screens as the UI; do not invent dashboard features.
- Overlay copy is verbatim from the brief (see Notes).
- Red-team attempt counts (17 → 200, 50 executed / 150 blocked) are a controlled demonstration, never live production stats.
- Restrained settlement teal accent (Peffle brand), not AI purple or excessive neon.
- Realistic cursor interactions; freeze on the Guard block as the hero beat.

## Notes

- Stated: 16:9 cinematic, 35–45s, dark premium, no floating brains/robots/neon slop.
- Inferred: YouTube/website destination → 1920x1080; `/brag` + complete shot list → automation, storyboard no (autonomous).
- Inferred: Outfit + IBM Plex Mono, teal `#0B5F5A` from DESIGN.md rather than generic blue.
- Scene copy (verbatim):
  - “AI agents can act.” / “But who controls what they’re allowed to do?”
  - Intent: “Find me the best headphones under ₹7,500.” Overlay: INTENT → DISCOVERY → ACTION
  - “Apply 20% discount.” Guard: PEFFLE GUARD / DISCOUNT REQUEST / AUTHORITY: EXCEEDED / BUDGET: EXCEEDED / BLOCKED. AGENT REQUEST → PEFFLE → BLOCK
  - Montage labels: SPEND LIMIT, APPROVAL, KILL SWITCH, AUDIT TRAIL. Attempts 17 → 48 → 103 → 200. 50 EXECUTED / 150 BLOCKED (red-team demo)
  - Kill: AGENT STATUS KILLED then BLOCKED ×3 then audit trail
  - Close: “The agent makes the decision.” / “Peffle controls the execution.” / PEFFLE / Execution control for AI agents. / AI can act. Authority should be enforced.
- Do not portray Peffle as a payment gateway.
- HeyGen unsigned; local Kokoro/MusicGen deps missing at setup. Prefer on-screen type as the voice; add Kokoro VO if install succeeds.
