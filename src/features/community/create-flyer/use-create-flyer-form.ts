import { useCallback, useState } from 'react';
import type { Database } from '@/types/database';
import type { Coords } from '@/lib/location';
import type { CreateFlyerInput } from '@/features/community/use-flyers';

type FlyerType = Database['public']['Enums']['flyer_type'];

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

function combineDateAndTime(datePart: Date, timePart: Date): Date {
  const combined = new Date(datePart);
  combined.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return combined;
}

export type CreateFlyerFormState = {
  type: FlyerType;
  title: string;
  description: string;
  imageUri: string | null;
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
};

export type CreateFlyerFormActions = {
  setType: (value: FlyerType) => void;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setImageUri: (value: string | null) => void;
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
  buildSubmitInput: (
    contactPhone: string,
  ) => { ok: true; input: Omit<CreateFlyerInput, 'imagePath'> & { imageUri: string | null } } | { ok: false; message: string };
};

export function useCreateFlyerForm(): CreateFlyerFormState & CreateFlyerFormActions {
  const [type, setType] = useState<FlyerType>('tournament');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [venueName, setVenueName] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [formattedAddress, setFormattedAddress] = useState<string | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [hasEventDate, setHasEventDate] = useState(true);
  const [datePart, setDatePart] = useState(defaultDatePart);
  const [timePart, setTimePart] = useState(defaultTimePart);
  const [hasEventEnd, setHasEventEnd] = useState(false);
  const [endDatePart, setEndDatePart] = useState(defaultDatePart);
  const [endTimePart, setEndTimePart] = useState(defaultTimePart);

  const buildSubmitInput = useCallback(
    (
      contactPhone: string,
    ):
      | { ok: true; input: Omit<CreateFlyerInput, 'imagePath'> & { imageUri: string | null } }
      | { ok: false; message: string } => {
      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 3) {
        return { ok: false, message: 'Add a title of at least 3 characters.' };
      }

      if (coords === null) {
        return { ok: false, message: 'Pick a location so players can find this event.' };
      }

      if (contactPhone.trim().length === 0) {
        return { ok: false, message: 'Add a WhatsApp number to your profile before publishing.' };
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

      return {
        ok: true,
        input: {
          type,
          title: trimmedTitle,
          description: description.trim() || null,
          imageUri,
          venueName: venueName.trim() || null,
          formattedAddress,
          coords,
          eventStart,
          eventEnd,
          contactPhone,
        },
      };
    },
    [
      coords,
      datePart,
      description,
      endDatePart,
      endTimePart,
      formattedAddress,
      hasEventDate,
      hasEventEnd,
      imageUri,
      timePart,
      title,
      type,
      venueName,
    ],
  );

  return {
    type,
    title,
    description,
    imageUri,
    venueName,
    coords,
    formattedAddress,
    placeId,
    hasEventDate,
    datePart,
    timePart,
    hasEventEnd,
    endDatePart,
    endTimePart,
    setType,
    setTitle,
    setDescription,
    setImageUri,
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
    buildSubmitInput,
  };
}
