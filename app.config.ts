import type { ExpoConfig } from 'expo/config';
import appJson from './app.json';

const base = appJson.expo as ExpoConfig;

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

if (process.env.EAS_BUILD === 'true' && (googleMapsApiKey === undefined || googleMapsApiKey.length === 0)) {
  console.warn(
    '[padelcito] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is missing during EAS build. ' +
      'Android maps will crash. Run: eas env:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ' +
      '--value "<key>" --environment development --visibility plaintext',
  );
}

const config: ExpoConfig = {
  ...base,
  plugins: [
    ...(base.plugins ?? []),
    'expo-font',
    [
      'react-native-maps',
      {
        // Plugin prop names from react-native-maps/app.plugin.js (not `googleMapsApiKey`).
        androidGoogleMapsApiKey: googleMapsApiKey,
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
  ],
};

export default config;
