# AI Agents Global Instructions

## 🏆 The Prime Directive

The immutable baseline for this project is `ai-architecture-context.md`. **You must read and internalize `ai-architecture-context.md` before generating or modifying any code.** Deviations from those rules are regressions.

## 🚨 Expo SDK 56 (CRITICAL)

**Expo HAS CHANGED.** You must read the exact versioned docs at `https://docs.expo.dev/versions/v56.0.0/` before writing any frontend code. Do not hallucinate deprecated React Native or Expo Router APIs.

## 🛑 Guardrails & Limitations

1. **No Autonomous Destructive Commands:** Do not autonomously execute `pnpm install`, `supabase db reset`, or `git reset`. Provide the exact commands in markdown blocks for the human developer to run.
2. **Package Manager:** `pnpm` is the ONLY acceptable package manager. Do not generate `npm install` or `yarn add` commands.
3. **No Custom Backends:** Do not generate Express, NestJS, or any custom Node.js backend code. All backend logic is handled natively in PostgreSQL via Supabase (RPCs, Triggers, RLS).

## 🏗️ Architectural Reminders

- **Data Fetching:** Use TanStack Query.
- **Padel-only MVP:** Client flows manage padel matches only — use `PADEL_SPORT_SLUG` / `fetchPadelSport()` from `src/lib/padel-sport.ts`.
- **Security:** RLS is mandatory on every table. Cross-table checks go through `SECURITY DEFINER` helper functions.
- **TypeScript:** Strict mode is on. No `any`. No non-null assertions (`!`).
- **Maps & Places:** Read `docs/places-setup.md`. Edge Functions `places-search` and `push` are the only allowed custom backend surfaces (Google Places key proxy; Expo push delivery proxy). Discover map reads coords from `nearby_matches` — never call Places on Discover. Push setup: `docs/push-setup.md`.

## Incremental Spec-Driven Development

This repository adopts SDD incrementally for new user-facing features and changes with meaningful product, data, security, or cross-screen impact. Do not backfill specifications for existing app areas.

- Read `.specify/memory/constitution.md` and the relevant existing sources it links to before proposing a feature. `ai-architecture-context.md` remains the canonical baseline; this Constitution indexes and operationalizes that baseline rather than replacing or copying it.
- Keep each feature's working artifacts together in `specs/<feature-slug>/`: `spec.md`, `plan.md`, and `tasks.md`, using `.specify/templates/`. Do not create or update a feature spec for unrelated maintenance unless it materially changes a product or system contract.
- Follow **Specify → Clarify → Plan → Tasks → Implement → Verify/Converge**. Record user outcomes and acceptance criteria first; resolve material ambiguity before committing to a plan; plan against the current code and existing docs; make tasks small and verifiable; implement only within the agreed scope; then record verification evidence, deviations, and any durable decisions.
- Preserve existing conventions and the architecture documented in `ai-architecture-context.md`, `ARCHITECTURE.md`, `docs/decisions.md`, `DESIGN.md`, setup guides, control checklists, migrations, and code. Link to those sources instead of duplicating them. Update a canonical doc only when the feature changes a durable contract.
- Use the project's existing checks: `pnpm typecheck`, `pnpm lint`, and `pnpm test`, selecting relevant checks for the change and recording any not run. There is currently no checked-in GitHub Actions workflow; do not imply CI ran. Manual, device, Supabase, and EAS checks must be called out when applicable.
- Never treat an artifact's presence as approval to expand scope. Follow the user's authorization and existing guardrails before changing functional code, data, configuration, or running destructive commands.
