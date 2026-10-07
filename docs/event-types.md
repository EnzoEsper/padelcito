# Community event taxonomy

Padelcito community posts use a **type → format (subtype) → categories / scoring / tags** model aligned with how padel events are advertised in Argentina. Open matches stay in **Matches**, not community posts. Posts are moderated announcements with WhatsApp contact—no in-app registration.

## Event types (MVP)

| Type | Intent | Formats (subtype) |
| --- | --- | --- |
| **Tournament** | Compete for a title in a one-off event | `traditional`, `teams`, `americano`, `other` |
| **Social** | Play many games and meet people | `americano`, `mexicano`, `pozo`, `mixer`, `other` |
| **League** | Compete over several weeks | `pairs`, `teams`, `ladder`, `other` |
| **Training** | Learn or improve | `clinic`, `group_class`, `camp`, `coach_course`, `other` |
| **Special event** | Something different around padel | `festival`, `exhibition`, `corporate`, `other` |

**Legacy enum values** (`elimination`, `groups_knockout`, `round_robin`, `suma`) remain in Postgres for old rows; create-post UI does not offer them. `groups_knockout` was renamed to **`traditional`**.

**Other format:** requires `subtype_note` (1–60 chars) describing the custom format.

**Not formats:** **Sum (Suma)** is chosen per **category row** (category band), not as a tournament format. Mixto and age brackets live on **categories**. Charity, express, night, etc. use **tags**.

## Required fields (create-post)

| Type | Date | Categories |
| --- | --- | --- |
| Tournament | Required | ≥ 1 |
| League | Required | ≥ 1 |
| Social | Required | Optional (empty → “All levels”) |
| Training | Optional | Optional |
| Special event | Required | Optional |

Always: type, format (+ note if Other), title, location, organizer WhatsApp.

## Categories (0–12 per post)

Each category row:

- `gender`: `male`, `female`, `mixed`, `open`
- Category **range** (1–9) **or** `category_sum` (2–18), not both
- Optional `age_min` / `age_max`
- Optional `label`

Stored in `community_post_divisions`; replaced atomically via `set_community_post_divisions`. Tournament/league posts require ≥ 1 category. Use **Sum** on a category row when that band is sum-limited (e.g. Sum 13).

## Scoring (tournament, league, social only)

| Preset | Typical use in Argentina |
| --- | --- |
| `best_of_3_sets` | APA veteran categories, full sets |
| `two_sets_super_tiebreak` | APA amateur default; super TB to 10 |
| `one_set_6` | Short americano games |
| `one_set_9` | Group stage (e.g. Elevia: TB at 8–8) |
| `timed_or_points` | Social rotation formats |
| `other` | Requires `rules_note` |

Also: `golden_point`, `guaranteed_matches` (1–10), `rules_note` (500 chars), up to **3 rules images**.

## Tags (up to 12, grouped in UI)

Unchanged from prior doc — welcome kit, services, prizes, vibe groups.

## Migrations

- `20261007100000_community_event_formats_enum.sql` — `traditional`, `suma`
- `20261007110000_community_event_formats_rules.sql` — `subtype_note`, validation, division RPC

After applying locally:

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

Implementation: client `src/features/community/`, routes `app/(app)/create-post/`.
