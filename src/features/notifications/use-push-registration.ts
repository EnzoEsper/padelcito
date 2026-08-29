import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToAuthChanges } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { notificationKeys } from '@/features/notifications/use-notifications';

const ANDROID_CHANNEL_ID = 'default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function resolveEasProjectId(): string | null {
  const easConfig = Constants.expoConfig?.extra?.eas;
  if (
    easConfig !== undefined &&
    typeof easConfig === 'object' &&
    easConfig !== null &&
    'projectId' in easConfig &&
    typeof easConfig.projectId === 'string' &&
    easConfig.projectId.length > 0
  ) {
    return easConfig.projectId;
  }

  const easProjectId = Constants.easConfig?.projectId;
  if (typeof easProjectId === 'string' && easProjectId.length > 0) {
    return easProjectId;
  }

  return null;
}

async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#5BE0A6',
  });
}

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error !== null || user === null) {
    return null;
  }

  return user.id;
}

async function upsertPushToken(expoPushToken: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (userId === null) {
    return;
  }

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const deviceId =
    typeof Device.modelName === 'string' && Device.modelName.length > 0
      ? Device.modelName
      : null;

  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: expoPushToken,
      device_id: deviceId,
      platform,
      enabled: true,
    },
    { onConflict: 'expo_push_token' },
  );

  if (error !== null) {
    throw error;
  }
}

async function disablePushToken(expoPushToken: string | null): Promise<void> {
  if (expoPushToken === null) {
    return;
  }

  const userId = await getCurrentUserId();
  if (userId === null) {
    return;
  }

  const { error } = await supabase
    .from('push_tokens')
    .update({ enabled: false })
    .eq('user_id', userId)
    .eq('expo_push_token', expoPushToken);

  if (error !== null) {
    logger.warn('[push] Failed to disable push token on sign-out', error);
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    logger.info('[push] Push registration skipped on simulator/emulator');
    return null;
  }

  await ensureAndroidNotificationChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    logger.info('[push] Notification permission not granted');
    return null;
  }

  const projectId = resolveEasProjectId();
  if (projectId === null) {
    logger.warn('[push] Missing EAS projectId — cannot register Expo push token');
    return null;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenResponse.data;

  await upsertPushToken(expoPushToken);
  logger.info('[push] Registered Expo push token');

  return expoPushToken;
}

function isRouteString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function navigateFromNotificationData(
  router: ReturnType<typeof useRouter>,
  data: Record<string, unknown> | undefined,
): void {
  if (data === undefined) {
    return;
  }

  const route = data.route;
  if (!isRouteString(route)) {
    return;
  }

  router.push(route as never);
}

export function usePushRegistration(): void {
  const pushTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const userId = await getCurrentUserId();
      if (cancelled || userId === null) {
        return;
      }

      try {
        const token = await registerForPushNotifications();
        if (!cancelled) {
          pushTokenRef.current = token;
        }
      } catch (err) {
        logger.warn('[push] Registration failed', err);
      }
    })();

    const subscription = subscribeToAuthChanges((event, session) => {
      if (event === 'SIGNED_OUT') {
        void disablePushToken(pushTokenRef.current);
        pushTokenRef.current = null;
        return;
      }

      if (session !== null) {
        void registerForPushNotifications()
          .then((token) => {
            pushTokenRef.current = token;
          })
          .catch((err) => {
            logger.warn('[push] Re-registration after sign-in failed', err);
          });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);
}

export function usePushNotificationResponse(): void {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response === null) {
        return;
      }

      const data = response.notification.request.content.data;
      navigateFromNotificationData(
        router,
        typeof data === 'object' && data !== null && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : undefined,
      );
    });

    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        navigateFromNotificationData(
          router,
          typeof data === 'object' && data !== null && !Array.isArray(data)
            ? (data as Record<string, unknown>)
            : undefined,
        );
      },
    );

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [queryClient, router]);
}
