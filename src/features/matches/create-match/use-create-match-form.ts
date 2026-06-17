import { useCallback, useMemo, useState } from 'react';
import type { Database } from '@/types/database';
import { categoryRangeToSkillLevels } from '@/lib/padel-category';
import {
  DEFAULT_COURT_FORMAT,
  DEFAULT_COURT_STRUCTURE,
  DEFAULT_COURT_TYPE,
  maxCourtCount,
  minTotalPlayers,
  type CourtStructure,
  type CourtSurface,
  type CourtType,
} from '@/lib/padel-court';
import type { Coords } from '@/lib/location';
import type { CreateMatchInput } from '@/features/matches/use-matches';

type MatchDifficulty = Database['public']['Enums']['match_difficulty'];
type MatchGenderPreference = Database['public']['Enums']['match_gender_preference'];

export const DURATION_OPTIONS = [60, 90, 120] as const;
export type DurationOption = (typeof DURATION_OPTIONS)[number];

export const POSITION_OPTIONS = [
  { value: 'drive', label: 'Drive' },
  { value: 'back', label: 'Back' },
  { value: 'both', label: 'Both' },
] as const;

const CONFIRMED_COUNT = 0;

function defaultStartsAt(): Date {
  const date = new Date();
  date.setHours(19, 30, 0, 0);
  if (date.getTime() <= Date.now()) {
    date.setDate(date.getDate() + 1);
  }
  return date;
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
  courtType: CourtType;
  courtStructure: CourtStructure;
  totalPlayers: number;
  openSpots: number;
  categoryMax: number;
  categoryMin: number;
  courtSurface: CourtSurface | null;
  pricePerPlayer: string;
  positionsSought: string[];
  genderPreference: MatchGenderPreference | null;
  ageMin: string;
  ageMax: string;
  difficulty: MatchDifficulty | null;
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
  setCourtType: (value: CourtType) => void;
  setCourtStructure: (value: CourtStructure) => void;
  setTotalPlayers: (value: number) => void;
  setOpenSpots: (value: number) => void;
  setCategoryRange: (categoryMax: number, categoryMin: number) => void;
  setCourtSurface: (value: CourtSurface | null) => void;
  setPricePerPlayer: (value: string) => void;
  togglePosition: (value: string) => void;
  setGenderPreference: (value: MatchGenderPreference | null) => void;
  setAgeMin: (value: string) => void;
  setAgeMax: (value: string) => void;
  setDifficulty: (value: MatchDifficulty | null) => void;
  setNotes: (value: string) => void;
  setAdvancedExpanded: (value: boolean) => void;
  applyToday: () => void;
  applyTomorrow: () => void;
  buildSubmitInput: () => { ok: true; input: CreateMatchInput } | { ok: false; message: string };
};

export function useCreateMatchForm(): CreateMatchFormState & CreateMatchFormActions {
  const initialStartsAt = useMemo(() => defaultStartsAt(), []);

  const [venueName, setVenueName] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [datePart, setDatePart] = useState(() => {
    const d = new Date(initialStartsAt);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [timePart, setTimePart] = useState(() => new Date(initialStartsAt));
  const [durationMinutes, setDurationMinutes] = useState<DurationOption>(90);
  const [courtCount, setCourtCountState] = useState(1);
  const [courtType, setCourtType] = useState<CourtType>(DEFAULT_COURT_TYPE);
  const [courtStructure, setCourtStructure] = useState<CourtStructure>(DEFAULT_COURT_STRUCTURE);
  const [totalPlayers, setTotalPlayersState] = useState(4);
  const [openSpots, setOpenSpotsState] = useState(3);
  const [categoryMax, setCategoryMax] = useState(5);
  const [categoryMin, setCategoryMin] = useState(6);
  const [courtSurface, setCourtSurface] = useState<CourtSurface | null>(null);
  const [pricePerPlayer, setPricePerPlayer] = useState('');
  const [positionsSought, setPositionsSought] = useState<string[]>([]);
  const [genderPreference, setGenderPreference] = useState<MatchGenderPreference | null>(null);
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [difficulty, setDifficulty] = useState<MatchDifficulty | null>(null);
  const [notes, setNotes] = useState('');
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  const minPlayers = minTotalPlayers(courtCount, DEFAULT_COURT_FORMAT);
  const maxPlayers = 60;
  const maxCourts = Math.min(maxCourtCount(DEFAULT_COURT_FORMAT), Math.floor(totalPlayers / 4));

  const setCourtCount = useCallback(
    (value: number) => {
      const next = Math.min(maxCourtCount(DEFAULT_COURT_FORMAT), Math.max(1, value));
      setCourtCountState(next);
      const nextMin = minTotalPlayers(next, DEFAULT_COURT_FORMAT);
      setTotalPlayersState((current) => {
        const bumped = Math.max(current, nextMin);
        setOpenSpotsState(bumped - 1 - CONFIRMED_COUNT);
        return bumped;
      });
    },
    [],
  );

  const setTotalPlayers = useCallback(
    (value: number) => {
      const next = Math.min(maxPlayers, Math.max(minPlayers, value));
      setTotalPlayersState(next);
      setOpenSpotsState(next - 1 - CONFIRMED_COUNT);
      setCourtCountState((current) => Math.min(current, Math.floor(next / 4)));
    },
    [minPlayers],
  );

  const setOpenSpots = useCallback((value: number) => {
    const maxOpen = maxPlayers - 1 - CONFIRMED_COUNT;
    const next = Math.min(maxOpen, Math.max(1, value));
    setOpenSpotsState(next);
    setTotalPlayersState(next + 1 + CONFIRMED_COUNT);
  }, []);

  const setCategoryRange = useCallback((nextMax: number, nextMin: number) => {
    setCategoryMax(nextMax);
    setCategoryMin(nextMin);
  }, []);

  const togglePosition = useCallback((value: string) => {
    setPositionsSought((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }, []);

  const applyToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setDatePart(today);
  }, []);

  const applyTomorrow = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    setDatePart(tomorrow);
  }, []);

  const buildSubmitInput = useCallback((): { ok: true; input: CreateMatchInput } | { ok: false; message: string } => {
    const startsAtDate = combineDateAndTime(datePart, timePart);
    if (startsAtDate.getTime() <= Date.now()) {
      return { ok: false, message: 'Pick a future date and time.' };
    }
    if (coords === null) {
      return { ok: false, message: 'Add a map pin so players can discover this match.' };
    }
    if (totalPlayers !== 1 + CONFIRMED_COUNT + openSpots) {
      return { ok: false, message: 'Player counts do not add up. Adjust total players or open spots.' };
    }
    if (courtCount * 4 > totalPlayers) {
      return { ok: false, message: 'Total players must fit all selected courts.' };
    }
    if (categoryMax > categoryMin) {
      return { ok: false, message: 'Maximum level must be stronger than minimum level.' };
    }

    const parsedPrice = pricePerPlayer.trim().length > 0 ? Number.parseFloat(pricePerPlayer) : null;
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
        coords,
        skillMin,
        skillMax,
        courtCount,
        courtFormat: DEFAULT_COURT_FORMAT,
        courtType,
        courtStructure,
        courtSurface,
        categoryMax,
        categoryMin,
        pricePerPlayer: parsedPrice,
        positionsSought,
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
    courtStructure,
    courtSurface,
    courtType,
    datePart,
    difficulty,
    durationMinutes,
    genderPreference,
    notes,
    openSpots,
    positionsSought,
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
    courtType,
    courtStructure,
    totalPlayers,
    openSpots,
    categoryMax,
    categoryMin,
    courtSurface,
    pricePerPlayer,
    positionsSought,
    genderPreference,
    ageMin,
    ageMax,
    difficulty,
    notes,
    advancedExpanded,
    minPlayers,
    maxPlayers,
    maxCourts,
    confirmedCount: CONFIRMED_COUNT,
    setVenueName,
    setCoords,
    setPlaceLabel,
    setDatePart,
    setTimePart,
    setDurationMinutes,
    setCourtCount,
    setCourtType,
    setCourtStructure,
    setTotalPlayers,
    setOpenSpots,
    setCategoryRange,
    setCourtSurface,
    setPricePerPlayer,
    togglePosition,
    setGenderPreference,
    setAgeMin,
    setAgeMax,
    setDifficulty,
    setNotes,
    setAdvancedExpanded,
    applyToday,
    applyTomorrow,
    buildSubmitInput,
  };
}

export type CreateMatchFormHook = ReturnType<typeof useCreateMatchForm>;
