export const QUALITY_REASON_TAGS = [
  'Great level',
  'Good vibe',
  'Punctual',
  'Fair play',
  'Would play again',
] as const;

export type QualityReasonTag = (typeof QUALITY_REASON_TAGS)[number];

export const RATING_WINDOW_DAYS = 14;

export type RatingScreenCopy = {
  screenTitle: string;
  subtitle: string;
  submitLabel: string;
  skipLabel: string;
  doneLabel: string;
  starsLabel: string;
  tagsLabel: string;
  commentLabel: string;
  commentPlaceholder: string;
  successTitle: string;
  successMessage: string;
};

export const RATING_SCREEN_COPY: RatingScreenCopy = {
  screenTitle: 'Rate your match',
  subtitle: 'Optional quality ratings help players find good matches. Only averages are public.',
  submitLabel: 'Submit ratings',
  skipLabel: 'Not now',
  doneLabel: 'All ratings submitted',
  starsLabel: 'Stars',
  tagsLabel: 'Highlights',
  commentLabel: 'Comment (optional)',
  commentPlaceholder: 'Anything else worth noting?',
  successTitle: 'Thanks for rating',
  successMessage: 'Your feedback helps the community play better matches.',
};

export function buildRateMatchRoute(matchId: string): string {
  const search = new URLSearchParams({ matchId });
  return `/(app)/rate-match?${search.toString()}`;
}

export function toggleQualityTag(selected: string[], tag: string): string[] {
  return selected.includes(tag) ? selected.filter((item) => item !== tag) : [...selected, tag];
}

export function formatStarLabel(stars: number): string {
  return `${stars} star${stars === 1 ? '' : 's'}`;
}
