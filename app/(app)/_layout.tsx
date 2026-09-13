import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import { TabBar } from "@/components/tab-bar";
import { useNotificationsRealtime } from "@/features/notifications/use-notifications";
import {
  usePushNotificationResponse,
  usePushRegistration,
} from "@/features/notifications/use-push-registration";
import { useModerationPostsRealtime } from "@/features/community/use-post-realtime";
import { useProfileContactGate } from "@/features/community/use-posts";
import { ensurePadelSport } from "@/lib/padel-sport";
import { BannedUserBanner } from "@/components/banned-user-banner";

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

function PushNotifications() {
  usePushRegistration();
  usePushNotificationResponse();
  return null;
}

function PostsModerationRealtime() {
  const { data: contactGate } = useProfileContactGate();
  useModerationPostsRealtime(contactGate?.isModerator === true);
  return null;
}

export default function AppLayout() {
  return (
    <>
      <PadelSportPrefetch />
      <NotificationsRealtime />
      <PushNotifications />
      <PostsModerationRealtime />
      <View style={styles.root}>
        <View style={styles.tabs}>
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
          options={{ href: null, tabBarStyle: { display: "none" } }}
        />
        <Tabs.Screen
          name="create-post"
          options={{ href: null, tabBarStyle: { display: "none" } }}
        />
        <Tabs.Screen name="match-detail" options={{ href: null }} />
        <Tabs.Screen name="post-detail" options={{ href: null }} />
        <Tabs.Screen name="moderation" options={{ href: null }} />
        <Tabs.Screen name="user-reports" options={{ href: null }} />
        <Tabs.Screen name="moderation-banned-users" options={{ href: null }} />
        <Tabs.Screen name="my-posts" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="report-penalty" options={{ href: null }} />
        <Tabs.Screen name="rate-match" options={{ href: null }} />
        <Tabs.Screen name="account-settings" options={{ href: null }} />
        <Tabs.Screen name="blocked-users" options={{ href: null }} />
          </Tabs>
        </View>
        <BannedUserBanner />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  tabs: {
    flex: 1,
  },
});
