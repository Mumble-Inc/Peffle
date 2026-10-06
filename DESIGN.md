# Peffle design system

Single source of truth for the implemented visual foundation. Light theme is default; dark theme remains available via `html[data-theme="dark"]`.

**Identity:** trust-first merchant commerce agent. Quiet chrome, strong product visuals. Google Remix light palette with Remix `--primary` (#0C4186) for actions. Liquid glass only on the functional layer. Outfit typography stays Peffle-owned.

**Token file:** `src/app/peffle-tokens.css`  
**Global utilities:** `src/app/globals.css`  
**Layout shell:** `src/app/os-layout.css`  
**Components:** `src/components/ui/design-system.tsx`, `src/components/ui/settlement-primitives.tsx`

## Dials

| Surface | Variance | Motion | Density |
| --- | --- | --- | --- |
| Landing | 6 | 5 | 4 |
| Desk / Policies / Admin | 4 | 4 | 6 |

## Color (light default)

| Token | Value | Role |
| --- | --- | --- |
| Remix / Peffle | Light value | Role |
| --- | --- | --- |
| `--background` / `--rf-bg-primary` | `#FFFFFF` | Page ground |
| `--secondary` / `--rf-bg-secondary` | `#F8F9FA` | Secondary ground |
| `--sidebar-accent` / `--rf-bg-wash` | `#E8F0FE` | Cool atmosphere behind glass |
| `--foreground` / `--rf-ink` | `#1F1F1F` | Primary text |
| `--secondary-foreground` / `--rf-ink-soft` | `#3C4043` | Secondary text |
| `--muted-foreground` / `--rf-muted` | `#5F6368` | Meta text |
| `--primary` / `--rf-accent` | `#0C4186` | Primary actions (maps to Tailwind `accent`) |
| `--primary-foreground` / `--rf-on-accent` | `#FFFFFF` | Text on primary |
| `--destructive` / `--rf-danger`, `--rf-blocked` | `#D93025` | Error / gate block |
| `--border` / `--rf-line-strong` | `#BFC1C5` | Card borders |
| `--sidebar-border` / `--rf-line` | `#DADCE0` | Dividers |
| `--chart-1` … `--chart-5` | Google chart set | Data visualization only |

CSS `--accent` in Remix is transparent by design; do not use it for UI color. Dark palette: `html.dark` and `html[data-theme="dark"]` in `peffle-tokens.css`.

## Typography

Fonts: **Outfit** (UI), **IBM Plex Mono** (money, IDs, ledger). Phosphor Regular only.

Utility classes: `.rf-type-display-xl` through `.rf-type-meta`, `.rf-mono-value`.

| Role | Desktop (approx) | Mobile (approx) | Weight |
| --- | --- | --- | --- |
| display-xl | 120px | 52px | 500 |
| display | 72px | 40px | 500 |
| h1 | 56px | 36px | 600 |
| h2 | 40px | 28px | 600 |
| h3 | 28px | 22px | 600 |
| h4 | 20px | 18px | 600 |
| body-lg | 19px | 19px | 400 |
| body | 16px | 16px | 400 |
| ui | 14px | 14px | 500 |
| meta | 13px | 13px | 500 |

Minimum essential copy: 13px. Money uses tabular nums and `en-IN`.

## Spacing

Base unit 4px. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160 (`--rf-space-*`).

| Token | Value |
| --- | --- |
| `--rf-gutter-mobile` | 24px |
| `--rf-gutter-desktop` | 48px |
| `--rf-measure-prose` | 680px |
| `--rf-measure-content` | 1200px |
| `--rf-measure-wide` | 1360px |
| Section padding | 64–80px mobile, 112–160px desktop |

Minimum interactive target: 44×44px.

## Radius

| Token | Use |
| --- | --- |
| 6px (`--rf-radius-chip`) | Chips, inline code |
| 8px (`--rf-radius-control`) | Buttons, inputs, tabs |
| 12px (`--rf-radius-panel`) | Cards, tables, alerts |
| 16px (`--rf-radius-glass`) | Glass panels, dialogs |
| 24px (`--rf-radius-hero`) | Hero product stage |
| 999px (`--rf-radius-pill`) | Status pills |

## Shadows (tinted ink)

| Token | Use |
| --- | --- |
| `--rf-shadow-e0` | none |
| `--rf-shadow-e1` | buttons, subtle lift |
| `--rf-shadow-e2` | cards, glass L2 |
| `--rf-shadow-e3` | elevated glass, dialogs |
| `--rf-shadow-focus` | 2px white + 4px accent ring |

## Glass (first-class material)

Principles align with [Apple Materials HIG](https://developer.apple.com/design/human-interface-guidelines/materials) (translucency, hierarchy, legibility, context) — **Peffle does not clone Liquid Glass visuals**.

**Philosophy:** content is solid; controls may be glass. Glass separates an interactive layer from what is underneath. Use it when it communicates control, elevation, activity, context, or attention — not for fashion.

**Context:** place glass over meaningful backdrop (`.rf-env-atmosphere` / `.rf-env-wash` using `#E8F0FE` + `#F8F9FA`). Flat white + white glass without atmosphere reads flat.

| Level | Class | Use |
| --- | --- | --- |
| L0 | `.rf-surface-canvas` | Page and opaque content |
| L1 | `.rf-glass-l1` | Ambient veil (header fade) |
| L1 | `.rf-surface-section`, `.rf-surface-section-alt` | Structural bands |
| L2 | `.rf-glass`, `.rf-glass-l2` | Nav, tabs, tooltips |
| L3 | `.rf-glass-elevated`, `.rf-glass-l3`, `.rf-glass-hero` (24px) | Product stage, dialogs |
| L4 | `.rf-focus-surface`, `.rf-focus-l4` | Solid white + primary ring |
| Context | `.rf-env-wash`, `.rf-env-atmosphere` | Cool-blue field behind glass |

**L2 material:** `rgba(255,255,255,0.62)`, blur 20px, saturate 1.35, border `rgba(60,64,67,0.08)`, inset highlight + shadow stack.

**L3 material:** `rgba(255,255,255,0.78)`, blur 28px, saturate 1.4, border `rgba(60,64,67,0.12)`, hero radius 24px.

**Rules (12):** no glass-on-glass; content cards opaque `#FFFFFF` + `#BFC1C5` border; no decorative neon gradients; essential copy stays opaque; verify contrast on composited background; mobile avoids stacked L3 panels.

**React:** `GlassSurface` in `liquid-glass.tsx` with `level`, `purpose`, `data-rf-glass-level`. `SettlementGate` uses opaque L1 by default; `elevated` for focal gate (L3).

**Motion:** `.rf-glass-panel-enter` (320ms) for panel focus; disabled under `prefers-reduced-motion`. No continuous shimmer or pulse on glass.

**Fallbacks:** `prefers-reduced-transparency` → solid `#FFFFFF` (`--rf-bg-primary`); same rules when `html[data-a11y-reduced-transparency="true"]` (test hook); `prefers-contrast: more` → stronger glass borders (tokens).

**Quality test:** if removing blur, transparency, and shadow does not hurt hierarchy, glass is probably unnecessary.

**Audit:** `e2e/glass-audit.spec.ts` on `/design-system` Material tab.

## Motion

| Token | Duration |
| --- | --- |
| `--rf-duration-micro` | 120ms |
| `--rf-duration-ui` | 200ms |
| `--rf-duration-panel` | 320ms |
| `--rf-duration-settlement` | 520ms |

Easing: `--rf-ease-out` `cubic-bezier(0.2, 0, 0, 1)`, exit `--rf-ease-exit` `cubic-bezier(0.4, 0, 1, 1)`.

`prefers-reduced-motion`: no translate/pulse; instant state changes.

## Components

Shared primitives in `design-system.tsx`: Button, Input, Select, Badge, Surface, Panel, Dialog, Sheet, DataTable, Alert, Tabs, Tooltip, Toast.

**Buttons:** one primary per major view when possible; primary = `#0C4186`, 44px min height, 8px radius, e1 shadow; secondary = white + border; ghost = text-first; pressed scale 0.98.

**States:** default, hover, active, focus, disabled, loading, success, error — never color alone; use icon + text where needed.

**Signatures:** `SettlementLine`, `SettlementGate` in `settlement-primitives.tsx` (progress + guardrail block with Prohibit icon).

## Accessibility

- Text contrast target 4.5:1 (body), 3:1 large text and controls
- Visible focus rings (`--rf-shadow-focus`)
- 44px targets, keyboard operable tabs/tables
- `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast: more`
- Support 200% zoom and 320px width
- Blocked vs error distinguished by color, icon, and copy

## Validation

Component lab: `/design-system` (noindex). Playwright: `e2e/design-system.spec.ts`, `e2e/glass-audit.spec.ts` (1440, 768, 390).

## Next phase

Homepage-only pass: apply light composition, wash behind trace, Settlement Line/Gate in story — without changing this token layer ad hoc.
