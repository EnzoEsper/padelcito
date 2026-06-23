import { useCallback, useState } from 'react';
import type { Database } from '@/types/database';
import { categoryRangeToSkillLevels } from '@/lib/padel-category';
import {
  DEFAULT_COURT_FORMAT,
  createDefaultCourtConfig,
  maxCourtCount,
  minTotalPlayersFromConfigs,
  resizeCourtConfigs,
  type CourtConfig,
} from '@/lib/padel-court';
import type { Coords } from '@/lib/location';
import { parseArsAmountInput } from '@/lib/currency-ars';
import type { PositionPreference } from '@/lib/padel-position';
import {
  derivedConfirmedCount,
  maxOpenSpots,
} from '@/features/matches/match-roster';
import type { CreateMatchInput } from '@/features/matches/use-matches';

export { derivedConfirmedCount, maxOpenSpots };

type MatchDifficulty = Database['public']['Enums']['match_difficulty'];
type MatchGenderPreference = Database['public']['Enums']['match_gender_preference'];

/** 30-minute steps from 1 h through 8 h (inclusive). */
export const DURATION_OPTIONS = [
  60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480,
] as const;
export type DurationOption = (typeof DURATION_OPTIONS)[number];

export function formatDurationLabel(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hr' : `${hours} hr`;
  }
  return `${minutes / 60} hr`;
}

function defaultDatePart(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function defaultTimePart(): Date {
  return new Date();
}

function formatAutoTitle(venueName: string, startsAt: Date): string {
  const venue = venueName.trim() || 'Padel match';
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(startsAt);
  return `${venue} · ${dateLabel}`;
}

function combineDateAndTime(datePart: Date, timePart: Date): Date {
  const combined = new Date(datePart);
  combined.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return combined;
}

export type CreateMatchFormState = {
  venueName: string;
  coords: Coords | null;
  placeLabel: string | null;
  datePart: Date;
  timePart: Date;
  durationMinutes: DurationOption;
  courtCount: number;
  courtConfigs: CourtConfig[];
  totalPlayers: number;
  openSpots: number;
  categoryMax: number;
  categoryMin: number;
  pricePerPlayer: string;
  positionPreference: PositionPreference;
  genderPreference: MatchGenderPreference;
  ageMin: string;
  ageMax: string;
  difficulty: MatchDifficulty;
  notes: string;
  advancedExpanded: boolean;
  minPlayers: number;
  maxPlayers: number;
  maxCourts: number;
  confirmedCount: number;
};

export type CreateMatchFormActions = {
  setVenueName: (value: string) => void;
  setCoords: (value: Coords | null) => void;
  setPlaceLabel: (value: string | null) => void;
  setDatePart: (value: Date) => void;
  setTimePart: (value: Date) => void;
  setDurationMinutes: (value: DurationOption) => void;
  setCourtCount: (value: number) => void;
  updateCourtConfig: (index: number, patch: Partial<CourtConfig>) => void;
  setTotalPlayers: (value: number) => void;
  setOpenSpots: (value: number) => void;
  setCategoryRange: (categoryMax: number, categoryMin: number) => void;
  setPricePerPlayer: (value: string) => void;
  setPositionPreference: (value: PositionPreference) => void;
  setGenderPreference: (value: MatchGenderPreference) => void;
  setAgeMin: (value: string) => void;
  setAgeMax: (value: string) => void;
  setDifficulty: (value: MatchDifficulty) => void;
  setNotes: (value: string) => void;
  setAdvancedExpanded: (value: boolean) => void;
  buildSubmitInput: () => { ok: true; input: CreateMatchInput } | { ok: false; message: string };
};

export function useCreateMatchForm(): CreateMatchFormState & CreateMatchFormActions {
  const [venueName, setVenueName] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [datePart, setDatePart] = useState(defaultDatePart);
  const [timePart, setTimePart] = useState(defaultTimePart);
  const [durationMinutes, setDurationMinutes] = useState<DurationOption>(60);
  const [courtCount, setCourtCountState] = useState(1);
  const [courtConfigs, setCourtConfigsState] = useState<CourtConfig[]>(() => [createDefaultCourtConfig()]);
  const [totalPlayers, setTotalPlayersState] = useState(4);
  const [openSpots, setOpenSpotsState] = useState(1);
  const [categoryMax, setCategoryMax] = useState(5);
  const [categoryMin, setCategoryMin] = useState(6);
  const [pricePerPlayer, setPricePerPlayer] = useState('');
  const [positionPreference, setPositionPreference] = useState<PositionPreference>('any');
  const [genderPreference, setGenderPreference] = useState<MatchGenderPreference>('male');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [difficulty, setDifficulty] = useState<MatchDifficulty>('friendly');
  const [notes, setNotes] = useState('');
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  const minPlayers = minTotalPlayersFromConfigs(courtConfigs);
  const maxPlayers = 60;
  const maxCourts = maxCourtCount(DEFAULT_COURT_FORMAT);
  const confirmedCount = derivedConfirmedCount(totalPlayers, openSpots);

  const setCourtCount = useCallback((value: number) => {
    const next = Math.min(maxCourtCount(DEFAULT_COURT_FORMAT), Math.max(1, value));
    setCourtCountState(next);
    setCourtConfigsState((currentConfigs) => {
      const resized = resizeCourtConfigs(currentConfigs, next);
      setTotalPlayersState(minTotalPlayersFromConfigs(resized));
      return resized;
    });
    setOpenSpotsState(1);
  }, []);

  const updateCourtConfig = useCallback((index: number, patch: Partial<CourtConfig>) => {
    setCourtConfigsState((configs) =>
      configs.map((config, i) => (i === index ? { ...config, ...patch } : config)),
    );
  }, []);

  const setTotalPlayers = useCallback(
    (value: number) => {
      const next = Math.min(maxPlayers, Math.max(minPlayers, value));
      setTotalPlayersState(next);
      setOpenSpotsState((current) => Math.min(current, maxOpenSpots(next)));
    },
    [minPlayers],
  );

  const setOpenSpots = useCallback(
    (value: number) => {
      setOpenSpotsState(Math.min(maxOpenSpots(totalPlayers), Math.max(1, value)));
    },
    [totalPlayers],
  );

  const setCategoryRange = useCallback((nextMax: number, nextMin: number) => {
    setCategoryMax(nextMax);
    setCategoryMin(nextMin);
  }, []);

  const buildSubmitInput = useCallback((): { ok: true; input: CreateMatchInput } | { ok: false; message: string } => {
    const startsAtDate = combineDateAndTime(datePart, timePart);
    if (startsAtDate.getTime() <= Date.now()) {
      return { ok: false, message: 'Pick a future date and time.' };
    }
    if (coords === null) {
      return { ok: false, message: 'Add a map pin so players can discover this match.' };
    }
    if (openSpots < 1 || openSpots > maxOpenSpots(totalPlayers)) {
      return { ok: false, message: 'Open spots must be between 1 and total players minus host.' };
    }
    if (totalPlayers < minTotalPlayersFromConfigs(courtConfigs)) {
      return {
        ok: false,
        message: `Total players must be at least ${minTotalPlayersFromConfigs(courtConfigs)} for ${courtCount} court${courtCount === 1 ? '' : 's'}.`,
      };
    }
    if (categoryMax > categoryMin) {
      return { ok: false, message: 'Maximum level must be stronger than minimum level.' };
    }
    if (courtConfigs.length !== courtCount) {
      return { ok: false, message: 'Court setup does not match the number of courts.' };
    }
    const parsedPrice = parseArsAmountInput(pricePerPlayer);
    if (parsedPrice !== null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      return { ok: false, message: 'Enter a valid price per person.' };
    }

    const parsedAgeMin = ageMin.trim().length > 0 ? Number.parseInt(ageMin, 10) : null;
    const parsedAgeMax = ageMax.trim().length > 0 ? Number.parseInt(ageMax, 10) : null;
    if (parsedAgeMin !== null && Number.isNaN(parsedAgeMin)) {
      return { ok: false, message: 'Enter a valid minimum age.' };
    }
    if (parsedAgeMax !== null && Number.isNaN(parsedAgeMax)) {
      return { ok: false, message: 'Enter a valid maximum age.' };
    }
    if (parsedAgeMin !== null && parsedAgeMax !== null && parsedAgeMin > parsedAgeMax) {
      return { ok: false, message: 'Minimum age cannot exceed maximum age.' };
    }

    const title = formatAutoTitle(venueName, startsAtDate);
    if (title.length < 3) {
      return { ok: false, message: 'Add a venue name or longer location label for the match title.' };
    }

    const { skillMin, skillMax } = categoryRangeToSkillLevels(categoryMax, categoryMin);

    return {
      ok: true,
      input: {
        title,
        description: notes.trim() || null,
        venueName: venueName.trim() || null,
        startsAt: startsAtDate.toISOString(),
        durationMinutes,
        capacity: totalPlayers,
        openSpots,
        coords,
        skillMin,
        skillMax,
        courtCount,
        courtConfigs,
        categoryMax,
        categoryMin,
        pricePerPlayer: parsedPrice,
        positionPreference,
        genderPreference,
        ageMin: parsedAgeMin,
        ageMax: parsedAgeMax,
        difficulty,
      },
    };
  }, [
    ageMax,
    ageMin,
    categoryMax,
    categoryMin,
    coords,
    courtCount,
    courtConfigs,
    datePart,
    difficulty,
    durationMinutes,
    genderPreference,
    notes,
    openSpots,
    positionPreference,
    pricePerPlayer,
    timePart,
    totalPlayers,
    venueName,
  ]);

  return {
    venueName,
    coords,
    placeLabel,
    datePart,
    timePart,
    durationMinutes,
    courtCount,
    courtConfigs,
    totalPlayers,
    openSpots,
    categoryMax,
    categoryMin,
    pricePerPlayer,
    positionPreference,
    genderPreference,
    ageMin,
    ageMax,
    difficulty,
    notes,
    advancedExpanded,
    minPlayers,
    maxPlayers,
    maxCourts,
    confirmedCount,
    setVenueName,
    setCoords,
    setPlaceLabel,
    setDatePart,
    setTimePart,
    setDurationMinutes,
    setCourtCount,
    updateCourtConfig,
    setTotalPlayers,
    setOpenSpots,
    setCategoryRange,
    setPricePerPlayer,
    setPositionPreference,
    setGenderPreference,
    setAgeMin,
    setAgeMax,
    setDifficulty,
    setNotes,
    setAdvancedExpanded,
    buildSubmitInput,
  };
}

export type CreateMatchFormHook = ReturnType<typeof useCreateMatchForm>;
