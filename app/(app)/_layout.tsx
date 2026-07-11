import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/tab-bar';
import { useNotificationsRealtime } from '@/features/notifications/use-notifications';
import { ensurePadelSport } from '@/lib/padel-sport';

function PadelSportPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    void ensurePadelSport(queryClient);
  }, [queryClient]);

  return null;
}

function NotificationsRealtime() {
  useNotificationsRealtime();
  return null;
}

export default function AppLayout() {
  return (
    <>
      <PadelSportPrefetch />
      <NotificationsRealtime />
      <Tabs
        initialRouteName="profile"
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <TabBar {...props} />}
      >
        <Tabs.Screen name="discover" />
        <Tabs.Screen name="community" />
        <Tabs.Screen name="matches" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen
          name="create-match"
          options={{ href: null, tabBarStyle: { display: 'none' } }}
        />
        <Tabs.Screen name="create-flyer" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="match-detail" options={{ href: null }} />
        <Tabs.Screen name="flyer-detail" options={{ href: null }} />
        <Tabs.Screen name="moderation" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="report-penalty" options={{ href: null }} />
        <Tabs.Screen name="rate-match" options={{ href: null }} />
      </Tabs>
    </>
  );
}
