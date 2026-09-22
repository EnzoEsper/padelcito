import { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import {
  useController,
  type Control,
  type FieldErrors,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Pressable, Text, View } from '@/tw';
import { SKILL_LEVELS, type SkillLevel } from '@/features/onboarding/use-onboarding-profile';

type ChipMeta = {
  label: string;
  subtitle: string;
  unselectedContainer: string;
  unselectedText: string;
};

const CHIP_META: Record<SkillLevel, ChipMeta> = {
  beginner: {
    label: 'BEGINNER',
    subtitle: 'Just starting',
    unselectedContainer: 'bg-surface-3',
    unselectedText: 'text-neutral/38',
  },
  intermediate: {
    label: 'INTERMEDIATE',
    subtitle: 'Some experience',
    unselectedContainer: 'bg-surface-3',
    unselectedText: 'text-neutral/60',
  },
  advanced: {
    label: 'ADVANCED',
    subtitle: 'Competitive play',
    unselectedContainer: 'bg-surface-3 border border-neutral/20',
    unselectedText: 'text-neutral',
  },
  expert: {
    label: 'EXPERT',
    subtitle: 'Tournament level',
    unselectedContainer: 'border border-primary/50 bg-primary/10',
    unselectedText: 'text-neutral',
  },
  pro: {
    label: 'PRO',
    subtitle: 'Elite level',
    unselectedContainer: 'bg-primary',
    unselectedText: 'text-neutral',
  },
};

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-neutral/60 mb-2">
      {children}
    </Text>
  );
}

type SkillChipProps = {
  level: SkillLevel;
  isSelected: boolean;
  onPress: (level: SkillLevel) => void;
};

function SkillChip({ level, isSelected, onPress }: SkillChipProps) {
  const meta = CHIP_META[level];

  const containerClass = isSelected
    ? 'bg-primary border-2 border-primary-hi/60'
    : meta.unselectedContainer;

  const textClass = isSelected ? 'text-neutral' : meta.unselectedText;

  return (
    <Pressable
      onPress={() => onPress(level)}
      style={styles.chip}
      className={['rounded-lg items-center justify-center', containerClass].join(' ')}
      android_ripple={{ color: 'rgba(94,112,184,0.3)' }}
    >
      <Text className={['font-mono text-[11px] tracking-[0.13em] font-bold', textClass].join(' ')}>
        {meta.label}
      </Text>
      <Text
        className={[
          'font-grotesk text-xs mt-0.5',
          isSelected ? 'text-neutral/60' : 'text-neutral/38',
        ].join(' ')}
      >
        {meta.subtitle}
      </Text>
    </Pressable>
  );
}

export type SkillLevelFormValues = {
  skill_level: SkillLevel;
};

type SkillLevelChipsProps<T extends FieldValues & SkillLevelFormValues> = {
  control: Control<T>;
  errors: FieldErrors<T>;
  sectionLabel?: string;
  containerClassName?: string;
};

export function SkillLevelChips<T extends FieldValues & SkillLevelFormValues>({
  control,
  errors,
  sectionLabel = 'Padel Level',
  containerClassName = 'mb-8',
}: SkillLevelChipsProps<T>) {
  const { field } = useController({
    control,
    name: 'skill_level' as Path<T>,
  });

  const handleSelect = useCallback(
    (level: SkillLevel) => {
      field.onChange(level);
    },
    [field],
  );

  const skillError = errors.skill_level as { message?: string } | undefined;

  return (
    <View className={containerClassName}>
      <SectionLabel>{sectionLabel}</SectionLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScrollContent}
      >
        {SKILL_LEVELS.map((level) => (
          <SkillChip
            key={level}
            level={level}
            isSelected={field.value === level}
            onPress={handleSelect}
          />
        ))}
      </ScrollView>
      {skillError?.message !== undefined ? (
        <Text className="font-grotesk text-sm text-warning mt-3 leading-5">
          {skillError.message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    minWidth: 90,
  },
  chipsScrollContent: {
    paddingRight: 8,
  },
});
