import { StyleSheet, View } from 'react-native';
import { Pressable, Text } from '@/tw';
import { AppBottomSheet } from '@/components/app-bottom-sheet';
import {
  CATEGORY_TIER_LABEL,
  categoryToTier,
  formatCategoryLabel,
  getPadelCategoryDescription,
  PADEL_CATEGORY_GROUPS,
  type PadelCategoryNumber,
} from '@/lib/padel-category';
import { PROFILE_COLORS as C } from '@/features/profile/profile-display';

const SCALE_CATEGORIES: readonly PadelCategoryNumber[] = [9, 8, 7, 6, 5, 4, 3, 2, 1];

function ordinalSuffixOnly(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

function CategoryScaleBar({ category }: { category: PadelCategoryNumber }) {
  const selectedIndex = SCALE_CATEGORIES.indexOf(category);

  return (
    <View style={styles.scaleBlock}>
      <View style={styles.scaleGroupsRow}>
        {PADEL_CATEGORY_GROUPS.map((group) => (
          <View key={group.tier} style={styles.scaleGroup}>
            <View style={styles.scaleSegments}>
              {group.numbers.map((cat) => {
                const index = SCALE_CATEGORIES.indexOf(cat);
                const isFilled = selectedIndex >= 0 && index <= selectedIndex;
                const isSelected = cat === category;
                return (
                  <View
                    key={cat}
                    style={[
                      styles.scaleSegment,
                      isFilled ? styles.scaleSegmentFilled : styles.scaleSegmentEmpty,
                      isSelected ? styles.scaleSegmentSelected : undefined,
                    ]}
                  />
                );
              })}
            </View>
            <Text style={styles.scaleTierLabel} numberOfLines={1}>
              {group.label}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.scaleHint} numberOfLines={1}>
        9 = beginner · 1 = strongest
      </Text>
    </View>
  );
}

type PadelLevelSheetProps = {
  visible: boolean;
  onClose: () => void;
  category: PadelCategoryNumber;
  onChangeLevel?: () => void;
};

export function PadelLevelSheet({
  visible,
  onClose,
  category,
  onChangeLevel,
}: PadelLevelSheetProps) {
  const tier = categoryToTier(category);
  const tierLabel = CATEGORY_TIER_LABEL[tier];
  const description = getPadelCategoryDescription(category);
  const suffix = ordinalSuffixOnly(category);

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="Padel level"
      showClose
      maxHeight="72%"
    >
      <View style={styles.header}>
        <View style={styles.levelNumberBlock}>
          <View style={styles.levelNumberRow}>
            <Text style={styles.levelNumber}>{category}</Text>
            <Text style={styles.levelOrdinal}>{suffix}</Text>
          </View>
          <Text style={styles.levelNumberCaption}>CATEGORY</Text>
        </View>
        <View style={styles.levelTierBlock}>
          <Text style={styles.levelTierName}>{tierLabel}</Text>
          <Text style={styles.levelTierSub} numberOfLines={1}>
            {formatCategoryLabel(category)} · padel level
          </Text>
        </View>
      </View>

      <CategoryScaleBar category={category} />

      {description.length > 0 ? (
        <Text style={styles.levelDescription}>{description}</Text>
      ) : null}

      {onChangeLevel !== undefined ? (
        <Pressable
          onPress={() => {
            onClose();
            onChangeLevel();
          }}
          className="active:opacity-85"
          style={styles.changeButton}
          accessibilityRole="button"
        >
          <Text style={styles.changeButtonText}>Change level</Text>
        </Pressable>
      ) : null}
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  levelNumberBlock: {
    alignItems: 'center',
    minWidth: 52,
  },
  levelNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  levelNumber: {
    fontFamily: 'HankenGrotesk-ExtraBold',
    fontSize: 36,
    color: C.neutral,
    lineHeight: 38,
    letterSpacing: -1,
  },
  levelOrdinal: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    color: C.dim,
    marginTop: 4,
    marginLeft: 1,
  },
  levelNumberCaption: {
    fontFamily: 'Space Mono',
    fontSize: 8,
    letterSpacing: 1,
    color: C.faint,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  levelTierBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  levelTierName: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 17,
    color: C.neutral,
  },
  levelTierSub: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    color: C.dim,
  },
  scaleBlock: {
    gap: 6,
    marginBottom: 16,
  },
  scaleGroupsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scaleGroup: {
    flex: 1,
    gap: 4,
  },
  scaleSegments: {
    flexDirection: 'row',
    gap: 3,
  },
  scaleSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  scaleSegmentEmpty: {
    backgroundColor: C.surface3,
  },
  scaleSegmentFilled: {
    backgroundColor: 'rgba(94,112,184,0.35)',
  },
  scaleSegmentSelected: {
    backgroundColor: C.primaryHi,
  },
  scaleTierLabel: {
    fontFamily: 'Space Mono',
    fontSize: 8,
    letterSpacing: 0.6,
    color: C.faint,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  scaleHint: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 11,
    color: C.faint,
    textAlign: 'center',
  },
  levelDescription: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 21,
    color: C.dim,
    marginBottom: 16,
  },
  changeButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: C.primaryHi,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  changeButtonText: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 15,
    color: C.neutral,
  },
});
