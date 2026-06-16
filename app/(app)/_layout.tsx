import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/tab-bar';
import { ensurePadelSport } from '@/lib/padel-sport';

function PadelSportPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    void ensurePadelSport(queryClient);
  }, [queryClient]);

  return null;
}

export default function AppLayout() {
  return (
    <>
      <PadelSportPrefetch />
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
    </>
  );
}
