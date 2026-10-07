import {
  mapPublishValidationToPanel,
  summarizeEventDetailsPanel,
  summarizeFormatRulesPanel,
  summarizeOrganizersPanel,
} from '@/features/community/create-post/create-post-form-summaries';

describe('summarizeEventDetailsPanel', () => {
  it('returns default hint when empty', () => {
    expect(
      summarizeEventDetailsPanel({
        description: '',
        divisionsCount: 0,
        entryFeeText: '',
        feeUnit: 'per_pair',
        hasRegistrationDeadline: false,
        tags: [],
        scoringFormat: 'two_sets_super_tiebreak',
        type: 'tournament',
        rulesNote: '',
      }),
    ).toContain('Description');
  });

  it('lists filled optional fields', () => {
    const summary = summarizeEventDetailsPanel({
      description: 'Hello',
      divisionsCount: 2,
      entryFeeText: '25000',
      feeUnit: 'per_pair',
      hasRegistrationDeadline: true,
      tags: ['welcome_kit', 'hydration'],
      scoringFormat: null,
      type: 'training',
      rulesNote: '',
    });
    expect(summary).toContain('Description');
    expect(summary).toContain('2 divisions');
    expect(summary).toContain('Registration deadline');
  });
});

describe('summarizeFormatRulesPanel', () => {
  it('returns not set when scoring missing', () => {
    expect(
      summarizeFormatRulesPanel({
        description: '',
        divisionsCount: 0,
        entryFeeText: '',
        feeUnit: 'per_pair',
        hasRegistrationDeadline: false,
        tags: [],
        scoringFormat: null,
        type: 'tournament',
        rulesNote: '',
      }),
    ).toBe('Not set');
  });
});

describe('summarizeOrganizersPanel', () => {
  it('summarizes author-only contact', () => {
    expect(
      summarizeOrganizersPanel([{ phoneText: '11', label: '', isAuthorSlot: true }], true),
    ).toBe('Main: your WhatsApp');
  });
});

describe('mapPublishValidationToPanel', () => {
  it('maps rules errors to rules panel', () => {
    expect(mapPublishValidationToPanel('Describe the rules when using the Other scoring format.')).toBe(
      'rules',
    );
  });

  it('maps organizer errors to organizers panel', () => {
    expect(mapPublishValidationToPanel('Add between 1 and 3 organizer WhatsApp numbers.')).toBe(
      'organizers',
    );
  });
});
