# Architecture Decision Log

One paragraph per pivot: what changed, why, and which migration(s) apply. Six-months-later-you is a different developer.

---

## Match host metadata and court configs (2026-06-16 — 2026-06-19)

The initial `matches` table only supported basic pickup-game fields (venue, time, capacity, skill range). Host-facing create flows needed padel-specific setup: multiple courts with per-court format/type/structure/surface, a padel category band, gender and difficulty preferences, side preference for open spots, and optional price/age filters.

Migrations `20260616120000_add_match_host_metadata`, `20260617120000_restrict_match_gender_difficulty`, `20260618120000_add_match_court_configs`, and `20260619120000_restrict_match_position_preference` added `court_count`, `court_configs` (jsonb), `category_min`/`category_max`, required `gender_preference` (`male` | `female` | `mixed` — `open` was removed), required `difficulty` (`friendly` | `competitive`), `position_preference` (replacing short-lived `positions_sought text[]`), and optional `price_per_player`, `age_min`, `age_max`. Court capacity is validated by DB helpers against the sum of per-court slots (singles = 2, doubles = 4), not a fixed `court_count * 4` rule. Client types live in `CreateMatchInput` (`src/features/matches/use-matches.ts`) and court helpers in `src/lib/padel-court.ts`.
