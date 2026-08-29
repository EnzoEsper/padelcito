import type { ExpoConfig } from 'expo/config';
import appJson from './app.json';

const base = appJson.expo as ExpoConfig;

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const isDevelopmentEasBuild = process.env.EAS_BUILD_PROFILE === 'development';
const disableSentryAutoUpload =
  process.env.SENTRY_DISABLE_AUTO_UPLOAD === 'true' || isDevelopmentEasBuild;

const IOS_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';

function iosUrlSchemeFromClientId(clientId: string): string {
  if (!clientId.endsWith(IOS_CLIENT_ID_SUFFIX)) {
    throw new Error(
      `[padelcito] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must end with "${IOS_CLIENT_ID_SUFFIX}"`,
    );
  }
  return `com.googleusercontent.apps.${clientId.slice(0, -IOS_CLIENT_ID_SUFFIX.length)}`;
}

if (process.env.EAS_BUILD === 'true' && (googleMapsApiKey === undefined || googleMapsApiKey.length === 0)) {
  console.warn(
    '[padelcito] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is missing during EAS build. ' +
      'Android maps will crash. Run: eas env:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ' +
      '--value "<key>" --environment development --visibility plaintext',
  );
}

if (
  process.env.EAS_BUILD === 'true' &&
  process.env.EAS_BUILD_PLATFORM === 'ios' &&
  (iosClientId === undefined || iosClientId.length === 0)
) {
  console.warn(
    '[padelcito] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is missing during iOS EAS build. ' +
      'Google Sign-In URL schemes will not be embedded. Create an iOS OAuth client in Google Cloud ' +
      '(bundle com.padelcito.app) and run: eas env:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ' +
      '--value "<client-id>" --environment development --visibility plaintext',
  );
}

const plugins: NonNullable<ExpoConfig['plugins']> = [
  ...(base.plugins ?? []),
  [
    'expo-build-properties',
    {
      ios: {
        // GoogleSignIn 9.x can resolve AppCheckCore 11.3.0, which breaks static CocoaPods on Expo 56.
        // Pin below 11.3.0 — see https://github.com/react-native-google-signin/google-signin/issues/1517
        extraPods: [{ name: 'AppCheckCore', version: '11.2.0' }],
      },
    },
  ],
  'expo-font',
  [
    'react-native-maps',
    {
      // Plugin prop names from react-native-maps/app.plugin.js (not `googleMapsApiKey`).
      androidGoogleMapsApiKey: googleMapsApiKey,
    },
  ],
];

if (iosClientId !== undefined && iosClientId.length > 0) {
  plugins.push([
    '@react-native-google-signin/google-signin',
    { iosUrlScheme: iosUrlSchemeFromClientId(iosClientId) },
  ]);
}

// Native upload hooks require org + project. Runtime reporting still works via EXPO_PUBLIC_SENTRY_DSN.
if (sentryOrg !== undefined && sentryOrg.length > 0 && sentryProject !== undefined && sentryProject.length > 0) {
  plugins.push([
    '@sentry/react-native/expo',
    {
      organization: sentryOrg,
      project: sentryProject,
      disableAutoUpload: disableSentryAutoUpload,
    },
  ]);
} else if (process.env.EAS_BUILD === 'true' && !disableSentryAutoUpload) {
  console.warn(
    '[padelcito] SENTRY_ORG / SENTRY_PROJECT not set — Sentry source map upload is skipped. ' +
      'Set both in the EAS environment for production builds, or SENTRY_DISABLE_AUTO_UPLOAD=true for dev.',
  );
}

const config: ExpoConfig = {
  ...base,
  plugins,
};

export default config;
