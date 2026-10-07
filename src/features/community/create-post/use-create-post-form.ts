import { useCallback, useState } from 'react';
import type { Database } from '@/types/database';
import type { Coords } from '@/lib/location';
import type { CreatePostInput, RulesImageUpload } from '@/features/community/use-posts';
import {
  DEFAULT_SUBTYPE_BY_TYPE,
  SUBTYPES_BY_TYPE,
  isSubtypeAllowed,
  scoringAllowedForType,
  type CommunityPostContactInput,
  type CommunityPostDivisionInput,
  type CommunityPostTag,
} from '@/features/community/post-display';
import { parseArgentinaWhatsAppToE164 } from '@/lib/argentina-whatsapp-phone';

type CommunityPostType = Database['public']['Enums']['community_post_type'];
type CommunityPostSubtype = Database['public']['Enums']['community_post_subtype'];
type CommunityPostScoringFormat = Database['public']['Enums']['community_post_scoring_format'];
type CommunityPostFeeUnit = Database['public']['Enums']['community_post_fee_unit'];

export type RulesImageDraft = {
  uri: string;
  base64: string;
  mimeType: string;
};

function defaultDatePart(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function defaultTimePart(): Date {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  return date;
}

function createInitialFormState(): CreatePostFormState {
  return {
    type: 'tournament',
    subtype: DEFAULT_SUBTYPE_BY_TYPE.tournament,
    tags: [],
    scoringFormat: 'two_sets_super_tiebreak',
    goldenPoint: true,
    guaranteedMatches: null,
    rulesNote: '',
    rulesImages: [],
    entryFeeText: '',
    feeUnit: 'per_pair',
    hasRegistrationDeadline: false,
    registrationDatePart: defaultDatePart(),
    registrationTimePart: defaultTimePart(),
    divisions: [],
    contacts: [],
    title: '',
    description: '',
    imageUri: null,
    imageBase64: null,
    imageMimeType: null,
    imageWidth: null,
    imageHeight: null,
    venueName: '',
    coords: null,
    formattedAddress: null,
    placeId: null,
    hasEventDate: true,
    datePart: defaultDatePart(),
    timePart: defaultTimePart(),
    hasEventEnd: false,
    endDatePart: defaultDatePart(),
    endTimePart: defaultTimePart(),
    detailsExpanded: false,
    rulesExpanded: false,
    organizersExpanded: false,
  };
}

function combineDateAndTime(datePart: Date, timePart: Date): Date {
  const combined = new Date(datePart);
  combined.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return combined;
}

export type OrganizerContactDraft = {
  phoneText: string;
  label: string;
  isAuthorSlot: boolean;
};

export function buildOrganizerContactsFromDrafts(
  drafts: OrganizerContactDraft[],
):
  | { ok: true; contacts: CommunityPostContactInput[] }
  | { ok: false; message: string } {
  if (drafts.length < 1 || drafts.length > 3) {
    return { ok: false, message: 'Add between 1 and 3 organizer WhatsApp numbers.' };
  }

  const phones = new Set<string>();
  const contacts: CommunityPostContactInput[] = [];

  for (const draft of drafts) {
    const parsed = parseArgentinaWhatsAppToE164(draft.phoneText);
    if (!parsed.ok || parsed.e164.length === 0) {
      return { ok: false, message: parsed.ok ? 'Each organizer needs a WhatsApp number.' : parsed.message };
    }
    if (phones.has(parsed.e164)) {
      return { ok: false, message: 'Organizer numbers must be unique.' };
    }
    phones.add(parsed.e164);
    const label = draft.label.trim();
    if (label.length > 40) {
      return { ok: false, message: 'Organizer labels cannot exceed 40 characters.' };
    }
    contacts.push({
      phone: parsed.e164,
      label: label.length > 0 ? label : null,
    });
  }

  return { ok: true, contacts };
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

export type CreatePostFormState = {
  type: CommunityPostType;
  subtype: CommunityPostSubtype;
  tags: CommunityPostTag[];
  scoringFormat: CommunityPostScoringFormat | null;
  goldenPoint: boolean | null;
  guaranteedMatches: number | null;
  rulesNote: string;
  rulesImages: RulesImageDraft[];
  entryFeeText: string;
  feeUnit: CommunityPostFeeUnit;
  hasRegistrationDeadline: boolean;
  registrationDatePart: Date;
  registrationTimePart: Date;
  divisions: CommunityPostDivisionInput[];
  contacts: OrganizerContactDraft[];
  title: string;
  description: string;
  imageUri: string | null;
  imageBase64: string | null;
  imageMimeType: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  venueName: string;
  coords: Coords | null;
  formattedAddress: string | null;
  placeId: string | null;
  hasEventDate: boolean;
  datePart: Date;
  timePart: Date;
  hasEventEnd: boolean;
  endDatePart: Date;
  endTimePart: Date;
  detailsExpanded: boolean;
  rulesExpanded: boolean;
  organizersExpanded: boolean;
};

export type CreatePostFormActions = {
  setType: (value: CommunityPostType) => void;
  setSubtype: (value: CommunityPostSubtype) => void;
  toggleTag: (tag: CommunityPostTag) => void;
  setScoringFormat: (value: CommunityPostScoringFormat | null) => void;
  setGoldenPoint: (value: boolean | null) => void;
  setGuaranteedMatches: (value: number | null) => void;
  setRulesNote: (value: string) => void;
  addRulesImage: (image: RulesImageDraft) => void;
  removeRulesImage: (index: number) => void;
  setEntryFeeText: (value: string) => void;
  setFeeUnit: (value: CommunityPostFeeUnit) => void;
  setHasRegistrationDeadline: (value: boolean) => void;
  setRegistrationDatePart: (value: Date) => void;
  setRegistrationTimePart: (value: Date) => void;
  setDivisions: (value: CommunityPostDivisionInput[]) => void;
  setContacts: (value: OrganizerContactDraft[]) => void;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setImageUri: (value: string | null) => void;
  setImageBase64: (value: string | null) => void;
  setImageMimeType: (value: string | null) => void;
  setImageWidth: (value: number | null) => void;
  setImageHeight: (value: number | null) => void;
  setVenueName: (value: string) => void;
  setCoords: (value: Coords | null) => void;
  setFormattedAddress: (value: string | null) => void;
  setPlaceId: (value: string | null) => void;
  setHasEventDate: (value: boolean) => void;
  setDatePart: (value: Date) => void;
  setTimePart: (value: Date) => void;
  setHasEventEnd: (value: boolean) => void;
  setEndDatePart: (value: Date) => void;
  setEndTimePart: (value: Date) => void;
  setDetailsExpanded: (value: boolean) => void;
  setRulesExpanded: (value: boolean) => void;
  setOrganizersExpanded: (value: boolean) => void;
  expandPanel: (panel: 'details' | 'rules' | 'organizers') => void;
  reset: () => void;
  buildSubmitInput: () =>
    | { ok: true; input: Omit<CreatePostInput, 'imagePath'> & { imageUri: string | null } }
    | { ok: false; message: string };
};

export function useCreatePostForm(): CreatePostFormState & CreatePostFormActions {
  const [state, setState] = useState(createInitialFormState);

  const setType = useCallback((value: CommunityPostType) => {
    setState((prev) => ({
      ...prev,
      type: value,
      subtype: DEFAULT_SUBTYPE_BY_TYPE[value],
      scoringFormat: scoringAllowedForType(value) ? prev.scoringFormat ?? 'two_sets_super_tiebreak' : null,
      goldenPoint: scoringAllowedForType(value) ? prev.goldenPoint : null,
      guaranteedMatches: scoringAllowedForType(value) ? prev.guaranteedMatches : null,
    }));
  }, []);

  const setSubtype = useCallback((value: CommunityPostSubtype) => {
    setState((prev) => ({ ...prev, subtype: value }));
  }, []);

  const toggleTag = useCallback((tag: CommunityPostTag) => {
    setState((prev) => {
      const has = prev.tags.includes(tag);
      if (has) {
        return { ...prev, tags: prev.tags.filter((item) => item !== tag) };
      }
      if (prev.tags.length >= 12) return prev;
      return { ...prev, tags: [...prev.tags, tag] };
    });
  }, []);

  const setScoringFormat = useCallback((value: CommunityPostScoringFormat | null) => {
    setState((prev) => ({ ...prev, scoringFormat: value }));
  }, []);

  const setGoldenPoint = useCallback((value: boolean | null) => {
    setState((prev) => ({ ...prev, goldenPoint: value }));
  }, []);

  const setGuaranteedMatches = useCallback((value: number | null) => {
    setState((prev) => ({ ...prev, guaranteedMatches: value }));
  }, []);

  const setRulesNote = useCallback((value: string) => {
    setState((prev) => ({ ...prev, rulesNote: value }));
  }, []);

  const addRulesImage = useCallback((image: RulesImageDraft) => {
    setState((prev) => {
      if (prev.rulesImages.length >= 3) return prev;
      return { ...prev, rulesImages: [...prev.rulesImages, image] };
    });
  }, []);

  const removeRulesImage = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      rulesImages: prev.rulesImages.filter((_, i) => i !== index),
    }));
  }, []);

  const setEntryFeeText = useCallback((value: string) => {
    setState((prev) => ({ ...prev, entryFeeText: value }));
  }, []);

  const setFeeUnit = useCallback((value: CommunityPostFeeUnit) => {
    setState((prev) => ({ ...prev, feeUnit: value }));
  }, []);

  const setHasRegistrationDeadline = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, hasRegistrationDeadline: value }));
  }, []);

  const setRegistrationDatePart = useCallback((value: Date) => {
    setState((prev) => ({ ...prev, registrationDatePart: value }));
  }, []);

  const setRegistrationTimePart = useCallback((value: Date) => {
    setState((prev) => ({ ...prev, registrationTimePart: value }));
  }, []);

  const setDivisions = useCallback((value: CommunityPostDivisionInput[]) => {
    setState((prev) => ({ ...prev, divisions: value }));
  }, []);

  const setContacts = useCallback((value: OrganizerContactDraft[]) => {
    setState((prev) => ({ ...prev, contacts: value }));
  }, []);

  const setTitle = useCallback((value: string) => {
    setState((prev) => ({ ...prev, title: value }));
  }, []);

  const setDescription = useCallback((value: string) => {
    setState((prev) => ({ ...prev, description: value }));
  }, []);

  const setImageUri = useCallback((value: string | null) => {
    setState((prev) => ({ ...prev, imageUri: value }));
  }, []);

  const setImageBase64 = useCallback((value: string | null) => {
    setState((prev) => ({ ...prev, imageBase64: value }));
  }, []);

  const setImageMimeType = useCallback((value: string | null) => {
    setState((prev) => ({ ...prev, imageMimeType: value }));
  }, []);

  const setImageWidth = useCallback((value: number | null) => {
    setState((prev) => ({ ...prev, imageWidth: value }));
  }, []);

  const setImageHeight = useCallback((value: number | null) => {
    setState((prev) => ({ ...prev, imageHeight: value }));
  }, []);

  const setVenueName = useCallback((value: string) => {
    setState((prev) => ({ ...prev, venueName: value }));
  }, []);

  const setCoords = useCallback((value: Coords | null) => {
    setState((prev) => ({ ...prev, coords: value }));
  }, []);

  const setFormattedAddress = useCallback((value: string | null) => {
    setState((prev) => ({ ...prev, formattedAddress: value }));
  }, []);

  const setPlaceId = useCallback((value: string | null) => {
    setState((prev) => ({ ...prev, placeId: value }));
  }, []);

  const setHasEventDate = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, hasEventDate: value }));
  }, []);

  const setDatePart = useCallback((value: Date) => {
    setState((prev) => ({ ...prev, datePart: value }));
  }, []);

  const setTimePart = useCallback((value: Date) => {
    setState((prev) => ({ ...prev, timePart: value }));
  }, []);

  const setHasEventEnd = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, hasEventEnd: value }));
  }, []);

  const setEndDatePart = useCallback((value: Date) => {
    setState((prev) => ({ ...prev, endDatePart: value }));
  }, []);

  const setEndTimePart = useCallback((value: Date) => {
    setState((prev) => ({ ...prev, endTimePart: value }));
  }, []);

  const setDetailsExpanded = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, detailsExpanded: value }));
  }, []);

  const setRulesExpanded = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, rulesExpanded: value }));
  }, []);

  const setOrganizersExpanded = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, organizersExpanded: value }));
  }, []);

  const expandPanel = useCallback((panel: 'details' | 'rules' | 'organizers') => {
    setState((prev) => ({
      ...prev,
      detailsExpanded: panel === 'details' ? true : prev.detailsExpanded,
      rulesExpanded: panel === 'rules' ? true : prev.rulesExpanded,
      organizersExpanded: panel === 'organizers' ? true : prev.organizersExpanded,
    }));
  }, []);

  const reset = useCallback(() => {
    setState(createInitialFormState());
  }, []);

  const buildSubmitInput = useCallback(():
    | { ok: true; input: Omit<CreatePostInput, 'imagePath'> & { imageUri: string | null } }
    | { ok: false; message: string } => {
      const {
        type,
        subtype,
        tags,
        scoringFormat,
        goldenPoint,
        guaranteedMatches,
        rulesNote,
        rulesImages,
        entryFeeText,
        feeUnit,
        hasRegistrationDeadline,
        registrationDatePart,
        registrationTimePart,
        divisions,
        contacts,
        title,
        description,
        imageUri,
        venueName,
        coords,
        formattedAddress,
        hasEventDate,
        datePart,
        timePart,
        hasEventEnd,
        endDatePart,
        endTimePart,
      } = state;

      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 3) {
        return { ok: false, message: 'Add a title of at least 3 characters.' };
      }
      if (trimmedTitle.length > 120) {
        return { ok: false, message: 'Title cannot exceed 120 characters.' };
      }

      const trimmedDescription = description.trim();
      if (trimmedDescription.length > 2000) {
        return { ok: false, message: 'Description cannot exceed 2000 characters.' };
      }

      if (!isSubtypeAllowed(type, subtype)) {
        return { ok: false, message: 'Pick a format that matches the event type.' };
      }

      if (divisions.length > 12) {
        return { ok: false, message: 'At most 12 divisions are allowed.' };
      }

      if (tags.length > 12) {
        return { ok: false, message: 'At most 12 tags are allowed.' };
      }

      if (coords === null) {
        return { ok: false, message: 'Pick a location so players can find this event.' };
      }

      const contactResult = buildOrganizerContactsFromDrafts(contacts);
      if (!contactResult.ok) {
        return { ok: false, message: contactResult.message };
      }

      const trimmedRulesNote = rulesNote.trim();
      if (trimmedRulesNote.length > 500) {
        return { ok: false, message: 'Rules note cannot exceed 500 characters.' };
      }

      const allowsScoring = scoringAllowedForType(type);
      if (!allowsScoring && scoringFormat !== null) {
        return { ok: false, message: 'Scoring is not available for this event type.' };
      }

      if (allowsScoring && scoringFormat === 'other' && trimmedRulesNote.length === 0) {
        return { ok: false, message: 'Describe the rules when using the Other scoring format.' };
      }

      const entryFee = parseEntryFee(entryFeeText);
      if (entryFeeText.trim().length > 0 && entryFee === null) {
        return { ok: false, message: 'Enter a valid entry fee or leave it empty.' };
      }

      let eventStart: string | null = null;
      let eventEnd: string | null = null;

      if (hasEventDate) {
        const startDate = combineDateAndTime(datePart, timePart);
        if (startDate.getTime() <= Date.now()) {
          return { ok: false, message: 'Pick a future event start date and time.' };
        }
        eventStart = startDate.toISOString();

        if (hasEventEnd) {
          const endDate = combineDateAndTime(endDatePart, endTimePart);
          if (endDate.getTime() <= startDate.getTime()) {
            return { ok: false, message: 'Event end must be after the start time.' };
          }
          eventEnd = endDate.toISOString();
        }
      }

      let registrationDeadline: string | null = null;
      if (hasRegistrationDeadline) {
        const deadline = combineDateAndTime(registrationDatePart, registrationTimePart);
        if (eventStart !== null && deadline.getTime() > new Date(eventStart).getTime()) {
          return { ok: false, message: 'Registration deadline must be on or before the event start.' };
        }
        registrationDeadline = deadline.toISOString();
      }

      const rulesUploads: RulesImageUpload[] = rulesImages.map((image) => ({
        base64: image.base64,
        mimeType: image.mimeType,
      }));

      return {
        ok: true,
        input: {
          type,
          subtype,
          tags,
          scoringFormat: allowsScoring ? scoringFormat : null,
          goldenPoint: allowsScoring ? goldenPoint : null,
          guaranteedMatches: allowsScoring ? guaranteedMatches : null,
          rulesNote: trimmedRulesNote.length > 0 ? trimmedRulesNote : null,
          rulesImages: rulesUploads,
          entryFee,
          feeUnit: entryFee !== null ? feeUnit : null,
          registrationDeadline,
          divisions,
          contacts: contactResult.contacts,
          title: trimmedTitle,
          description: trimmedDescription.length > 0 ? trimmedDescription : null,
          imageUri,
          venueName: venueName.trim() || null,
          formattedAddress,
          coords,
          eventStart,
          eventEnd,
        },
      };
    },
    [state],
  );

  return {
    ...state,
    setType,
    setSubtype,
    toggleTag,
    setScoringFormat,
    setGoldenPoint,
    setGuaranteedMatches,
    setRulesNote,
    addRulesImage,
    removeRulesImage,
    setEntryFeeText,
    setFeeUnit,
    setHasRegistrationDeadline,
    setRegistrationDatePart,
    setRegistrationTimePart,
    setDivisions,
    setContacts,
    setTitle,
    setDescription,
    setImageUri,
    setImageBase64,
    setImageMimeType,
    setImageWidth,
    setImageHeight,
    setVenueName,
    setCoords,
    setFormattedAddress,
    setPlaceId,
    setHasEventDate,
    setDatePart,
    setTimePart,
    setHasEventEnd,
    setEndDatePart,
    setEndTimePart,
    setDetailsExpanded,
    setRulesExpanded,
    setOrganizersExpanded,
    expandPanel,
    reset,
    buildSubmitInput,
  };
}

export { SUBTYPES_BY_TYPE };
