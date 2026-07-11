import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';

// Design tokens (Void Eclipse)
const C = {
  background: '#0B0B0B',
  primary: '#2B396D',
  primaryHi: '#5E70B8',
  neutral: '#E4E4E4',
  faint: 'rgba(228,228,228,0.38)',
  hair2: 'rgba(228,228,228,0.055)',
} as const;

// ── Tab configuration ─────────────────────────────────────────────────────────

type TabConfig = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const TABS: TabConfig[] = [
  { name: 'discover', label: 'Discover', icon: 'compass-outline', iconActive: 'compass' },
  { name: 'community', label: 'Community', icon: 'megaphone-outline', iconActive: 'megaphone' },
  { name: 'matches', label: 'Matches', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'profile', label: 'You', icon: 'person-outline', iconActive: 'person' },
];

// ── Custom Tab Bar ────────────────────────────────────────────────────────────

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRouteName = state.routes[state.index]?.name ?? '';

  function handleTabPress(routeName: string) {
    const target = state.routes.find((r) => r.name === routeName)?.key ?? '';
    const event = navigation.emit({
      type: 'tabPress',
      target,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {/* Gradient fade above bar */}
      <LinearGradient
        colors={['transparent', C.background]}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Hair separator */}
      <View style={styles.separator} />

      {/* Tab row */}
      <View style={styles.row}>
        {/* First two tabs */}
        {TABS.slice(0, 2).map((tab) => (
          <TabItem
            key={tab.name}
            tab={tab}
            isActive={activeRouteName === tab.name}
            onPress={() => handleTabPress(tab.name)}
          />
        ))}

        {/* Center FAB (+) */}
        <View style={styles.fabWrapper}>
          <Pressable
            onPress={() => handleTabPress('create-match')}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            accessibilityLabel="Create"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={28} color={C.neutral} />
          </Pressable>
        </View>

        {/* Last two tabs */}
        {TABS.slice(2).map((tab) => (
          <TabItem
            key={tab.name}
            tab={tab}
            isActive={activeRouteName === tab.name}
            onPress={() => handleTabPress(tab.name)}
          />
        ))}
      </View>
    </View>
  );
}

// ── Tab Item ──────────────────────────────────────────────────────────────────

interface TabItemProps {
  tab: TabConfig;
  isActive: boolean;
  onPress: () => void;
}

function TabItem({ tab, isActive, onPress }: TabItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
      accessibilityLabel={tab.label}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <Ionicons
        name={isActive ? tab.iconActive : tab.icon}
        size={24}
        color={isActive ? C.primaryHi : C.faint}
      />
      <Text style={[styles.label, { color: isActive ? C.neutral : C.faint, fontWeight: isActive ? '700' : '500' }]}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: C.background,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -32,
    height: 32,
  },
  separator: {
    height: 1,
    backgroundColor: C.hair2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    maxWidth: 70,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  tabItemPressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.1,
    fontFamily: 'Hanken Grotesk',
  },
  fabWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    marginTop: -10,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.primaryHi,
    ...Platform.select({
      ios: {
        shadowColor: C.primaryHi,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
