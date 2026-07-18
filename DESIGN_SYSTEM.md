# MediQueue Design System — Reference

This documents what's actually implemented in `tokens.css` / `foundation.css`
(most of it already existed and is solid), plus the patterns established in
this landing-page pass, so later pages (dashboard, admin, kiosk, display,
track, login) can be redesigned against the same system instead of
reinventing values page by page.

## Color

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#14508c` | Brand, primary actions, links |
| `--color-accent` | `#0c8599` | "Live" states only — don't use for general accents |
| `--color-success` | `#12805c` | Confirmations, trust icons |
| `--color-warning` | `#b25e09` | Non-blocking warnings |
| `--color-danger` / `--color-emergency` | `#c0342c` | Emergency, destructive actions |
| `--color-ink` / `--color-text` | `#101828` | Primary text |
| `--color-ink-soft` / `--color-text-secondary` | `#475467` | Secondary text |
| `--color-ink-faint` / `--color-text-faint` | `#98a2b3` | Placeholder, captions |
| `--color-bg` | `#f6f7f9` | Page background |
| `--color-surface` | `#ffffff` | Cards |
| `--color-border` | `#e2e5ea` | Hairline borders |

Full dark-theme equivalents already exist under `[data-theme='dark']` —
reuse them rather than adding new dark-mode colors.

**Rule:** one primary, one accent (reserved for "live"), three semantic
colors (success/warning/danger). No new hues without a documented reason.

## Typography

Single family: Inter, loaded at weights 400/500/600/700(/800 for landing
hero only). Scale is `--text-xs` (12px) through `--text-5xl` (48px) —
see `tokens.css`. Numeric values (token numbers, KPIs, counters) get the
`.num` utility class for tabular figures, not a different font.

## Spacing

8px grid: `--space-1` (4px) → `--space-8` (64px). Every margin/padding/gap
in new work should resolve to one of these — no arbitrary pixel values.

## Radius

- `--radius-sm` (6px): buttons, inputs, small icon badges
- `--radius-md` (10px): cards, feature tiles
- `--radius-lg` (14px): section-level containers (stats strip, mockup,
  live-board panel)
- `--radius-full`: pills/badges/circular icon buttons only

No radius above 14px anywhere except explicit pill shapes.

## Shadows

Four functional tiers, each used for exactly one purpose:
`--shadow-xs` (inline controls) → `--shadow-sm` (resting cards) →
`--shadow-md` (raised/hover) → `--shadow-lg` (overlays, and — new in this
pass — the hero dashboard mockup, since it's meant to visually "lift" off
the page as the hero's focal object).

## Icons

Single hand-drawn line set in `js/icons.js`, 24×24, 1.75px stroke,
`currentColor`. Added in this pass: `shield`, `lock`, `chevronDown`.
Keep every new icon at the same stroke width and viewBox — mixing icon
sets is one of the fastest ways to look unpolished.

## Buttons

`.btn` + modifier: `--primary` / `--secondary` / `--ghost` / `--danger`,
sizes `--sm` / default / `--lg`. All defined in `foundation.css` — reuse
these classes everywhere rather than styling one-off buttons per page.

## Cards

`.card` / `.card__header` / `.card__body` for the general case. Page-
specific card variants (`.feature-card`, `.trust-card`, `.mockup`,
`.live-board__card`) follow the same border/radius/shadow language but
add their own internal layout — that's the correct pattern: compose from
tokens, don't reinvent the surface.

## Forms

`.field` / `.field__label` pattern already defined in `foundation.css`
and used consistently on check-in/login — not touched in this pass.

## Tables & Charts

The admin analytics panel already has a working pattern
(`.analytics__bars`, `.analytics__bar-row`, `.analytics__bar-fill`) —
plain CSS bar charts, no charting library. **Keep this approach** for any
future chart work; it's lightweight, on-brand, and matches the "no fancy
effects over readability" rule better than pulling in Chart.js/Recharts
for what are essentially bar comparisons. If a genuinely complex chart is
ever needed (multi-series trends), that's the point to introduce a real
charting library — not before.

Tables don't have a dedicated component yet. When one is needed
(admin token history, staff list): reuse `--color-border` for row
dividers, `--color-surface-sunken` for header row background, `.num`
for any numeric column, and `--radius-md` on the containing card — not
on the table itself.

## Motion

- **Landing page only:** `.aurora` ambient background (this pass) — three
  blurred, low-opacity (0.10–0.16) blobs drifting on 46–64s loops. Nothing
  else in the app loops indefinitely.
- **Staff login:** same idea, much more subdued — not yet built (next
  approved step).
- **All authenticated pages** (dashboard, admin, doctor, tracking,
  queue/display): **static backgrounds only.** Motion budget there goes
  to: state transitions (queue position changing, token called), hover/
  focus feedback, loading states, and success confirmations — never
  ambient/decorative motion.
- **`[data-reveal]`** (new in this pass, landing only): one-shot fade-up
  on scroll via `IntersectionObserver`, 500ms, `translateY(10px)→0`.
  Never loops, never re-triggers, and is fully disabled under
  `prefers-reduced-motion` (handled globally in `tokens.css`, which zeroes
  all animation/transition durations — this file's `[data-reveal]` rule
  additionally sets `opacity: 1` outright so content isn't left invisible
  if a browser only partially honors the global rule).
- Every animation in the codebase must degrade gracefully under
  `prefers-reduced-motion: reduce`. The global rule in `tokens.css`
  already enforces this for standard `animation`/`transition` properties;
  anything added later that manipulates `transform`/`opacity` via JS
  (like the reveal observer) needs its own explicit check, as done in
  `landing.js`.

## What's intentionally *not* used anywhere in this system

Per project rules: gradients as backgrounds (except the one approved
aurora use), glassmorphism beyond a light `backdrop-filter` on the sticky
nav, neon/saturated colors, radius above 14px on rectangular surfaces,
illustrated/cartoon icons, ambient motion on authenticated pages, and
any chart/table library heavier than the existing CSS-bar pattern
warrants.
