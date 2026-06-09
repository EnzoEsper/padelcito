import { Stack } from 'expo-router';

// TODO(Step 1.3): Replace with the tab-based navigation layout.
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0B' } }} />
  );
}
