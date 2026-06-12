import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';

// Design tokens (Void Eclipse)
const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  primary: '#2B396D',
  primaryHi: '#5E70B8',
  neutral: '#E4E4E4',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
  hair2: 'rgba(228,228,228,0.055)',
  glow: 'rgba(94,112,184,0.45)',
} as const;

// ── Icon primitives ──────────────────────────────────────────────────────────

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function CompassIcon({ size = 24, color = C.neutral, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Circle cx="12" cy="12" r="9" strokeLinecap="round" />
      <Path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" strokeLinejoin="round" />
    </Svg>
  );
}

function TrophyIcon({ size = 24, color = C.neutral, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M7 4h10v3a5 5 0 01-10 0V4z" />
      <Path d="M7 5H4v1a3 3 0 003 3M17 5h3v1a3 3 0 01-3 3M9.5 12.5L9 17h6l-.5-4.5M8 20h8" />
    </Svg>
  );
}

function PlusIcon({ size = 26, color = C.neutral, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

function CalendarIcon({ size = 24, color = C.neutral, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M3.5 5A1.5 1.5 0 015 3.5h14A1.5 1.5 0 0120.5 5v14a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 19V5z" />
      <Path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
    </Svg>
  );
}

function UserIcon({ size = 24, color = C.neutral, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Circle cx="12" cy="8.5" r="3.8" />
      <Path d="M5 20a7 7 0 0114 0" strokeLinecap="round" />
    </Svg>
  );
}

// ── Tab configuration ─────────────────────────────────────────────────────────

type TabConfig = {
  name: string;
  label: string;
  Icon: React.FC<IconProps>;
};

const TABS: TabConfig[] = [
  { name: 'discover', label: 'Discover', Icon: CompassIcon },
  { name: 'circuits', label: 'Circuits', Icon: TrophyIcon },
  { name: 'matches', label: 'Matches', Icon: CalendarIcon },
  { name: 'profile', label: 'You', Icon: UserIcon },
];

// ── Custom Tab Bar ────────────────────────────────────────────────────────────

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const activeRouteName = state.routes[state.index]?.name ?? '';

  function handleTabPress(routeName: string) {
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes.find((r) => r.name === routeName)?.key ?? '',
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }

  function handleCreatePress() {
    // Future: open create match modal
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {/* Gradient fade above the bar */}
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
        {TABS.slice(0, 2).map((tab) => {
          const isActive = activeRouteName === tab.name;
          return (
            <TabItem
              key={tab.name}
              tab={tab}
              isActive={isActive}
              onPress={() => handleTabPress(tab.name)}
            />
          );
        })}

        {/* Center FAB (+) */}
        <View style={styles.fabWrapper}>
          <Pressable
            onPress={handleCreatePress}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            accessibilityLabel="Create"
            accessibilityRole="button"
          >
            <PlusIcon size={26} color={C.neutral} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Last two tabs */}
        {TABS.slice(2).map((tab) => {
          const isActive = activeRouteName === tab.name;
          return (
            <TabItem
              key={tab.name}
              tab={tab}
              isActive={isActive}
              onPress={() => handleTabPress(tab.name)}
            />
          );
        })}
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
  const iconColor = isActive ? C.primaryHi : C.faint;
  const labelColor = isActive ? C.neutral : C.faint;
  const strokeWidth = isActive ? 2 : 1.7;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
      accessibilityLabel={tab.label}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <tab.Icon size={24} color={iconColor} strokeWidth={strokeWidth} />
      <Text
        style={[
          styles.label,
          { color: labelColor, fontWeight: isActive ? '700' : '500' },
        ]}
        numberOfLines={1}
      >
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
