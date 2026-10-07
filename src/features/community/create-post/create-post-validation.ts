import {
  DATE_OPTIONAL_TYPES,
  DIVISION_REQUIRED_TYPES,
  isSubtypeAllowed,
  scoringAllowedForType,
  type CommunityPostDivisionInput,
  type CommunityPostScoringFormat,
  type CommunityPostSubtype,
  type CommunityPostType,
} from '@/features/community/post-display';
import {
  buildOrganizerContactsFromDrafts,
  type OrganizerContactDraft,
} from '@/features/community/create-post/create-post-organizers';
import type { Coords } from '@/lib/location';

export type CreatePostValidationSection =
  | 'type'
  | 'basics'
  | 'schedule'
  | 'categories'
  | 'rules'
  | 'price'
  | 'organizers';

export type CreatePostValidationField =
  | 'subtype'
  | 'subtypeNote'
  | 'title'
  | 'location'
  | 'eventStart'
  | 'divisions'
  | 'scoring'
  | 'rulesNote'
  | 'entryFee'
  | 'registrationDeadline'
  | 'contacts'
  | 'description'
  | 'tags';

export type CreatePostValidationInput = {
  type: CommunityPostType;
  subtype: CommunityPostSubtype | null;
  subtypeNote: string;
  title: string;
  description: string;
  coords: Coords | null;
  hasEventDate: boolean;
  datePart: Date;
  timePart: Date;
  hasEventEnd: boolean;
  endDatePart: Date;
  endTimePart: Date;
  divisions: CommunityPostDivisionInput[];
  scoringFormat: CommunityPostScoringFormat | null;
  rulesNote: string;
  entryFeeText: string;
  hasRegistrationDeadline: boolean;
  registrationDatePart: Date;
  registrationTimePart: Date;
  contacts: OrganizerContactDraft[];
  tags: readonly string[];
};

export type CreatePostValidationSuccess = { ok: true };

export type CreatePostValidationFailure = {
  ok: false;
  field: CreatePostValidationField;
  section: CreatePostValidationSection;
  message: string;
};

export type CreatePostValidationResult =
  | CreatePostValidationSuccess
  | CreatePostValidationFailure;

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

export function validateCreatePostForm(
  input: CreatePostValidationInput,
  options?: { step?: 'type' | 'details' | 'publish' },
): CreatePostValidationResult {
  const step = options?.step ?? 'publish';

  if (input.subtype === null) {
    return {
      ok: false,
      field: 'subtype',
      section: 'type',
      message: 'Pick a format for this event.',
    };
  }

  if (!isSubtypeAllowed(input.type, input.subtype)) {
    return {
      ok: false,
      field: 'subtype',
      section: 'type',
      message: 'Pick a format that matches the event type.',
    };
  }

  const trimmedNote = input.subtypeNote.trim();
  if (input.subtype === 'other') {
    if (trimmedNote.length === 0) {
      return {
        ok: false,
        field: 'subtypeNote',
        section: 'type',
        message: 'Describe the format when using Other.',
      };
    }
    if (trimmedNote.length > 60) {
      return {
        ok: false,
        field: 'subtypeNote',
        section: 'type',
        message: 'Format description cannot exceed 60 characters.',
      };
    }
  } else if (trimmedNote.length > 0) {
    return {
      ok: false,
      field: 'subtypeNote',
      section: 'type',
      message: 'Format description is only used with Other.',
    };
  }

  if (step === 'type') {
    return { ok: true };
  }

  const trimmedTitle = input.title.trim();
  if (trimmedTitle.length < 3) {
    return {
      ok: false,
      field: 'title',
      section: 'basics',
      message: 'Add a title of at least 3 characters.',
    };
  }
  if (trimmedTitle.length > 120) {
    return {
      ok: false,
      field: 'title',
      section: 'basics',
      message: 'Title cannot exceed 120 characters.',
    };
  }

  if (input.coords === null) {
    return {
      ok: false,
      field: 'location',
      section: 'schedule',
      message: 'Pick a location so players can find this event.',
    };
  }

  const dateOptional = DATE_OPTIONAL_TYPES.includes(input.type);
  let eventStart: Date | null = null;
  let eventEnd: Date | null = null;

  if (!dateOptional && !input.hasEventDate) {
    return {
      ok: false,
      field: 'eventStart',
      section: 'schedule',
      message: 'Set a date and time for this event.',
    };
  }

  if (input.hasEventDate) {
    const startDate = combineDateAndTime(input.datePart, input.timePart);
    if (startDate.getTime() <= Date.now()) {
      return {
        ok: false,
        field: 'eventStart',
        section: 'schedule',
        message: 'Pick a future event start date and time.',
      };
    }
    eventStart = startDate;

    if (input.hasEventEnd) {
      const endDate = combineDateAndTime(input.endDatePart, input.endTimePart);
      if (endDate.getTime() <= startDate.getTime()) {
        return {
          ok: false,
          field: 'eventStart',
          section: 'schedule',
          message: 'Event end must be after the start time.',
        };
      }
      eventEnd = endDate;
    }
  }

  if (DIVISION_REQUIRED_TYPES.includes(input.type) && input.divisions.length < 1) {
    return {
      ok: false,
      field: 'divisions',
      section: 'categories',
      message: 'Add at least one category for this event type.',
    };
  }

  if (input.divisions.length > 12) {
    return {
      ok: false,
      field: 'divisions',
      section: 'categories',
      message: 'At most 12 categories are allowed.',
    };
  }

  const trimmedDescription = input.description.trim();
  if (trimmedDescription.length > 2000) {
    return {
      ok: false,
      field: 'description',
      section: 'basics',
      message: 'Description cannot exceed 2000 characters.',
    };
  }

  if (input.tags.length > 12) {
    return {
      ok: false,
      field: 'tags',
      section: 'basics',
      message: 'At most 12 tags are allowed.',
    };
  }

  const allowsScoring = scoringAllowedForType(input.type);
  const trimmedRulesNote = input.rulesNote.trim();
  if (!allowsScoring && input.scoringFormat !== null) {
    return {
      ok: false,
      field: 'scoring',
      section: 'rules',
      message: 'Scoring is not available for this event type.',
    };
  }
  if (allowsScoring && input.scoringFormat === 'other' && trimmedRulesNote.length === 0) {
    return {
      ok: false,
      field: 'rulesNote',
      section: 'rules',
      message: 'Describe the rules when using the Other scoring format.',
    };
  }
  if (trimmedRulesNote.length > 500) {
    return {
      ok: false,
      field: 'rulesNote',
      section: 'rules',
      message: 'Rules note cannot exceed 500 characters.',
    };
  }

  const entryFee = parseEntryFee(input.entryFeeText);
  if (input.entryFeeText.trim().length > 0 && entryFee === null) {
    return {
      ok: false,
      field: 'entryFee',
      section: 'price',
      message: 'Enter a valid entry fee or leave it empty.',
    };
  }

  if (input.hasRegistrationDeadline) {
    const deadline = combineDateAndTime(input.registrationDatePart, input.registrationTimePart);
    if (eventStart !== null && deadline.getTime() > eventStart.getTime()) {
      return {
        ok: false,
        field: 'registrationDeadline',
        section: 'price',
        message: 'Registration deadline must be on or before the event start.',
      };
    }
  }

  const contactResult = buildOrganizerContactsFromDrafts(input.contacts);
  if (!contactResult.ok) {
    return {
      ok: false,
      field: 'contacts',
      section: 'organizers',
      message: contactResult.message,
    };
  }

  void eventEnd;

  return { ok: true };
}
