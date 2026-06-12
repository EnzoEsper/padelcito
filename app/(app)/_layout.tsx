import { Tabs } from 'expo-router';
import { TabBar } from '@/components/tab-bar';

export default function AppLayout() {
  return (
    <Tabs
      initialRouteName="discover"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    />
  );
}
