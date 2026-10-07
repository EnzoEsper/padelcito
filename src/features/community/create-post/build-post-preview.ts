import type { PostSummary } from '@/features/community/use-posts';
import type { CreatePostFormState } from '@/features/community/create-post/use-create-post-form';
import type { Database } from '@/types/database';

type PublicProfileRow = Database['public']['Views']['public_profiles']['Row'];

function combineDateAndTime(datePart: Date, timePart: Date): Date {
  const combined = new Date(datePart);
  combined.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return combined;
}

function parseEntryFee(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 0) return null;
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function buildPreviewPostSummary(
  form: CreatePostFormState,
  author: PublicProfileRow | null,
): PostSummary {
  let eventStart: string | null = null;
  let eventEnd: string | null = null;

  if (form.hasEventDate) {
    eventStart = combineDateAndTime(form.datePart, form.timePart).toISOString();
    if (form.hasEventEnd) {
      eventEnd = combineDateAndTime(form.endDatePart, form.endTimePart).toISOString();
    }
  }

  const entryFee = parseEntryFee(form.entryFeeText);
  const subtypeNote =
    form.subtype === 'other' && form.subtypeNote.trim().length > 0
      ? form.subtypeNote.trim()
      : null;

  const divisions = form.divisions.map((division, index) => ({
    id: `preview-${index}`,
    post_id: 'preview',
    position: index,
    gender: division.gender,
    category_min: division.category_min,
    category_max: division.category_max,
    category_sum: division.category_sum,
    age_min: division.age_min,
    age_max: division.age_max,
    label: division.label,
  }));

  return {
    id: 'preview',
    author_id: author?.id ?? '',
    contact_phone: null,
    contact_verified_at: null,
    created_at: new Date().toISOString(),
    description: form.description.trim().length > 0 ? form.description.trim() : null,
    details: {},
    entry_fee: entryFee,
    event_end: eventEnd,
    event_start: eventStart,
    fee_unit: entryFee !== null ? form.feeUnit : null,
    formatted_address: form.formattedAddress,
    golden_point: form.goldenPoint,
    guaranteed_matches: form.guaranteedMatches,
    image_path: null,
    location: null,
    published_at: null,
    registration_deadline: form.hasRegistrationDeadline
      ? combineDateAndTime(form.registrationDatePart, form.registrationTimePart).toISOString()
      : null,
    rejection_reason: null,
    report_count: 0,
    reviewed_at: null,
    reviewed_by: null,
    rules_image_paths: [],
    rules_note: form.rulesNote.trim().length > 0 ? form.rulesNote.trim() : null,
    scoring_format: form.scoringFormat,
    sport_id: '',
    status: 'pending_review',
    subtype: form.subtype,
    subtype_note: subtypeNote,
    tags: form.tags,
    title: form.title.trim().length > 0 ? form.title.trim() : 'Untitled event',
    type: form.type,
    updated_at: new Date().toISOString(),
    venue_name: form.venueName.trim().length > 0 ? form.venueName.trim() : null,
    author,
    sport: null,
    divisions,
    contacts: [],
  };
}
