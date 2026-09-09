/**
 * Maps Supabase / PostgREST errors to stable user-facing strings.
 * Log the raw error with logger.error before calling this helper.
 */
export function toUserFacingError(error: unknown, fallback: string): string {
  if (error === null || error === undefined) {
    return fallback;
  }

  const message = extractMessage(error);
  if (message === null) {
    return fallback;
  }

  const lower = message.toLowerCase();

  if (lower.includes('jwt') || lower.includes('session') || lower.includes('not authenticated')) {
    return 'Your session expired. Please sign in again.';
  }

  if (lower.includes('permission denied') || lower.includes('row-level security')) {
    return 'You do not have permission to perform this action.';
  }

  if (lower.includes('duplicate key') || lower.includes('unique constraint')) {
    return 'This action was already completed or conflicts with existing data.';
  }

  if (lower.includes('network') || lower.includes('fetch failed') || lower.includes('failed to fetch')) {
    return 'Network error. Check your connection and try again.';
  }

  if (lower.includes('invalid login credentials') || lower.includes('invalid otp')) {
    return 'Invalid code or email. Please try again.';
  }

  if (lower.includes('email rate limit') || lower.includes('too many requests') || lower.includes('too many searches')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (lower.includes('cannot join this match') || lower.includes('contact is not available')) {
    return 'This action is not available for this match.';
  }

  if (lower.includes('authentication required')) {
    return 'Please sign in to continue.';
  }

  // Auth API errors with safe, known messages can pass through.
  if (isLikelyAuthClientMessage(message)) {
    return message;
  }

  return fallback;
}

function extractMessage(error: unknown): string | null {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message.trim();
    }
  }

  return null;
}

function isLikelyAuthClientMessage(message: string): boolean {
  const safePatterns = [
    /^invalid email/i,
    /^email not confirmed/i,
    /^user already registered/i,
    /^signup requires/i,
  ];
  return safePatterns.some((pattern) => pattern.test(message));
}

/** @deprecated Use toUserFacingError instead */
export function getErrorMessage(error: unknown, fallback: string): string {
  return toUserFacingError(error, fallback);
}
