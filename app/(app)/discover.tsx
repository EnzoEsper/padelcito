import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, View, Text, Pressable } from '@/tw';
import { useDiscoverMatches, type MatchSummary } from '@/features/matches/use-matches';
import { formatDiscoverMatchWhen } from '@/lib/match-time';
import { formatDistanceKm } from '@/features/matches/match-display';
import { useDiscoverMatchesRealtime } from '@/features/matches/use-match-realtime';
import { NotificationBell } from '@/components/notification-bell';
import { SearchRadiusSlider } from '@/features/discover/components/search-radius-slider';
import { SEARCH_RADIUS_DEFAULT_KM } from '@/features/discover/search-radius';
import {
  useDiscoverLocation,
  type LocationAccessStatus,
} from '@/features/discover/use-discover-location';

type SkillFilter = 'All' | 'A' | 'B' | 'C';
type ViewMode = 'list' | 'map';

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  surface2: '#1B1C21',
  surface3: '#232429',
  blue: '#2B396D',
  blueMid: '#5E70B8',
  blueHi: '#7488D8',
  mist: '#E4E4E4',
  label: 'rgba(228,228,228,0.72)',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  ghost: 'rgba(228,228,228,0.20)',
  hair: 'rgba(228,228,228,0.10)',
  hair2: 'rgba(228,228,228,0.055)',
  warning: '#E0B15B',
} as const;

const SKILL_LABEL: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: 'A · Pro',
  B: 'B · Adv',
  C: 'C · Int',
  D: 'D · Beg',
};

const AVATAR_TONES: [string, string][] = [
  ['#2B396D', '#E4E4E4'],
  ['#3A4A86', '#E4E4E4'],
  ['#202126', '#E4E4E4'],
  ['#4458A6', '#0B0B0B'],
  ['#2A2B30', '#E4E4E4'],
];

function skillBadge(match: MatchSummary): 'A' | 'B' | 'C' | 'D' {
  const level = match.skill_max ?? match.skill_min;
  switch (level) {
    case 'pro':
    case 'expert':
      return 'A';
    case 'advanced':
      return 'B';
    case 'intermediate':
      return 'C';
    case 'beginner':
      return 'D';
    default:
      return 'B';
  }
}

function headerLocationLabel(
  status: LocationAccessStatus,
  placeLabel: string | null,
): string {
  if (status === 'ready' && placeLabel !== null) return placeLabel;
  if (status === 'locating' || status === 'idle') return 'Locating…';
  return 'Location unavailable';
}

function LocationGate({
  status,
  message,
  onRetry,
  onOpenSettings,
}: {
  status: LocationAccessStatus;
  message: string | null;
  onRetry: () => void;
  onOpenSettings: () => void;
}) {
  if (status === 'idle' || status === 'locating') {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={C.mist} />
        <Text style={styles.gateTitle}>Finding your location…</Text>
        <Text style={styles.gateText}>
          We need your location to show nearby padel matches.
        </Text>
      </View>
    );
  }

  const showSettings = status === 'blocked' || status === 'services_disabled';
  const actionLabel = showSettings ? 'Open Settings' : status === 'denied' ? 'Enable Location' : 'Try Again';

  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorText}>
        {message ?? 'Location is required to discover nearby matches.'}
      </Text>
      <Pressable
        onPress={() => void (showSettings ? onOpenSettings() : onRetry())}
      >
        <Text style={styles.errorAction}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function playerInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function FilterChips({
  value,
  onChange,
}: {
  value: SkillFilter;
  onChange: (value: SkillFilter) => void;
}) {
  const chips: SkillFilter[] = ['All', 'A', 'B', 'C'];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-7"
      contentContainerStyle={styles.chipRow}
    >
      <View style={styles.filterIconChip}>
        <Ionicons name="options-outline" size={17} color={C.dim} />
      </View>
      {chips.map((chip) => {
        const active = value === chip;
        return (
          <Pressable
            key={chip}
            onPress={() => onChange(chip)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {chip === 'All' ? 'All levels' : `Level ${chip}`}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <View style={styles.viewToggle}>
      {(['list', 'map'] as const).map((mode) => {
        const active = value === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => onChange(mode)}
            style={[styles.viewToggleItem, active && styles.viewToggleItemActive]}
          >
            <Ionicons
              name={mode === 'list' ? 'list' : 'map-outline'}
              size={18}
              color={active ? C.mist : C.faint}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function AvatarBubble({
  name,
  index,
}: {
  name: string;
  index: number;
}) {
  const tone = AVATAR_TONES[index % AVATAR_TONES.length] ?? AVATAR_TONES[0];

  return (
    <View
      style={[
        styles.avatarBubble,
        {
          backgroundColor: tone[0],
          marginLeft: index === 0 ? 0 : -10,
        },
      ]}
    >
      <Text style={[styles.avatarText, { color: tone[1] }]}>{playerInitials(name)}</Text>
    </View>
  );
}

function EmptySpot({ index }: { index: number }) {
  return (
    <View style={[styles.emptySpot, { marginLeft: index === 0 ? 0 : -10 }]}>
      <Ionicons name="add" size={13} color={C.faint} />
    </View>
  );
}

function SkillBadge({ level }: { level: 'A' | 'B' | 'C' | 'D' }) {
  const isPrimary = level === 'A' || level === 'B';
  return (
    <View style={[styles.skillBadge, isPrimary ? styles.skillBadgePrimary : styles.skillBadgeMuted]}>
      <Text style={[styles.skillBadgeText, isPrimary ? styles.skillBadgeTextPrimary : styles.skillBadgeTextMuted]}>
        {SKILL_LABEL[level]}
      </Text>
    </View>
  );
}

function MatchCard({ match, onPress }: { match: MatchSummary; onPress: () => void }) {
  const hostName = match.host?.display_name ?? 'Player';
  const { day, time } = formatDiscoverMatchWhen(match.starts_at);
  const filled = match.totalFilled;
  const openSpots = match.joinSpotsRemaining;
  const level = skillBadge(match);
  const full = match.isJoinFull || match.status === 'full';
  const avatarNames = [hostName, match.sport?.name ?? 'Player', match.venue_name ?? 'Match'];
  const accentColors =
    level === 'A'
      ? ([C.blueHi, C.blueMid] as const)
      : level === 'B'
        ? ([C.blueMid, C.blue] as const)
        : ([C.surface3, 'rgba(228,228,228,0.18)'] as const);

  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
    >
      <LinearGradient
        colors={accentColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.cardAccent}
      />

      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {match.venue_name ?? match.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.inline}>
              <Ionicons name="calendar-outline" size={13} color={C.faint} />
              <Text style={styles.metaText}>{day} · {time}</Text>
            </View>
            <View style={styles.inline}>
              <Ionicons name="time-outline" size={13} color={C.faint} />
              <Text style={styles.metaMono}>{match.duration_minutes}M</Text>
            </View>
          </View>
        </View>
        <View style={styles.distancePill}>
          <Ionicons name="location-outline" size={12} color={C.blueHi} />
          <Text style={styles.distanceText}>
            {match.distanceM !== undefined ? formatDistanceKm(match.distanceM) : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <View style={styles.playersWrap}>
          <View style={styles.avatarStack}>
            {avatarNames.slice(0, Math.min(filled, 3)).map((name, index) => (
              <AvatarBubble key={`${match.id}-${name}-${index}`} name={name} index={index} />
            ))}
            {Array.from({ length: Math.min(openSpots, 2) }).map((_, index) => (
              <EmptySpot key={`${match.id}-empty-${index}`} index={filled + index} />
            ))}
          </View>
          <View>
            <Text style={[styles.playerCount, full && styles.playerCountFull]}>
              {filled}<Text style={styles.playerTotal}>/{match.capacity}</Text>
            </Text>
            <Text style={styles.playerLabel}>{full ? 'Full' : 'Players'}</Text>
          </View>
        </View>

        <View style={styles.footerRight}>
          <SkillBadge level={level} />
          <Ionicons name="chevron-forward" size={18} color={C.ghost} />
        </View>
      </View>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    status: locationStatus,
    coords,
    placeLabel,
    errorMessage,
    saveWarning,
    retry: retryLocation,
    openSettings,
  } = useDiscoverLocation();
  const locationReady = locationStatus === 'ready' && coords !== null;
  const [searchRadiusKm, setSearchRadiusKm] = useState(SEARCH_RADIUS_DEFAULT_KM);

  useDiscoverMatchesRealtime();
  const { data: matches, isPending, isRefetching, refetch, error } = useDiscoverMatches(
    locationReady ? coords : null,
    searchRadiusKm,
  );
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const filteredMatches = useMemo(() => {
    const source = matches ?? [];
    return source.filter((match) => skillFilter === 'All' || skillBadge(match) === skillFilter);
  }, [matches, skillFilter]);

  const locationLabel = headerLocationLabel(locationStatus, placeLabel);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={styles.content}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={C.blueHi} />
            <Text style={styles.locationText}>{locationLabel}</Text>
          </View>
          <Text style={styles.title}>Discover</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.headerIcon}>
            <Ionicons name="sunny-outline" size={20} color={C.mist} />
          </View>
          <NotificationBell />
        </View>
      </View>

      {!locationReady ? (
        <LocationGate
          status={locationStatus}
          message={errorMessage}
          onRetry={() => void retryLocation()}
          onOpenSettings={() => void openSettings()}
        />
      ) : (
        <>
          {saveWarning !== null ? (
            <View style={styles.saveWarningCard}>
              <Text style={styles.saveWarningText}>{saveWarning}</Text>
            </View>
          ) : null}

          <SearchRadiusSlider radiusKm={searchRadiusKm} onRadiusCommit={setSearchRadiusKm} />
          <FilterChips value={skillFilter} onChange={setSkillFilter} />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {filteredMatches.length} Open Nearby
            </Text>
            <View style={styles.sectionRight}>
              {isRefetching ? <ActivityIndicator color={C.mist} size="small" /> : null}
              <ViewToggle value={viewMode} onChange={setViewMode} />
            </View>
          </View>

          {isPending ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={C.mist} />
            </View>
          ) : error !== null ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                Could not load matches.
              </Text>
              <Pressable onPress={() => void refetch()}>
                <Text style={styles.errorAction}>
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : viewMode === 'map' ? (
            <View style={styles.emptyCard}>
              <Ionicons name="map-outline" size={26} color={C.faint} />
              <Text style={styles.emptyTitle}>Map arrives in M4</Text>
              <Text style={styles.emptyText}>Use list view for the M2 matchmaking flow.</Text>
            </View>
          ) : filteredMatches.length > 0 ? (
            filteredMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onPress={() => router.push(`/(app)/match-detail?id=${match.id}`)}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="search-outline" size={26} color={C.faint} />
              <Text style={styles.emptyTitle}>
                No matches in range
              </Text>
              <Text style={styles.emptyText}>
                Widen your radius or switch skill level.
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
    backgroundColor: C.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  locationText: {
    fontFamily: 'Space Mono',
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: C.dim,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'HankenGrotesk-ExtraBold',
    fontSize: 30,
    color: C.mist,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
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
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterIconChip: {
    width: 43,
    height: 39,
    borderRadius: 11,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    height: 39,
    borderRadius: 11,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: C.blue,
    borderColor: C.blue,
  },
  chipText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 14,
    color: C.dim,
  },
  chipTextActive: {
    color: C.mist,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11.5,
    letterSpacing: 2,
    color: C.label,
    textTransform: 'uppercase',
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 11,
    padding: 3,
  },
  viewToggleItem: {
    width: 38,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleItemActive: {
    backgroundColor: C.blue,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 22,
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 3,
    borderRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitleWrap: {
    flex: 1,
    paddingLeft: 4,
  },
  cardTitle: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 16.5,
    color: C.mist,
    letterSpacing: -0.2,
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 13,
    color: C.dim,
  },
  metaMono: {
    fontFamily: 'Space Mono',
    fontSize: 11,
    letterSpacing: 0.5,
    color: C.dim,
    textTransform: 'uppercase',
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.surface3,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  distanceText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    color: C.mist,
  },
  cardDivider: {
    height: 1,
    backgroundColor: C.hair2,
    marginVertical: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 4,
  },
  playersWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.surface1,
  },
  avatarText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  emptySpot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.ghost,
    backgroundColor: C.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCount: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 13,
    color: C.mist,
  },
  playerCountFull: {
    color: C.dim,
  },
  playerTotal: {
    color: C.dim,
  },
  playerLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 9.5,
    letterSpacing: 1,
    color: C.dim,
    textTransform: 'uppercase',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skillBadge: {
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  skillBadgePrimary: {
    backgroundColor: 'rgba(68,88,166,0.18)',
  },
  skillBadgeMuted: {
    backgroundColor: C.surface3,
  },
  skillBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  skillBadgeTextPrimary: {
    color: '#A9B6E6',
  },
  skillBadgeTextMuted: {
    color: C.dim,
  },
  centerState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 10,
  },
  gateTitle: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 15,
    color: C.dim,
    marginTop: 8,
  },
  gateText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 19,
    color: C.faint,
    textAlign: 'center',
  },
  saveWarningCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(224,177,91,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(224,177,91,0.22)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveWarningText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 18,
    color: C.warning,
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
    paddingVertical: 38,
    alignItems: 'center',
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.hair,
    borderRadius: 20,
  },
  emptyTitle: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 14.5,
    color: C.dim,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    color: C.dim,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
