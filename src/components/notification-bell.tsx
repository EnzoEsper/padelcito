import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from '@/tw';
import { useUnreadNotificationCount } from '@/features/notifications/use-notifications';

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  mist: '#E4E4E4',
  blueHi: '#7488D8',
  hair: 'rgba(228,228,228,0.10)',
} as const;

export function NotificationBell() {
  const router = useRouter();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const hasUnread = unreadCount > 0;

  return (
    <Pressable
      onPress={() => router.push('/(app)/notifications')}
      style={styles.headerIcon}
      accessibilityLabel={
        hasUnread ? `Notifications, ${unreadCount} unread` : 'Notifications'
      }
      accessibilityRole="button"
    >
      <Ionicons name="notifications-outline" size={20} color={C.mist} />
      {hasUnread ? <View style={styles.headerDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.blueHi,
    borderWidth: 2,
    borderColor: C.background,
  },
});
