---
version: alpha
name: Void Eclipse
description: Premium dark-mode-first design system for a competitive Padel sports mobile application. Built on a three-color primary palette extended with derived surfaces, a highlight blue, and two semantic status colors.
colors:
  background: "#0B0B0B"
  surface-1: "#141417"
  surface-2: "#1B1C21"
  surface-3: "#232429"
  primary: "#2B396D"
  primary-hi: "#5E70B8"
  neutral: "#E4E4E4"
  success: "#5BE0A6"
  warning: "#E0B15B"
typography:
  h1:
    fontFamily: Hanken Grotesk
    fontSize: 1.875rem
    fontWeight: 800
    letterSpacing: -0.05em
  h2:
    fontFamily: Hanken Grotesk
    fontSize: 1.5625rem
    fontWeight: 800
    letterSpacing: -0.04em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 1rem
    fontWeight: 500
    lineHeight: 1.5
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 0.9375rem
    fontWeight: 500
    lineHeight: 1.45
  label-caps:
    fontFamily: Space Mono
    fontSize: 0.6875rem
    fontWeight: 700
    letterSpacing: 0.13em
  score:
    fontFamily: Space Mono
    fontSize: 1.1875rem
    fontWeight: 700
    letterSpacing: -0.02em
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 22px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    height: 56px
    padding: 16px
  button-primary-pressed:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.lg}"
    height: 56px
    padding: 16px
  button-accepted:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.background}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    height: 56px
    padding: 16px
  button-disabled:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.lg}"
    height: 56px
    padding: 16px
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.neutral}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.lg}"
    padding: 16px
  match-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.2xl}"
    padding: 18px
  match-card-full:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.2xl}"
    padding: 18px
  nav-tab-active:
    textColor: "{colors.neutral}"
    backgroundColor: "{colors.background}"
  nav-tab-inactive:
    textColor: "{colors.neutral}"
    backgroundColor: "{colors.background}"
  bracket-cell:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: 8px
  bracket-cell-active:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: 8px
  score-label:
    textColor: "{colors.neutral}"
    typography: "{typography.score}"
  skill-badge-a:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.sm}"
    padding: 8px
  skill-badge-b:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.neutral}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.sm}"
    padding: 8px
  skill-badge-c:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.neutral}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.sm}"
    padding: 8px
  stat-box:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.lg}"
    padding: 14px
  host-note:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.lg}"
    padding: 16px
  bracket-spotlight:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.xl}"
    padding: 18px
  live-indicator:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.success}"
    rounded: "{rounded.sm}"
    padding: 8px
  penalty-notice:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.warning}"
    rounded: "{rounded.md}"
    padding: 14px
  score-pill-live:
    backgroundColor: "{colors.primary-hi}"
    textColor: "{colors.background}"
    typography: "{typography.score}"
    rounded: "{rounded.sm}"
    padding: 8px
---

## Overview

Void Eclipse is a matte, sport-focused dark UI built on three primary pigments — a near-black void, a deep navy blue, and a cool silver — extended with derived elevation surfaces, a brightened interactive blue, and two semantic status colors. The aesthetic is flat and tool-first: no gradients on surfaces, no drop shadows with tints, no decorative chrome.

Two typefaces handle all text. **Hanken Grotesk** is the proportional voice for headings, body, and buttons. **Space Mono** is the monospace voice for all numeric data, distances, badges, and metadata labels — it reads like a precision instrument at any size.

## Colors

### Primary palette — the three fixed pigments

- **Background (`#0B0B0B` — Void Eclipse):** The deepest layer. Use it for the root screen background, the status bar, and as the base behind all elevated surfaces. Never use it as a text or icon color.

- **Primary (`#2B396D` — Abyss Blue):** The action color. Apply it to filled CTA button backgrounds, active navigation indicators, selected filter chips, tournament bracket accent lines on decided matches, and skill-level A badges. Use as a 30 % opacity overlay on any tappable surface during the pressed state. Do not apply it as a text color on any background — it fails WCAG AA contrast at all sizes.

- **Neutral (`#E4E4E4` — Silver Mist):** The sole text and icon color. Use at full opacity for primary text, card titles, score labels, and button labels. Use at opacity levels for hierarchy, with WCAG 2.1 contrast ratios against Background (`#0B0B0B`) noted:
  - `dim` (60 %) → blended ~`#8D8D8D` → **5.9:1** ✓ WCAG AA for all text sizes. Use for secondary metadata: stat labels, section headers, usernames, ring labels, screen-title caps.
  - `faint` (38 %) → blended ~`#5D5D5D` → **3.0:1** — fails WCAG AA for normal text (< 4.5:1). Acceptable only for purely **decorative, non-informational** elements (inactive icon strokes, skill-D badge text). This is an intentional design exception; see the note on `score-pill-live` below.
  - `ghost` (20 %) → blended ~`#360` → **1.6:1** — fails all WCAG text thresholds. Use only for **decorative placeholder outlines** (empty avatar rings, dashed spot indicators) that are never the sole conveyance of information.
  - `hair` (10 %) for card border hairlines; `hair2` (5.5 %) for inner row dividers.

### Derived surfaces — elevation through layering

Surfaces are near-black mixes derived from Background and Primary. They must not be used as text or accent colors.

- **Surface-1 (`#141417`):** Default card and panel background. Match cards, roster panels, stat boxes, control bars, and filter chip containers all sit on this surface.
- **Surface-2 (`#1B1C21`):** Elevated panel — the bracket spotlight card and live-match detail drawer.
- **Surface-3 (`#232429`):** Recessed chip and badge background. Used for skill-level C/D badge fills and tertiary filter chips.

### Extended tokens

- **Primary-Hi (`#5E70B8`):** A brighter blue derived from Primary (lerp toward `#7488D8` at 0.7 intensity). Use it for the active win-side indicator bar in brackets, connector lines on decided matches, trust-score ring strokes, avatar ring glows, and the live-score pill background. It is never used as a fill for interactive buttons — that role belongs to Primary.

- **Success (`#5BE0A6`):** Semantic green for positive-outcome states only: the LIVE tournament dot, the match-confirmed checkmark, and the pulsing "request sent" indicator. Do not use it as a general accent.

- **Warning (`#E0B15B`):** Semantic amber for late-cancellation penalty notices and trust-score degradation alerts only. Do not use it as a general accent.

## Typography

Two typefaces; no others.

- `h1` — Screen titles (Discover, Brackets, Profile). Hanken Grotesk 800, tight tracking. ~30 px rendered.
- `h2` — Card and modal primary titles (club name in detail view, tournament name). Hanken Grotesk 800.
- `body-md` — General text, player bios, host notes, button labels. Hanken Grotesk 500.
- `body-sm` — Secondary metadata rows: date/time, duration, surface type, spot-count labels. Hanken Grotesk 500.
- `label-caps` — All `Space Mono` uppercase labels: section headers ("OPEN NEARBY", "ROSTER"), distance readouts ("1.4KM"), player-fill counts ("3/4"), badge text ("A · PRO"), and filter chip labels. Always uppercase. Wide tracking.
- `score` — Live and final scores in bracket cells; the current game score pill. Space Mono 700. Sized to read at arm's length.

All font sizes are `rem` relative to a 16 px root. Never hard-code `px` for text — reference the tokens so accessibility scaling is respected.

## Layout

All spacing derives from a base unit of **8 px**:

| Token | Value | Typical use |
|-------|-------|-------------|
| `xs` | 4 px | Platform hit-target correction only; never for visual rhythm |
| `sm` | 8 px | Inline icon gap, badge padding, bracket-cell inner gap |
| `md` | 16 px | Button padding, list item vertical rhythm |
| `lg` | 24 px | Section gap, modal content margin |
| `xl` | 32 px | Screen horizontal padding |
| `2xl` | 48 px | Section header vertical margin |
| `3xl` | 64 px | Hero area height, bracket row height |

**Screen horizontal margin** is `xl` (32 px in token; rendered at 20 px in the reference prototype — agent implementations may use either, but must be consistent). **Card inner padding** is 18 px (between `md` and `lg`). **Card-to-card gap** is `md` (16 px).

**Border-radius scale:** `sm` (8 px) for badges and chips; `md` (12 px) for buttons and filter chips; `lg` (16 px) for stat boxes and small panels; `xl` (20 px) for the radius slider card and medium panels; `2xl` (22 px) for primary match cards and large cards; `full` (9999 px) for pill shapes and avatar rings.

## Elevation & Depth

All surfaces are **flat** — no gradients on fills, no colored drop shadows. Depth is communicated by surface stacking: Background → Surface-1 → Surface-2 → Surface-3. Card edges are defined by a 1 px `hair`-opacity (Neutral at 10 %) hairline border, never by shadow.

State changes elevate a component's border, not its shadow: an active bracket cell or a full match card transitions its border from `hair` to Primary (`#2B396D`, 1.5 px → 2 px). A live bracket cell adds a `blueTint` (Primary-Hi at 10–20 % opacity) outer ring to indicate real-time activity without adding a colored shadow.

The one permitted depth shortcut is a background-color `linear-gradient` from `transparent` to Background used exclusively on sticky footer overlays (the action button container on the detail screen), to mask scroll content beneath the CTA.

## Components

### Buttons

`button-primary` (Primary fill, Neutral text, `rounded.lg`, 56 px height) is the sole filled CTA. On press it scales to 97 % over 120 ms (ease) and applies an `android_ripple` in Primary. The glow box-shadow (`0 8px 24px` Primary-Hi at ~50 % opacity) is permitted on this button only.

`button-primary-pressed` — identical tokens to `button-primary`; the visual change is the scale transform and opacity reduction to 0.97, not a token swap.

`button-accepted` — renders after a join request is confirmed. Inverts to Neutral fill with Background text. Use for the "Message group on WhatsApp" CTA. The label above it ("YOU'RE IN — ROSTER CONFIRMED") uses `label-caps` in Success color.

`button-disabled` — Surface-1 fill, Neutral text at `faint` (38 %) opacity. Used for "Match is full · Join waitlist" and the "Request sent · awaiting host" pending state. The pending state adds a pulsing Primary-Hi dot to the left of the label.

`button-ghost` — text-only, transparent fill. Never add a border. Used for "Keep Reservation" and other low-priority destructive-cancel alternatives.

### Match Card

`match-card` sits on Surface-1. It contains: a left-edge 3 px skill-accent bar (Primary-Hi for A, Primary for B, Surface-3 for C/D); the club name in `h2`; date/time in `body-sm`; a distance chip (Surface-3 background, `label-caps`); a stacked player-avatar row with dashed placeholder circles for open spots; a `FillMeter` dot row; and a `skill-badge-*` in the trailing position.

`match-card-full` — identical surface tokens. Adds a 2 px Primary border (animated from 0 → 2 px over 300 ms ease-in-out) and replaces the player-count label with a "FULL" `label-caps` tag.

### Navigation Tabs

`nav-tab-active` and `nav-tab-inactive` both use Neutral text for the label (WCAG AA compliance). The selected state is communicated solely by: (a) a 2 px Primary underline indicator bar that slides horizontally with a shared-element translate over 250 ms (ease-in-out), and (b) a Primary icon tint (applied as `color` on the SVG, not as `textColor`). Inactive icons render at Neutral `faint` (38 %) opacity.

### Tournament Bracket

`bracket-cell` renders on Surface-1. Team names use `body-sm`. Set scores use `score` (Space Mono). The winning team's row shows a 3 × 18 px Primary-Hi vertical bar on the left edge. Connector lines between decided matches use Primary-Hi at 2 px stroke; undecided connectors use `hair` at 1.5 px.

`bracket-cell-active` (live match) adds a `blueTint` outer ring (`box-shadow: 0 0 0 3px`) and a `glow` shadow (`0 0 20px` Primary-Hi at ~50 % opacity). The LIVE label uses `label-caps` in Success color with a 6 px pulsing Success dot.

The live game score is displayed in a Primary-Hi fill pill with Background text (`score` typography). On each point change it plays a `pd-score-flip` keyframe animation (scale pop, ~300 ms).

### Skill Badges

Four tiers, each using `label-caps` (Space Mono) text:

- `skill-badge-a` — Primary fill, Neutral text. ("A · PRO")
- `skill-badge-b` — Surface-3 fill, Neutral text. In implementation, the fill is replaced with a `rgba(68,88,166,0.18)` translucent Primary tint over the card surface — this produces a subtly blue-tinted background without a solid swatch. ("B · ADV")
- `skill-badge-c` — Surface-3 fill, Neutral at 60 % opacity text. ("C · INT")
- `skill-badge-d` — Surface-3 fill, Neutral at 38 % opacity text. ("D · BEG")

`skill-badge-a` and `skill-badge-b` are the only interactive-feeling tiers. C and D are intentionally muted to reflect lower activity/competitive stakes.

### Bracket Spotlight & Live Indicator

`bracket-spotlight` is the selected-match detail panel pinned to the bottom of the Brackets screen. It sits on Surface-2 with a Primary border when the match is live (`1.5 px Primary + glow shadow`), or a `hair`-opacity hairline when the match is done or upcoming. It displays round name, team names, set scores, and — when live — the current game score inside a Primary-Hi fill pill (`score` typography, Background text).

`live-indicator` is the LIVE label + pulsing dot used in both the bracket-cell status strip and the tournament header. It uses Success color for the dot (`6 px circle, pd-pulse animation`) and Success `label-caps` text. The outer container uses a `rgba(91,224,166,0.10)` tint fill with a 35 %-opacity Success border.

`penalty-notice` is the late-cancellation warning banner shown in the match detail screen after a player joins. It uses a Warning-tinted background fill (`rgba(224,177,91,0.08)`), a 30 %-opacity Warning border, a Warning bell icon, and Warning-tinted body text. It appears with a `pd-fade-up` animation after the accepted state is confirmed.

### Stat Box & Host Note

`stat-box` (Surface-1, `rounded.lg`, 14 px padding) displays a `label-caps` header, a large numeric value (`score` or `h2` typography), and an optional `label-caps` unit suffix. Used in a horizontal 3-up row on the match detail screen (Duration / Surface / Per Player).

`host-note` uses a Primary fill panel (blueTint opacity in implementation, `colors.primary` in token for agent reference) with a Primary-Hi `label-caps` label and Neutral body text. Agents should render this as a tinted panel, not a solid Primary block — use 8–10 % Primary opacity for the background fill and a 1 px Primary border.

## Do's and Don'ts

**Do:**
- Use Surface-1 as the background for all cards and list items; reserve Background for the screen root.
- Use Primary-Hi for win indicators, connector lines, and trust rings — not for buttons.
- Use Success and Warning colors only for their named semantic roles (accepted state, live indicators, penalty notices).
- Render all data labels, distances, scores, and section headers in `Space Mono` (`label-caps` or `score`).
- Express inactive states as Neutral opacity reductions (`faint` 38 %) rather than color changes.
- Animate state changes (press scale, border width, opacity cross-fade) — never swap tokens statically.

**Don't:**
- Use Primary as a text color on any background — it fails WCAG AA contrast.
- Apply gradient fills to cards, buttons, or surfaces (the sticky footer gradient from `transparent` to Background is the sole exception).
- Use drop shadows with colored tints; shadows must be `rgba(0,0,0,X)` only.
- Use Background (`#0B0B0B`) as the `backgroundColor` for cards — use Surface-1.
- Hard-code `px` font sizes in component code — reference the `typography` tokens.
- Introduce any color other than the nine defined tokens and their opacity variants.
- Use `faint` (38 %) as a text color for any label that conveys information — use `dim` (60 %) or higher. `faint` is reserved for decorative non-text elements only (see Neutral opacity tier table above).
- Combine `fontFamily: 'Space Mono'` with `fontWeight: '700'` in React Native — custom font bold variants must be referenced by their registered name (`'SpaceMono-Bold'`), as React Native does not synthesize bold from a single font file.

> **Note on `score-pill-live` contrast:** The live game-score pill (`primary-hi` fill, `background` text, ~4.2:1 contrast ratio) falls marginally short of the WCAG AA 4.5:1 threshold for normal text. This is an intentional design decision: the pill is a transient UI accent — not a persistent readable label — and it pairs with a high-contrast score value immediately adjacent. Agents implementing this component must accept the linter's contrast warning for this token pair.
