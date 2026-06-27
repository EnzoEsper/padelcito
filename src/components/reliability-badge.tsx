import { StyleSheet } from 'react-native';
import { View, Text } from '@/tw';

const C = {
  surface3: '#232429',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  warning: '#E0B15B',
  warningTint: 'rgba(224,177,91,0.12)',
} as const;

type ReliabilityBadgeProps = {
  reliabilityScore: number | null;
  penaltyCount?: number | null;
  compact?: boolean;
};

function formatLabel(reliabilityScore: number | null, penaltyCount: number): string {
  if (reliabilityScore === null) {
    return penaltyCount > 0 ? 'Low' : 'New';
  }
  return `${Math.round(reliabilityScore)}%`;
}

export function ReliabilityBadge({
  reliabilityScore,
  penaltyCount = 0,
  compact = false,
}: ReliabilityBadgeProps) {
  const penalties = penaltyCount ?? 0;
  const label = formatLabel(reliabilityScore, penalties);
  const isLow =
    penalties > 0 || (reliabilityScore !== null && reliabilityScore < 85);

  return (
    <View style={[styles.badge, isLow && styles.badgeWarning, compact && styles.badgeCompact]}>
      <Text style={[styles.label, isLow && styles.labelWarning]}>
        {compact ? label : `Reliability ${label}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    backgroundColor: C.surface3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeCompact: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeWarning: {
    backgroundColor: C.warningTint,
  },
  label: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: C.dim,
  },
  labelWarning: {
    color: C.warning,
  },
});
