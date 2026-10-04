import {
  argentinaWhatsAppLocalSchema,
  formatArgentinaWhatsAppLocalInput,
  parseArgentinaWhatsAppToE164,
} from '@/lib/argentina-whatsapp-phone';

describe('parseArgentinaWhatsAppToE164', () => {
  it('normalizes common Argentine mobile formats to +5491123456789', () => {
    const samples = ['11 2345-6789', '011 15 2345-6789', '+54 9 11 2345 6789'];
    for (const sample of samples) {
      const result = parseArgentinaWhatsAppToE164(sample);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.e164).toBe('+5491123456789');
      }
    }
  });

  it('rejects empty as empty e164 for direct parse helper', () => {
    const result = parseArgentinaWhatsAppToE164('');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.e164).toBe('');
    }
  });

  it('rejects too short input', () => {
    const result = parseArgentinaWhatsAppToE164('123');
    expect(result.ok).toBe(false);
  });

  it('rejects non-mobile when clearly invalid', () => {
    const result = parseArgentinaWhatsAppToE164('0000000000');
    expect(result.ok).toBe(false);
  });
});

describe('argentinaWhatsAppLocalSchema', () => {
  it('maps empty string to null', () => {
    expect(argentinaWhatsAppLocalSchema.parse('')).toBeNull();
  });

  it('maps valid local digits to E.164', () => {
    expect(argentinaWhatsAppLocalSchema.parse('91123456789')).toBe('+5491123456789');
  });
});

describe('formatArgentinaWhatsAppLocalInput', () => {
  it('round-trips stored E.164 to local digits for the +54 field', () => {
    const local = formatArgentinaWhatsAppLocalInput('+5491123456789');
    expect(local.replace(/\D/g, '')).toBe('1123456789');
    expect(argentinaWhatsAppLocalSchema.parse(local)).toBe('+5491123456789');
  });

  it('returns empty for null', () => {
    expect(formatArgentinaWhatsAppLocalInput(null)).toBe('');
  });
});
