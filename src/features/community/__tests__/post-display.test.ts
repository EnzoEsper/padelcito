import {
  DEFAULT_SUBTYPE_BY_TYPE,
  SUBTYPES_BY_TYPE,
  formatDivision,
  formatDivisions,
  formatPostFee,
  formatScoring,
  isSubtypeAllowed,
} from '@/features/community/post-display';

describe('community post display helpers', () => {
  it('maps subtypes per type', () => {
    expect(SUBTYPES_BY_TYPE.tournament).toContain('groups_knockout');
    expect(SUBTYPES_BY_TYPE.social).toContain('pozo');
    expect(DEFAULT_SUBTYPE_BY_TYPE.league).toBe('pairs');
  });

  it('validates subtype pairs', () => {
    expect(isSubtypeAllowed('tournament', 'americano')).toBe(true);
    expect(isSubtypeAllowed('training', 'americano')).toBe(false);
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
