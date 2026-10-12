import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from '@/tw';
import { resolveMatchCardState } from '@/features/matches/match-card-state';
import type { MatchStatusBadgeTone, ParticipantStatusMembershipTone } from '@/features/matches/match-display';
import type { MatchSummary } from '@/features/matches/use-matches';

type MembershipChip = {
  label: string;
  tone: ParticipantStatusMembershipTone;
  pulse: boolean;
};

const NEUTRAL_PILL = {
  backgroundColor: '#232429',
  borderColor: 'rgba(228,228,228,0.10)',
  textColor: 'rgba(228,228,228,0.55)',
} as const;

const LIFECYCLE_PILL: Record<
  MatchStatusBadgeTone,
  { backgroundColor: string; borderColor: string; textColor: string }
> = {
  open: {
    backgroundColor: 'rgba(91,224,166,0.14)',
    borderColor: 'rgba(91,224,166,0.22)',
    textColor: '#5BE0A6',
  },
  full: {
    backgroundColor: 'rgba(68,88,166,0.22)',
    borderColor: 'rgba(94,112,184,0.35)',
    textColor: '#A9B6E6',
  },
  live: {
    backgroundColor: 'rgba(91,224,166,0.14)',
    borderColor: 'rgba(91,224,166,0.35)',
    textColor: '#5BE0A6',
  },
  finished: {
    backgroundColor: 'rgba(228,228,228,0.08)',
    borderColor: 'rgba(228,228,228,0.10)',
    textColor: 'rgba(228,228,228,0.55)',
  },
  cancelled: {
    backgroundColor: 'rgba(228,228,228,0.06)',
    borderColor: 'rgba(228,228,228,0.12)',
    textColor: 'rgba(228,228,228,0.45)',
  },
};

const MEMBERSHIP_TEXT: Record<
  ParticipantStatusMembershipTone,
  { dotColor: string; textColor: string }
> = {
  pending: { dotColor: '#E0B15B', textColor: '#E0B15B' },
  accepted: { dotColor: '#5BE0A6', textColor: '#5BE0A6' },
  inactive: { dotColor: 'rgba(228,228,228,0.32)', textColor: 'rgba(228,228,228,0.45)' },
};

function RadarStatusDot({ color, pulse }: { color: string; pulse: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (!pulse) {
      scale.setValue(1);
      ringOpacity.setValue(0);
      return;
    }

    scale.setValue(1);
    ringOpacity.setValue(0.55);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 2.6,
            duration: 1300,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 1300,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [pulse, ringOpacity, scale]);

  return (
    <View style={styles.dotContainer}>
      {pulse ? (
        <Animated.View
          style={[
            styles.radarRing,
            {
              borderColor: color,
              opacity: ringOpacity,
              transform: [{ scale }],
            },
          ]}
        />
      ) : null}
      <View style={[styles.membershipDot, { backgroundColor: color }]} />
    </View>
  );
}

function TextPill({
  label,
  backgroundColor,
  borderColor,
  textColor,
}: {
  label: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor, borderColor }]}>
      <Text style={[styles.pillLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

/** @deprecated Use resolveMatchCardState(match).viewerStatus instead. */
export function resolveParticipantMembership(match: MatchSummary): MembershipChip | null {
  const { viewerStatus } = resolveMatchCardState(match);
  if (viewerStatus === null) return null;
  return {
    label: viewerStatus.label,
    tone: viewerStatus.tone,
    pulse: viewerStatus.pulse,
  };
}

/**
 * Header corner — colored match-status pill (always top-right).
 * When hosting, a neutral Host pill sits immediately to its left.
 */
export function MatchCalendarHeaderBadge({ match }: { match: MatchSummary }) {
  const { lifecycle, showHostPill } = resolveMatchCardState(match);
  const statusStyle = LIFECYCLE_PILL[lifecycle.tone];

  return (
    <View style={styles.headerRow}>
      {showHostPill ? <TextPill label="Host" {...NEUTRAL_PILL} /> : null}
      <TextPill label={lifecycle.label} {...statusStyle} />
    </View>
  );
}

/** Footer — viewer relationship (host pending inbox or player membership). */
export function MatchCalendarMembershipLabel({ match }: { match: MatchSummary }) {
  const { viewerStatus } = resolveMatchCardState(match);
  if (viewerStatus === null) return null;

  const colors = MEMBERSHIP_TEXT[viewerStatus.tone];

  return (
    <View style={styles.membershipRow}>
      <RadarStatusDot color={colors.dotColor} pulse={viewerStatus.pulse} />
      <Text style={[styles.membershipLabel, { color: colors.textColor }]}>
        {viewerStatus.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexShrink: 0,
  },
  pillLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 9.5,
    letterSpacing: 0.55,
    textTransform: 'uppercase',
  },
  membershipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  dotContainer: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRing: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1.5,
  },
  membershipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  membershipLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 9.5,
    letterSpacing: 0.55,
    textTransform: 'uppercase',
  },
});
