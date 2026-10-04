import {
  parsePhoneNumberFromString,
  type CountryCode,
  type PhoneNumber,
} from 'libphonenumber-js';
import { z } from 'zod';

export const ARGENTINA_COUNTRY_CODE: CountryCode = 'AR';
export const ARGENTINA_CALLING_CODE = '+54';

const E164_REGEX = /^\+[1-9][0-9]{6,14}$/;

export type ArgentinaWhatsAppParseResult =
  | { ok: true; e164: string }
  | { ok: false; message: string };

function normalizeArgentinaMobileE164(parsed: PhoneNumber): string | null {
  if (parsed.country !== ARGENTINA_COUNTRY_CODE || !parsed.isValid()) {
    return null;
  }

  let e164 = parsed.format('E.164');
  if (!e164.startsWith(ARGENTINA_CALLING_CODE)) {
    return null;
  }

  if (!e164.startsWith('+549')) {
    const candidate = `${ARGENTINA_CALLING_CODE}9${e164.slice(ARGENTINA_CALLING_CODE.length)}`;
    const reparsed = parsePhoneNumberFromString(candidate, ARGENTINA_COUNTRY_CODE);
    if (reparsed === undefined || !reparsed.isValid()) {
      return null;
    }
    e164 = reparsed.format('E.164');
  }

  if (!e164.startsWith('+549') || !E164_REGEX.test(e164)) {
    return null;
  }

  const numberType = parsePhoneNumberFromString(e164, ARGENTINA_COUNTRY_CODE)?.getType();
  if (
    numberType !== undefined &&
    numberType !== 'MOBILE' &&
    numberType !== 'FIXED_LINE_OR_MOBILE'
  ) {
    return null;
  }

  return e164;
}

function getMobileArgentinaNumber(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }

  const parsed = parsePhoneNumberFromString(trimmed, ARGENTINA_COUNTRY_CODE);
  if (parsed === undefined) {
    return null;
  }

  return normalizeArgentinaMobileE164(parsed);
}

/** Parse user input or stored E.164 into canonical Argentine mobile E.164 (+549…). */
export function parseArgentinaWhatsAppToE164(input: string): ArgentinaWhatsAppParseResult {
  const trimmed = input.trim();
  if (trimmed === '') {
    return { ok: true, e164: '' };
  }

  const e164 = getMobileArgentinaNumber(trimmed);
  if (e164 === null) {
    return {
      ok: false,
      message: 'Enter a valid Argentine mobile number, e.g. 11 2345-6789',
    };
  }

  return { ok: true, e164 };
}

/** Digits shown after the fixed +54 label (includes mobile 9 when present). */
export function formatArgentinaWhatsAppLocalInput(e164: string | null | undefined): string {
  if (e164 === null || e164 === undefined || e164.trim() === '') {
    return '';
  }

  const parsed = parsePhoneNumberFromString(e164, ARGENTINA_COUNTRY_CODE);
  if (parsed !== undefined && parsed.isValid() && parsed.country === ARGENTINA_COUNTRY_CODE) {
    const normalized = normalizeArgentinaMobileE164(parsed);
    if (normalized !== null && normalized.startsWith('+549')) {
      return normalized.slice(4);
    }
  }

  if (e164.startsWith('+549')) {
    return e164.slice(4);
  }

  if (e164.startsWith(ARGENTINA_CALLING_CODE)) {
    return e164.slice(ARGENTINA_CALLING_CODE.length).replace(/\D/g, '');
  }

  return e164.replace(/\D/g, '');
}

/** Readable national format for display (optional). */
export function formatArgentinaWhatsAppNational(e164: string | null | undefined): string {
  if (e164 === null || e164 === undefined || e164.trim() === '') {
    return '';
  }

  const parsed = parsePhoneNumberFromString(e164, ARGENTINA_COUNTRY_CODE);
  if (parsed !== undefined && parsed.isValid()) {
    return parsed.formatNational();
  }

  return e164;
}

function normalizeWhatsAppLocalInput(val: string): string {
  return val.replace(/\D/g, '');
}

export function parseArgentinaWhatsAppLocalToNullableE164(
  localInput: string,
): string | null {
  const digits = normalizeWhatsAppLocalInput(localInput.trim());
  if (digits === '') {
    return null;
  }
  const composed = digits.startsWith('54')
    ? `+${digits}`
    : `${ARGENTINA_CALLING_CODE}${digits}`;
  const result = parseArgentinaWhatsAppToE164(composed);
  if (!result.ok) {
    throw new Error(result.message);
  }
  if (result.e164 === '') {
    return null;
  }
  return result.e164;
}

const INVALID_AR_MESSAGE =
  'Enter a valid Argentine mobile number, e.g. 11 2345-6789';

/** Zod: optional local input → E.164 or null for DB. */
export const argentinaWhatsAppLocalSchema = z
  .string()
  .transform((val) => normalizeWhatsAppLocalInput(val.trim()))
  .pipe(
    z.union([
      z.literal('').transform(() => null),
      z
        .string()
        .min(1)
        .refine(
          (digits) => {
            const composed = `${ARGENTINA_CALLING_CODE}${digits}`;
            return parseArgentinaWhatsAppToE164(composed).ok;
          },
          { message: INVALID_AR_MESSAGE },
        )
        .transform((digits) => {
          const result = parseArgentinaWhatsAppToE164(
            `${ARGENTINA_CALLING_CODE}${digits}`,
          );
          if (!result.ok || result.e164 === '') {
            throw new Error(INVALID_AR_MESSAGE);
          }
          return result.e164;
        }),
    ]),
  );
