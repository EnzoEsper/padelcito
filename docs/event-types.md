# Community event taxonomy

Padelcito community posts use a **type → subtype → divisions / scoring / tags** model validated against how padel events are advertised in Argentina (2026). Open matches stay in the **Matches** feature, not community posts. Posts are moderated announcements with WhatsApp contact—no in-app registration.

## Event types (MVP)

| Type | Intent | Subtypes |
| --- | --- | --- |
| **Tournament** | Compete in a bounded event | `elimination`, `groups_knockout`, `round_robin`, `americano`, `teams` |
| **Social** | Play many short games, socialize | `americano`, `mexicano`, `pozo`, `mixer` |
| **League** | Compete over weeks | `pairs`, `teams`, `ladder` |
| **Training** | Learn or improve | `clinic`, `group_class`, `camp`, `coach_course` |
| **Special event** | Experience around padel | `exhibition`, `festival`, `corporate`, `other` |

**Not subtypes:** Suma categories, mixto, and age brackets (+40, Sub-14) belong on **divisions**. Charity, express, and night events use **tags**.

## Divisions (0–12 per post)

Each division row:

- `gender`: `male`, `female`, `mixed`, `open`
- Category **range** (1–9, 1 = strongest) **or** `category_sum` (2–18), not both
- Optional `age_min` / `age_max` (e.g. 40 for +40, 14 for Sub-14)
- Optional `label` (e.g. "Beginners")

Stored in `community_post_divisions`; replaced atomically via `set_community_post_divisions`.

## Scoring (tournament, league, social only)

| Preset | Typical use in Argentina |
| --- | --- |
| `best_of_3_sets` | APA veteran categories, full sets |
| `two_sets_super_tiebreak` | APA amateur default; super TB to 10 |
| `one_set_6` | Short americano games |
| `one_set_9` | Group stage (e.g. Elevia: TB at 8–8) |
| `timed_or_points` | Social rotation formats |
| `other` | Requires `rules_note` (e.g. groups vs knockout differ) |

Also: `golden_point` (nullable bool), `guaranteed_matches` (1–10), `rules_note` (500 chars), up to **3 rules images** in bucket `community-posts/{author_id}/...`.

## Tags (up to 12, grouped in UI)

- **Included:** welcome_kit, tshirt, new_balls, hydration, fruit_snacks, food, drinks
- **Services:** physio, photographer, streaming, referee, buffet, indoor_courts
- **Prizes:** cash_prizes, product_prizes, trophies, raffles, ranking_points
- **Vibe:** third_time, music_dj, night, networking, charity, express, beginner_friendly, featured_pros, sponsors

## Other post fields

- `entry_fee` (ARS, 0 = free) + `fee_unit` (`per_player`, `per_pair`, `per_team`)
- `registration_deadline` (≤ `event_start` when both set)
- Common fields unchanged: title, description, flyer, location, schedule, contact snapshot

## Research notes (Argentina)

- **Zonas + llave** is the dominant tournament structure (FAP/APA/AVP).
- **Multi-division flyers** are standard (e.g. Elevia Open: many damas/caballeros bands).
- **3 partidos asegurados** is a common marketing line (KRÜ, Elevia).
- **Inclusions** on flyers: kit, remera, pelotas, hidratación, fruta, premios, sorteos, streaming (Cordillera Tour, KRÜ, Elevia).

Implementation: migrations `20261005230000`–`20261005250000`, client `src/features/community/`.

After applying migrations locally:

```bash
npx supabase gen types typescript --local > src/types/database.ts
```
