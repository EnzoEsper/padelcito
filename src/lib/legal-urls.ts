/**
 * Public legal document URLs for store listings and in-app links.
 * Host the markdown files under docs/legal/ before submission.
 */
export const LEGAL_URLS = {
  privacyPolicy:
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ??
    'https://padelcito.app/legal/privacy-policy',
  termsOfService:
    process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://padelcito.app/legal/terms-of-service',
  accountDeletion:
    process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ??
    'https://padelcito.app/legal/account-deletion',
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@padelcito.app',
} as const;

export function hasConfiguredLegalUrls(): boolean {
  return (
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL !== undefined &&
    process.env.EXPO_PUBLIC_TERMS_URL !== undefined
  );
}
