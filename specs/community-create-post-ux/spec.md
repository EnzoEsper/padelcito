# Feature specification: Create post progressive disclosure

- **Status:** Implementing
- **Related:** [`create-post-form.tsx`](../../src/features/community/create-post/create-post-form.tsx)

## Outcome

Authors can publish with minimal fields (flyer optional, title, location, schedule, type defaults, organizer contact) while optional metadata stays in collapsed panels.

## Acceptance criteria

- [ ] Flyer and title appear before optional event metadata.
- [ ] Event details and Format & rules panels default collapsed with summary subtitles.
- [ ] Organizer block collapses when only the author number is prefilled.
- [ ] Validation errors in collapsed sections auto-expand the relevant panel.
- [ ] No change to required fields or database contracts.
