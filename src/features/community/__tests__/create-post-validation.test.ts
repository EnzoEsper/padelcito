import { validateCreatePostForm } from '@/features/community/create-post/create-post-validation';

const baseInput = {
  type: 'tournament' as const,
  subtype: 'traditional' as const,
  subtypeNote: '',
  title: 'Summer Open',
  description: '',
  coords: { lat: -34.6, lng: -58.4 },
  hasEventDate: true,
  datePart: new Date(Date.now() + 86_400_000),
  timePart: new Date(Date.now() + 86_400_000),
  hasEventEnd: false,
  endDatePart: new Date(),
  endTimePart: new Date(),
  divisions: [
    {
      gender: 'open' as const,
      category_max: 7,
      category_min: 7,
      category_sum: null,
      age_min: null,
      age_max: null,
      label: null,
    },
  ],
  scoringFormat: 'two_sets_super_tiebreak' as const,
  rulesNote: '',
  entryFeeText: '',
  hasRegistrationDeadline: false,
  registrationDatePart: new Date(),
  registrationTimePart: new Date(),
  contacts: [{ phoneText: '11 2345-6789', label: '', isAuthorSlot: true }],
  tags: [],
};

describe('validateCreatePostForm', () => {
  it('requires format on type step', () => {
    const result = validateCreatePostForm(
      { ...baseInput, subtype: null },
      { step: 'type' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.section).toBe('type');
    }
  });

  it('requires other note', () => {
    const result = validateCreatePostForm({
      ...baseInput,
      subtype: 'other',
      subtypeNote: '',
    });
    expect(result.ok).toBe(false);
  });

  it('requires categories for tournament', () => {
    const result = validateCreatePostForm({
      ...baseInput,
      divisions: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe('divisions');
    }
  });

  it('allows training without date', () => {
    const result = validateCreatePostForm({
      ...baseInput,
      type: 'training',
      subtype: 'clinic',
      hasEventDate: false,
      divisions: [],
      scoringFormat: null,
    });
    expect(result.ok).toBe(true);
  });

  it('requires date for social', () => {
    const result = validateCreatePostForm({
      ...baseInput,
      type: 'social',
      subtype: 'americano',
      hasEventDate: false,
      divisions: [],
    });
    expect(result.ok).toBe(false);
  });
});
