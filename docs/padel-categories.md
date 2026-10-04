# Padel categories (1st–9th)

Padelcito uses the Argentine-style **category scale** where **1st is the strongest** and **9th is the weakest**.

## Tiers (UI grouping)

| Tier | Categories | Purpose |
| --- | --- | --- |
| Beginner | 9th, 8th, 7th | New and developing players |
| Intermediate | 6th, 5th, 4th | Club and competitive club play |
| Expert | 3rd, 2nd, 1st | High competitive and pro tournament levels |

## Data model

- **`profile_sports.padel_category`** (1–9): source of truth for a player’s self-reported category.
- **`profile_sports.skill_level`** (enum): derived automatically by trigger `profile_sports_sync_skill_level` for legacy match filters (`skill_min` / `skill_max` on `matches`).
- **`matches.category_max` / `category_min`**: accepted category band when hosting (lower number = stronger). Valid range **1–9**.

## Client modules

- Constants, labels, descriptions, and range math: [`src/lib/padel-category.ts`](../src/lib/padel-category.ts)
- Onboarding & edit profile picker: [`src/features/profile/padel-category-field.tsx`](../src/features/profile/padel-category-field.tsx)
- Create-match range picker (compact 1–9 row): [`src/features/matches/create-match/components/category-range-picker.tsx`](../src/features/matches/create-match/components/category-range-picker.tsx)

## Migrations

- `20260922150000_padel_nine_categories.sql` — extends match categories to 9, adds `padel_category` on `profile_sports`, backfill, and sync trigger.

After applying migrations locally, regenerate types:

```bash
npx supabase gen types typescript --local > src/types/database.ts
```
