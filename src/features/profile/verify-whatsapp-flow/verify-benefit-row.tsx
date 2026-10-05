import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/tw';

type VerifyBenefitRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  compact?: boolean;
  isLast?: boolean;
};

export function VerifyBenefitRow({
  icon,
  title,
  description,
  compact = false,
  isLast = false,
}: VerifyBenefitRowProps) {
  if (compact) {
    return (
      <View style={[styles.compactRow, !isLast && styles.compactRowBorder]}>
        <Ionicons name={icon} size={18} color="#5E70B8" style={styles.compactIcon} />
        <Text className="font-grotesk text-sm text-neutral/75 leading-5 flex-1">{title}</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color="#5E70B8" />
      </View>
      <View style={styles.copy}>
        <Text className="font-grotesk font-semibold text-base text-neutral">{title}</Text>
        {description !== undefined && description.length > 0 ? (
          <Text className="font-grotesk text-sm text-neutral/55 mt-1 leading-5">{description}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#141417',
    borderWidth: 1,
    borderColor: 'rgba(228,228,228,0.08)',
    borderCurve: 'continuous',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(43,57,109,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    paddingTop: 2,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 10,
  },
  compactRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(228,228,228,0.08)',
  },
  compactIcon: {
    marginTop: 1,
  },
});
