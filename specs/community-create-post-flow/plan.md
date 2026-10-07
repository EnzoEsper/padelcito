# Plan: Create post flow v2

## Phase 1 — Data & taxonomy

1. Migration: rename `groups_knockout` → `traditional`, add `suma`.
2. Migration: `subtype_note`, remap legacy subtypes, update allowed matrix and triggers/RPC.

## Phase 2 — Client taxonomy & validation

1. Update `post-display.ts` labels, descriptions, `SUBTYPES_BY_TYPE`.
2. `create-post-validation.ts` + form hook (`subtypeNote`, nullable initial subtype).

## Phase 3 — Routes & UI

1. `create-post/` stack + `CreatePostFormProvider`.
2. Type step, details step (grouped sections), review step + preview extraction.
3. Payload: `subtypeNote` on insert; divisions RPC for tournament/league always.

## Phase 4 — Docs & verify

1. Update `docs/event-types.md`.
2. Tests and manual checklist.
