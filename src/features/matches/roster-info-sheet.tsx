import { Modal, Pressable as RNPressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from '@/tw';
import { buildRosterInfoContent, formatRosterBreakdown } from '@/features/matches/match-roster';

const C = {
  dim: 'rgba(228,228,228,0.45)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.1)',
  mist: '#E4E4E4',
  surface1: '#141417',
  surface2: '#1B1C21',
} as const;

type RosterInfoStats = {
  capacity: number;
  offlineConfirmedCount: number;
  appAcceptedCount: number;
  joinSpotsRemaining: number;
  totalFilled: number;
};

type RosterInfoButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
};

export function RosterInfoButton({
  onPress,
  accessibilityLabel = 'How this roster works',
}: RosterInfoButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens an explanation of how players are counted on this roster."
      style={styles.infoButton}
    >
      <Ionicons name="information-circle-outline" size={18} color={C.faint} />
    </Pressable>
  );
}

type RosterInfoSheetProps = {
  visible: boolean;
  onClose: () => void;
  stats: RosterInfoStats;
};

export function RosterInfoSheet({ visible, onClose, stats }: RosterInfoSheetProps) {
  const content = buildRosterInfoContent(stats);
  const summary = formatRosterBreakdown(stats);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <RNPressable style={styles.scrim} onPress={onClose}>
        <RNPressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.sheetHeader}>
            <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38">
              Roster
            </Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={C.dim} />
            </Pressable>
          </View>

          <Text style={styles.headline}>{content.headline}</Text>
          <Text style={styles.summary}>{summary}</Text>

          <View style={styles.bulletList}>
            {content.bullets.map((bullet, index) => (
              <View
                key={bullet.label}
                style={[
                  styles.bulletRow,
                  index === content.bullets.length - 1 ? styles.bulletRowLast : null,
                ]}
              >
                <Text style={styles.bulletLabel}>{bullet.label}</Text>
                <Text style={styles.bulletDescription}>{bullet.description}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.footnote}>{content.footnote}</Text>
        </RNPressable>
      </RNPressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  infoButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: C.surface1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: C.hair,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headline: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 16,
    color: C.mist,
    lineHeight: 22,
    marginBottom: 8,
  },
  summary: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.4,
    color: C.faint,
    marginBottom: 18,
  },
  bulletList: {
    gap: 14,
    marginBottom: 18,
  },
  bulletRow: {
    gap: 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  bulletRowLast: {
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  bulletLabel: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 14,
    color: C.mist,
  },
  bulletDescription: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13.5,
    lineHeight: 20,
    color: C.dim,
  },
  footnote: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 13,
    color: C.dim,
  },
});
