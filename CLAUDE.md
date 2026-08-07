# Claude AI Context & Instructions

Read `@AGENTS.md` and `ai-architecture-context.md` before proceeding.

## Maps, Places & Discover

- Location/Places rules: `ai-architecture-context.md` §12; setup guide: `docs/places-setup.md`.
- Discover map (M4 shipped): `ai-architecture-context.md` §13; handoff checklist: `docs/m4-control-checklist.md`.

## Claude-Specific Database Workflow

1. **Migrations First:** If asked to modify the database schema, ALWAYS write a new Supabase migration (`supabase migration new <name>`). Do not provide raw SQL to run in a UI.
2. **Type Syncing:** Immediately after writing a migration, you MUST remind the developer to run `npx supabase gen types typescript --local > src/types/database.ts`.
3. **Read-Only States:** Remind the developer that `tournament_standings` and profile aggregates (`rating_avg`, `rating_count`, `reliability_score`, `penalty_count`, `commitment_count`) are trigger-maintained. Never attempt to write to them from the client code.
