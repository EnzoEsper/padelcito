import { tryParseArgentinaWhatsAppToE164 } from '@/lib/argentina-whatsapp-phone';
import { supabase } from '@/lib/supabase';

const VERIFY_PHONE_FUNCTION = 'verify-phone';
const CLIENT_TIMEOUT_MS = 20_000;

export type VerifyPhoneChannel = 'whatsapp' | 'dev';

export class PhoneVerificationClientError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PhoneVerificationClientError';
    this.status = status;
  }
}

function parseErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const errorField = (data as { error: unknown }).error;
    if (typeof errorField === 'string' && errorField.length > 0) {
      return errorField;
    }
  }
  return fallback;
}

async function messageFromFunctionInvokeError(error: {
  message: string;
  context?: Response;
}): Promise<string> {
  const context = error.context;
  if (context !== undefined) {
    try {
      const payload: unknown = await context.clone().json();
      const parsed = parseErrorMessage(payload, '');
      if (parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Response body is not JSON; fall back to generic invoke message.
    }
  }
  return error.message;
}

async function invokeVerifyPhone(body: Record<string, unknown>): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const { data, error } = await supabase.functions.invoke(VERIFY_PHONE_FUNCTION, {
      body,
    });

    if (typeof data === 'object' && data !== null && 'error' in data) {
      throw new PhoneVerificationClientError(
        parseErrorMessage(data, 'Verification request failed.'),
        400,
      );
    }

    if (error !== null) {
      const message = await messageFromFunctionInvokeError(error);
      throw new PhoneVerificationClientError(message, 502);
    }

    return data;
  } catch (invokeError: unknown) {
    if (invokeError instanceof PhoneVerificationClientError) {
      throw invokeError;
    }
    if (invokeError instanceof Error && invokeError.name === 'AbortError') {
      throw new PhoneVerificationClientError('Verification timed out. Try again.', 408);
    }
    const message =
      invokeError instanceof Error ? invokeError.message : 'Verification request failed.';
    throw new PhoneVerificationClientError(message, 502);
  } finally {
    clearTimeout(timeoutId);
  }
}

function requireCanonicalPhone(phone: string): string {
  const canonical = tryParseArgentinaWhatsAppToE164(phone);
  if (canonical === null) {
    throw new PhoneVerificationClientError(
      'Enter a valid Argentine mobile number, e.g. 11 2345-6789',
    );
  }
  return canonical;
}

export async function startPhoneVerification(input: {
  phone: string;
  resend?: boolean;
}): Promise<{ channel: VerifyPhoneChannel }> {
  const body: Record<string, unknown> = {
    action: 'start',
    phone: requireCanonicalPhone(input.phone),
    channel: 'whatsapp',
  };
  if (input.resend === true) {
    body.resend = true;
  }

  const data = await invokeVerifyPhone(body);

  if (typeof data === 'object' && data !== null && 'error' in data) {
    throw new PhoneVerificationClientError(
      parseErrorMessage(data, 'Could not send verification code.'),
    );
  }

  if (typeof data === 'object' && data !== null && 'devMode' in data && data.devMode === true) {
    return { channel: 'dev' };
  }

  return { channel: 'whatsapp' };
}

export async function checkPhoneVerification(input: {
  phone: string;
  code: string;
}): Promise<void> {
  const data = await invokeVerifyPhone({
    action: 'check',
    phone: requireCanonicalPhone(input.phone),
    code: input.code,
  });

  if (typeof data === 'object' && data !== null && 'error' in data) {
    throw new PhoneVerificationClientError(
      parseErrorMessage(data, 'Invalid verification code.'),
    );
  }

  if (
    typeof data !== 'object' ||
    data === null ||
    !('verified' in data) ||
    (data as { verified: unknown }).verified !== true
  ) {
    throw new PhoneVerificationClientError('Could not complete verification.');
  }
}
