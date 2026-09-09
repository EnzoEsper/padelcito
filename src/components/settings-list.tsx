import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from '@/tw';

const C = {
  surface1: '#141417',
  hair: 'rgba(228,228,228,0.10)',
  hair2: 'rgba(228,228,228,0.055)',
  neutral: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
} as const;

type SettingsSectionProps = {
  label: string;
  children: ReactNode;
};

export function SettingsSection({ label, children }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

type SettingsRowTrailing = 'chevron' | 'external' | 'none';

type SettingsRowProps = {
  label: string;
  onPress: () => void;
  labelColor?: string;
  isFirst?: boolean;
  trailing?: SettingsRowTrailing;
};

export function SettingsRow({
  label,
  onPress,
  labelColor,
  isFirst = false,
  trailing = 'chevron',
}: SettingsRowProps) {
  const trailingIcon =
    trailing === 'external' ? (
      <Ionicons name="open-outline" size={16} color={C.faint} />
    ) : trailing === 'chevron' ? (
      <Ionicons name="chevron-forward" size={16} color={C.faint} />
    ) : null;

  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-70"
      style={[styles.row, !isFirst && styles.rowBorder]}
    >
      <Text style={[styles.rowLabel, labelColor !== undefined ? { color: labelColor } : undefined]}>
        {label}
      </Text>
      {trailingIcon !== null ? <View style={styles.rowTrailing}>{trailingIcon}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11.5,
    color: C.dim,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  card: {
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: C.hair2,
  },
  rowLabel: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 15,
    color: C.neutral,
    flex: 1,
  },
  rowTrailing: {
    marginLeft: 8,
  },
});
