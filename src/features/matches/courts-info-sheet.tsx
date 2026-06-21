import { useState } from 'react';
import { Modal, Pressable as RNPressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from '@/tw';
import {
  formatCourtConfigDescription,
  formatCourtCountLabel,
} from '@/features/matches/match-display';
import { resizeCourtConfigs, type CourtConfig } from '@/lib/padel-court';

const C = {
  blueHi: '#8FA0E8',
  dim: 'rgba(228,228,228,0.45)',
  hair: 'rgba(228,228,228,0.1)',
  surface1: '#141417',
} as const;

type CourtsInfoChipProps = {
  courtCount: number;
  configs: CourtConfig[];
};

export function CourtsInfoChip({ courtCount, configs }: CourtsInfoChipProps) {
  const [open, setOpen] = useState(false);
  const resolvedConfigs = resizeCourtConfigs(configs, courtCount);
  const label = formatCourtCountLabel(courtCount);
  const sheetTitle = courtCount === 1 ? 'Court setup' : 'Courts setup';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.chip}
        accessibilityRole="button"
        accessibilityLabel={`${label}. Show court details.`}
        accessibilityHint="Opens a sheet with court type, structure, and surface."
      >
        <Text style={styles.chipText}>{label}</Text>
        <Ionicons name="information-circle-outline" size={16} color={C.blueHi} />
      </Pressable>

      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <RNPressable style={styles.scrim} onPress={() => setOpen(false)}>
          <RNPressable style={styles.sheet} onPress={() => undefined}>
            <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38 mb-3 px-1">
              {sheetTitle}
            </Text>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {resolvedConfigs.map((config, index) => (
                <View key={index} style={styles.courtCard}>
                  {resolvedConfigs.length > 1 ? (
                    <Text style={styles.courtHeading}>Court {index + 1}</Text>
                  ) : null}
                  <Text style={styles.courtDescription}>
                    {formatCourtConfigDescription(config)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </RNPressable>
        </RNPressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(94,112,184,0.45)',
    backgroundColor: C.surface1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: C.dim,
  },
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#141417',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '52%',
  },
  list: {
    flexGrow: 0,
  },
  courtCard: {
    backgroundColor: '#1C1C22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.hair,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  courtHeading: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(228,228,228,0.38)',
    marginBottom: 6,
  },
  courtDescription: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 15,
    lineHeight: 21,
    color: 'rgba(228,228,228,0.85)',
  },
});
