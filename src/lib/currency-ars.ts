const ARS_INTL = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/** Digits with optional `,` and up to 2 decimal digits (no thousand separators). */
export function normalizeArsAmountInput(text: string): string {
  let stripped = text.replace(/^\$\s?/u, '').replace(/\s/gu, '').trim();
  if (stripped === '') return '';

  // Thousand separators use `.` in es-AR; strip them before re-formatting.
  stripped = stripped.replace(/\./g, '');

  let digits = '';
  let commaSeen = false;
  for (const char of stripped) {
    if (char >= '0' && char <= '9') {
      digits += char;
    } else if ((char === ',' || char === '.') && !commaSeen) {
      digits += ',';
      commaSeen = true;
    }
  }

  const commaIndex = digits.indexOf(',');
  if (commaIndex === -1) {
    return digits.replace(/^0+(?=\d)/u, '');
  }

  const rawInt = digits.slice(0, commaIndex);
  const intPart = rawInt.replace(/^0+(?=\d)/u, '');
  const decPart = digits.slice(commaIndex + 1, commaIndex + 3);
  const safeInt = intPart === '' ? '0' : intPart;

  if (decPart.length === 0 && digits.endsWith(',')) {
    return `${safeInt},`;
  }

  return decPart.length === 0 ? safeInt : `${safeInt},${decPart}`;
}

export function formatArsAmountInput(normalized: string): string {
  if (normalized === '') return '';
  if (normalized === ',') return '0,';

  const hasTrailingComma = normalized.endsWith(',');
  const [intPart = '', decPart] = normalized.split(',');

  const formattedInt =
    intPart === ''
      ? '0'
      : ARS_INTL.format(Number.parseInt(intPart, 10));

  if (decPart === undefined) {
    return hasTrailingComma ? `${formattedInt},` : formattedInt;
  }

  return `${formattedInt},${decPart}`;
}

export function applyArsAmountInputChange(text: string): string {
  return formatArsAmountInput(normalizeArsAmountInput(text));
}

export function parseArsAmountInput(formatted: string): number | null {
  const normalized = normalizeArsAmountInput(formatted);
  if (normalized === '' || normalized === ',') return null;

  const value = Number.parseFloat(normalized.replace(',', '.'));
  return Number.isNaN(value) ? null : value;
}
