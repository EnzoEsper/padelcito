import {
  FEE_UNIT_LABELS,
  POST_SUBTYPE_LABELS,
  POST_TAG_LABELS,
  SCORING_FORMAT_LABELS,
  scoringAllowedForType,
  type CommunityPostScoringFormat,
  type CommunityPostSubtype,
  type CommunityPostTag,
  type CommunityPostType,
} from '@/features/community/post-display';
import type { OrganizerContactDraft } from '@/features/community/create-post/use-create-post-form';

export type CreatePostCollapsiblePanel = 'details' | 'rules' | 'organizers';

export type OptionalSectionsSummaryInput = {
  description: string;
  divisionsCount: number;
  entryFeeText: string;
  feeUnit: keyof typeof FEE_UNIT_LABELS;
  hasRegistrationDeadline: boolean;
  tags: CommunityPostTag[];
  scoringFormat: CommunityPostScoringFormat | null;
  type: CommunityPostType;
  rulesNote: string;
};

function formatFeeSummary(entryFeeText: string, feeUnit: keyof typeof FEE_UNIT_LABELS): string | null {
  const digits = entryFeeText.trim().replace(/\D/g, '');
  if (digits.length === 0) return null;
  const unit = FEE_UNIT_LABELS[feeUnit].toLowerCase();
  return `$${Number.parseInt(digits, 10).toLocaleString('es-AR')} / ${unit}`;
}

export function summarizeEventDetailsPanel(input: OptionalSectionsSummaryInput): string {
  const parts: string[] = [];
  if (input.description.trim().length > 0) {
    parts.push('Description');
  }
  if (input.divisionsCount > 0) {
    parts.push(
      input.divisionsCount === 1 ? '1 division' : `${input.divisionsCount} divisions`,
    );
  }
  const fee = formatFeeSummary(input.entryFeeText, input.feeUnit);
  if (fee !== null) {
    parts.push(fee);
  }
  if (input.hasRegistrationDeadline) {
    parts.push('Registration deadline');
  }
  if (input.tags.length > 0) {
    parts.push(
      input.tags.length === 1
        ? POST_TAG_LABELS[input.tags[0]]
        : `${input.tags.length} inclusions`,
    );
  }
  if (parts.length === 0) {
    return 'Description, divisions, fee, inclusions…';
  }
  return parts.join(' · ');
}

export function summarizeFormatRulesPanel(input: OptionalSectionsSummaryInput): string {
  if (!scoringAllowedForType(input.type)) {
    return 'Not applicable for this event type';
  }
  if (input.scoringFormat === null) {
    return 'Not set';
  }
  const preset = SCORING_FORMAT_LABELS[input.scoringFormat];
  if (input.rulesNote.trim().length > 0) {
    return `${preset} · custom note`;
  }
  return preset;
}

export function summarizeOrganizersPanel(
  contacts: OrganizerContactDraft[],
  authorOnly: boolean,
): string {
  if (contacts.length === 0) {
    return 'Add at least one WhatsApp number';
  }
  if (authorOnly && contacts.length === 1) {
    return 'Main: your WhatsApp';
  }
  const main = contacts[0];
  const mainLabel =
    main.label.trim().length > 0
      ? main.label.trim()
      : main.isAuthorSlot
        ? 'Your WhatsApp'
        : 'Main organizer';
  if (contacts.length === 1) {
    return `Main: ${mainLabel}`;
  }
  return `Main: ${mainLabel} · +${contacts.length - 1} more`;
}

export function mapPublishValidationToPanel(message: string): CreatePostCollapsiblePanel | null {
  const lower = message.toLowerCase();
  if (
    lower.includes('rules') ||
    lower.includes('scoring') ||
    lower.includes('other scoring')
  ) {
    return 'rules';
  }
  if (
    lower.includes('organizer') ||
    lower.includes('whatsapp number') ||
    lower.includes('organizer numbers')
  ) {
    return 'organizers';
  }
  if (
    lower.includes('division') ||
    lower.includes('description') ||
    lower.includes('tag') ||
    lower.includes('entry fee') ||
    lower.includes('registration deadline')
  ) {
    return 'details';
  }
  return null;
}

export function formatTypeSubtypeLine(
  type: CommunityPostType,
  subtype: CommunityPostSubtype,
  typeLabel: string,
): string {
  return `${typeLabel} · ${POST_SUBTYPE_LABELS[subtype]}`;
}
