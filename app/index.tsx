import { View, ActivityIndicator } from 'react-native';

/**
 * Root index route — rendered at "/" on first launch.
 * The root layout's auth guard (app/_layout.tsx) reads the session from
 * expo-secure-store and immediately redirects to the right destination:
 *   · No session            → /(auth)/login
 *   · Session, no profile   → /(onboarding)/profile
 *   · Session + profile     → /(app)/discover
 *
 * This screen is visible for only the brief moment before that redirect fires.
 */
export default function IndexScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B0B', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#5E70B8" size="small" />
    </View>
  );
}
