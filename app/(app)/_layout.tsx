import { Tabs } from 'expo-router';
import { TabBar } from '@/components/tab-bar';

export default function AppLayout() {
  return (
    <Tabs
      initialRouteName="profile"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="circuits" />
      <Tabs.Screen name="matches" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="create-match" options={{ href: null }} />
      <Tabs.Screen name="match-detail" options={{ href: null }} />
    </Tabs>
  );
}
