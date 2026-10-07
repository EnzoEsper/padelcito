import {
  DEFAULT_SUBTYPE_BY_TYPE,
  LEGACY_SUBTYPES,
  POST_SUBTYPE_LABELS,
  SUBTYPES_BY_TYPE,
  SUBTYPE_DESCRIPTIONS_BY_TYPE,
  formatDivision,
  formatDivisions,
  normalizeCommunityPostDivision,
  formatPostFee,
  formatPostTypeLine,
  formatScoring,
  formatSubtypeLabel,
  isSubtypeAllowed,
} from '@/features/community/post-display';
import type { CommunityPostType } from '@/features/community/post-display';

const ALL_TYPES: CommunityPostType[] = [
  'tournament',
  'social',
  'league',
  'training',
  'special_event',
];

describe('community post display helpers', () => {
  it('maps subtypes per type without legacy values', () => {
    expect(SUBTYPES_BY_TYPE.tournament).toContain('traditional');
    expect(SUBTYPES_BY_TYPE.tournament).not.toContain('suma');
    expect(SUBTYPES_BY_TYPE.tournament).not.toContain('groups_knockout');
    expect(SUBTYPES_BY_TYPE.social).toContain('pozo');
    expect(DEFAULT_SUBTYPE_BY_TYPE.league).toBe('pairs');
    for (const type of ALL_TYPES) {
      expect(SUBTYPES_BY_TYPE[type]).toContain('other');
    }
  });

  it('has label and description for every active subtype', () => {
    for (const type of ALL_TYPES) {
      for (const subtype of SUBTYPES_BY_TYPE[type]) {
        expect(POST_SUBTYPE_LABELS[subtype].length).toBeGreaterThan(0);
        const description = SUBTYPE_DESCRIPTIONS_BY_TYPE[type][subtype];
        expect(description).toBeDefined();
        expect(description?.length).toBeGreaterThan(0);
      }
      for (const legacy of LEGACY_SUBTYPES) {
        expect(SUBTYPES_BY_TYPE[type]).not.toContain(legacy);
      }
    }
  });

  it('validates subtype pairs', () => {
    expect(isSubtypeAllowed('tournament', 'americano')).toBe(true);
    expect(isSubtypeAllowed('tournament', 'traditional')).toBe(true);
    expect(isSubtypeAllowed('training', 'americano')).toBe(false);
    expect(isSubtypeAllowed('tournament', 'elimination')).toBe(false);
  });

  it('formats type line with other note', () => {
    expect(formatPostTypeLine('tournament', 'traditional')).toBe('Tournament · Traditional');
    expect(formatPostTypeLine('social', 'other', 'Birthday Americano')).toBe(
      'Social · Birthday Americano',
    );
    expect(formatSubtypeLabel('social', 'other', 'Custom')).toBe('Custom');
  });

  it('normalizes inverted category range bounds', () => {
    expect(
      normalizeCommunityPostDivision({
        gender: 'male',
        category_max: 7,
        category_min: 5,
        category_sum: null,
        age_min: null,
        age_max: null,
        label: null,
      }),
    ).toEqual({
      gender: 'male',
      category_max: 5,
      category_min: 7,
      category_sum: null,
      age_min: null,
      age_max: null,
      label: null,
    });
  });

  it('keeps valid category range bounds', () => {
    expect(
      normalizeCommunityPostDivision({
        gender: 'male',
        category_max: 5,
        category_min: 7,
        category_sum: null,
        age_min: null,
        age_max: null,
        label: null,
      }),
    ).toEqual({
      gender: 'male',
      category_max: 5,
      category_min: 7,
      category_sum: null,
      age_min: null,
      age_max: null,
      label: null,
    });
  });

  it('normalizes sum vs range for divisions', () => {
    expect(
      normalizeCommunityPostDivision({
        gender: 'open',
        category_max: 7,
        category_min: 7,
        category_sum: 12,
        age_min: null,
        age_max: null,
        label: null,
      }),
    ).toEqual({
      gender: 'open',
      category_max: null,
      category_min: null,
      category_sum: 12,
      age_min: null,
      age_max: null,
      label: null,
    });
  });

  it('formats divisions with category range and suma', () => {
    expect(
      formatDivision({
        gender: 'mixed',
        category_max: 6,
        category_min: 7,
        category_sum: null,
        age_min: null,
        age_max: null,
        label: null,
      }),
    ).toBe('Mixed · 6th–7th');

    expect(
      formatDivision({
        gender: 'male',
        category_min: null,
        category_max: null,
        category_sum: 12,
        age_min: 40,
        age_max: null,
        label: null,
      }),
    ).toBe('Men · +40 · Suma 12');
  });

  it('compacts multiple divisions', () => {
    const text = formatDivisions(
      [
        {
          gender: 'female',
          category_min: 7,
          category_max: 7,
          category_sum: null,
          age_min: null,
          age_max: null,
          label: null,
        },
        {
          gender: 'male',
          category_min: 4,
          category_max: 4,
          category_sum: null,
          age_min: null,
          age_max: null,
          label: null,
        },
        {
          gender: 'mixed',
          category_min: null,
          category_max: null,
          category_sum: 14,
          age_min: null,
          age_max: null,
          label: null,
        },
        {
          gender: 'open',
          category_min: null,
          category_max: null,
          category_sum: null,
          age_min: null,
          age_max: null,
          label: 'Beginners',
        },
      ],
      2,
    );
    expect(text).toContain('+2 more');
  });

  it('formats fee and scoring', () => {
    expect(formatPostFee(25000, 'per_pair', true)).toContain('From');
    expect(formatPostFee(0, 'per_player', false)).toBe('Free entry');
    expect(
      formatScoring('two_sets_super_tiebreak', true, 3),
    ).toBe('2 sets + super tie-break · Golden point · 3 guaranteed');
  });
});
