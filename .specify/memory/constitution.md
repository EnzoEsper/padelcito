# Padelcito SDD Constitution

This is the concise working constitution for incremental Spec-Driven Development in the existing Padelcito repository. It does not supersede project documentation. When a summary here and a canonical source disagree, stop and resolve the conflict rather than inventing a rule.

## Product and architecture baseline

- Preserve the shipped product and architecture. `ai-architecture-context.md` is the project-declared immutable baseline for AI-assisted code changes; `ARCHITECTURE.md` explains domain and data design. Neither is a request to rebuild or re-document the app.
- The current client is a padel-only React Native app on Expo SDK 56, React Native 0.85, TypeScript strict mode, Expo Router file-based routes, NativeWind, and pnpm. Confirm exact installed/configured versions in `package.json` and app config before proposing version-sensitive changes.
- The current source layout is `app/` routes and layouts, `src/features/<domain>/` feature modules, `src/components/` shared UI, and `src/lib/` cross-cutting client utilities. Follow nearby code; do not enforce a new layering scheme.
- Supabase PostgreSQL is the backend and business-rule source of truth. Schema changes belong in new `supabase/migrations/`; RLS is mandatory. `src/types/database.ts` is generated and must not be hand-edited. Edge Functions currently exist for `places-search` and `push` as documented integration proxies; do not broaden that exception by assumption.
- Expo Router owns navigation. TanStack Query owns server state and is configured with persistence; inspect existing cache keys, invalidation, realtime, and persistence behavior before changing data flows. No separate global client state library is evident; treat any broader claim as unverified until needed.
- Respect the existing English codebase, pnpm-only commands, Expo SDK 56 versioned API requirement, padel sport resolver, security/privacy boundaries, and feature-specific rules in `AGENTS.md` and `ai-architecture-context.md`.

## Change and evidence principles

- Specify only the next feature or a material cross-cutting change. Do not generate retrospective specs for the existing app.
- Requirements describe observable user outcomes and behavior, including empty, loading, error, authorization, lifecycle, and offline/realtime states where relevant. Separate confirmed facts from assumptions and open questions.
- The plan names the actual routes, feature modules, migrations, docs, and checks expected to change. It must identify security, migration, generated-type, notification/realtime, privacy, native-build, and rollout implications when relevant. Do not assume they apply when they do not.
- Tasks are ordered, small, and traceable to acceptance criteria. Avoid unrelated refactors and do not silently change existing behavior beyond agreed scope.
- Verify with scripts and manual checks that actually exist and are relevant. Record command outcomes; distinguish automated checks from device, hosted Supabase, and EAS checks. Do not claim a CI workflow exists unless one is found in the repository.
- Update `docs/decisions.md` for a durable architectural or product pivot, and update the relevant existing guide/checklist when its operational contract changes. Keep specs as feature-scoped change records, not a second architecture encyclopedia.

## Canonical references

- AI constraints and detailed app/backend contracts: [`../../ai-architecture-context.md`](../../ai-architecture-context.md), [`../../AGENTS.md`](../../AGENTS.md), [`../../CLAUDE.md`](../../CLAUDE.md), and [`../../.cursorrules`](../../.cursorrules).
- Domain architecture and current product/design truth: [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md), [`../../DESIGN.md`](../../DESIGN.md), [`../../docs/decisions.md`](../../docs/decisions.md), and `docs/m*-control-checklist.md`.
- Operational guides: `docs/places-setup.md`, `docs/push-setup.md`, `docs/store-readiness-checklist.md`, `docs/legal/`, and `docs/padel-categories.md`.
- Database truth: ordered SQL files in `supabase/migrations/`; generated client types in `src/types/database.ts`.
- Executable project contracts: `package.json`, `app.json`, `app.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `jest.config.js`, `eas.json`, and `supabase/config.toml`.

## Known gaps and uncertainty

- There is no root README, no existing `.specify/` workflow, and no checked-in `.github` CI workflow in the inspected repository.
- Jest is configured and at least one focused match lifecycle test exists; broad feature coverage and an end-to-end Maestro suite were not established by the repository inventory. `.maestro/` exists but appeared empty.
- There is no evidenced standalone app-wide client state store. Local React state/context exists; verify a specific feature rather than assuming a global-state pattern.
- `ARCHITECTURE.md` contains roadmap and data-domain material beyond current client routes. Confirm implementation status in current code, migrations, and handoff docs before treating roadmap items as shipped.
