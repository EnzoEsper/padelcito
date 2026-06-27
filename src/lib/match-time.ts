/** Match clock times always use 24-hour format (padel / club scheduling convention). */
export const MATCH_TIME_FORMAT_OPTIONS = {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
} as const satisfies Intl.DateTimeFormatOptions;

const MATCH_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, MATCH_TIME_FORMAT_OPTIONS);

export function formatMatchTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return MATCH_TIME_FORMATTER.format(date);
}

function sameCalendarDate(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function formatRelativeDayLabel(
  date: Date,
  now: Date,
  weekday: 'long' | 'short' = 'long',
): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (sameCalendarDate(date, now)) return 'Today';
  if (sameCalendarDate(date, tomorrow)) return 'Tomorrow';
  return new Intl.DateTimeFormat(undefined, { weekday }).format(date);
}

export function formatDiscoverMatchWhen(startsAt: string): { day: string; time: string } {
  const date = new Date(startsAt);
  const now = new Date();
  return {
    day: formatRelativeDayLabel(date, now, 'short'),
    time: formatMatchTime(date),
  };
}

/** Compact 24h window for list cards, e.g. "19:30 – 21:00". */
export function formatMatchTimeRange(startsAt: string, durationMinutes: number): string {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${formatMatchTime(start)} – ${formatMatchTime(end)}`;
}

/** e.g. "Today, 19:30 – 21:30" or cross-midnight "Today, 23:00 – Tomorrow, 01:00". */
export function formatMatchScheduleLabel(startsAt: string, durationMinutes: number): string {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const now = new Date();

  const dayLabel = formatRelativeDayLabel(start, now, 'long');
  const startTime = formatMatchTime(start);
  const endTime = formatMatchTime(end);

  if (sameCalendarDate(start, end)) {
    return `${dayLabel}, ${startTime} – ${endTime}`;
  }

  const endDayLabel = formatRelativeDayLabel(end, now, 'long');
  return `${dayLabel}, ${startTime} – ${endDayLabel}, ${endTime}`;
}

export function formatMatchListDateTime(startsAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    ...MATCH_TIME_FORMAT_OPTIONS,
  }).format(new Date(startsAt));
}
