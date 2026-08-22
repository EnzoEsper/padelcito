import { useCallback, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, View, Text, Pressable } from '@/tw';
import {
  formatNotificationTime,
  groupNotificationsByDay,
  isNotificationUnread,
  resolveNotificationPresentation,
  type NotificationRow,
} from '@/features/notifications/notification-display';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/use-notifications';

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  surface2: '#1B1C21',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
  hair2: 'rgba(228,228,228,0.055)',
  primaryHi: '#5E70B8',
  success: '#5BE0A6',
  warning: '#E0B15B',
} as const;

const ACCENT: Record<'primary' | 'success' | 'warning', string> = {
  primary: C.primaryHi,
  success: C.success,
  warning: C.warning,
};

type NotificationSection = { label: string; items: NotificationRow[] };

function NotificationRowItem({
  notification,
  onPress,
}: {
  notification: NotificationRow;
  onPress: () => void;
}) {
  const unread = isNotificationUnread(notification);
  const presentation = resolveNotificationPresentation(notification);
  const accent = ACCENT[presentation.accent];

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, unread && styles.rowUnread]}
      accessibilityRole="button"
    >
      <View style={[styles.iconWrap, { borderColor: `${accent}55` }]}>
        <Ionicons name={presentation.icon} size={20} color={accent} />
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text style={[styles.rowTitle, unread && styles.rowTitleUnread]} numberOfLines={1}>
            {presentation.title}
          </Text>
          <Text style={styles.rowTime}>{formatNotificationTime(notification.created_at)}</Text>
        </View>
        <Text style={styles.rowBody} numberOfLines={2}>
          {presentation.body}
        </Text>
        {presentation.actionLabel !== null ? (
          <Text style={styles.reportAction}>{presentation.actionLabel}</Text>
        ) : null}
      </View>
      {unread ? <View style={[styles.unreadDot, { backgroundColor: accent }]} /> : null}
    </Pressable>
  );
}

function NotificationSectionBlock({
  section,
  onPressNotification,
}: {
  section: NotificationSection;
  onPressNotification: (notification: NotificationRow) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{section.label}</Text>
      <View style={styles.groupCard}>
        {section.items.map((notification, index) => (
          <View key={notification.id}>
            <NotificationRowItem
              notification={notification}
              onPress={() => onPressNotification(notification)}
            />
            {index < section.items.length - 1 ? <View style={styles.rowDivider} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isPending, isRefetching, refetch, error } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = useMemo(() => data?.notifications ?? [], [data?.notifications]);
  const sections = useMemo(() => groupNotificationsByDay(notifications), [notifications]);
  const hasUnread = notifications.some(isNotificationUnread);

  const handleNotificationPress = useCallback(
    (notification: NotificationRow) => {
      if (isNotificationUnread(notification)) {
        markRead.mutate(notification.id);
      }

      const route = resolveNotificationPresentation(notification).route;
      if (route !== null) {
        router.push(route);
      }
    },
    [markRead, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: NotificationSection }) => (
      <NotificationSectionBlock section={item} onPressNotification={handleNotificationPress} />
    ),
    [handleNotificationPress],
  );

  const keyExtractor = useCallback((item: NotificationSection) => item.label, []);

  const listHeader = useMemo(
    () => (
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={C.mist} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.screenLabel}>INBOX</Text>
          <Text style={styles.screenTitle}>Notifications</Text>
        </View>
        {hasUnread ? (
          <Pressable
            onPress={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            style={styles.markAllButton}
            accessibilityLabel="Mark all as read"
            accessibilityRole="button"
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={styles.markAllPlaceholder} />
        )}
      </View>
    ),
    [hasUnread, markAllRead, router],
  );

  const listEmpty = useMemo(() => {
    if (isPending) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={C.mist} />
        </View>
      );
    }
    if (error !== null) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>Could not load notifications.</Text>
          <Pressable onPress={() => void refetch()}>
            <Text style={styles.errorAction}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.emptyCard}>
        <Ionicons name="notifications-off-outline" size={28} color={C.faint} />
        <Text style={styles.emptyTitle}>No notifications yet</Text>
        <Text style={styles.emptyText}>
          Match updates like join requests and roster changes will appear here.
        </Text>
      </View>
    );
  }, [error, isPending, refetch]);

  return (
    <FlashList
      className="flex-1 bg-background"
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      data={sections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor={C.mist}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
    backgroundColor: C.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  screenLabel: {
    fontFamily: 'Space Mono',
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: C.dim,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  screenTitle: {
    fontFamily: 'HankenGrotesk-ExtraBold',
    fontSize: 24,
    color: C.mist,
    letterSpacing: -0.5,
  },
  markAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  markAllPlaceholder: {
    width: 88,
  },
  markAllText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: C.primaryHi,
  },
  group: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  groupLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 2,
    color: C.dim,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  groupCard: {
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowUnread: {
    backgroundColor: C.surface2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  rowTitle: {
    flex: 1,
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 14.5,
    color: C.dim,
  },
  rowTitleUnread: {
    color: C.mist,
  },
  rowTime: {
    fontFamily: 'Space Mono',
    fontSize: 10,
    letterSpacing: 0.5,
    color: C.faint,
    textTransform: 'uppercase',
  },
  rowBody: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 18,
    color: C.dim,
  },
  reportAction: {
    marginTop: 8,
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.warning,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  rowDivider: {
    height: 1,
    backgroundColor: C.hair2,
    marginLeft: 66,
  },
  centerState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  errorCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(224,177,91,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(224,177,91,0.30)',
    borderRadius: 16,
    padding: 16,
  },
  errorText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 20,
    color: C.warning,
    marginBottom: 12,
  },
  errorAction: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: C.warning,
  },
  emptyCard: {
    marginHorizontal: 20,
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.hair,
    borderRadius: 20,
  },
  emptyTitle: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 15,
    color: C.dim,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 19,
    color: C.faint,
    textAlign: 'center',
  },
});
