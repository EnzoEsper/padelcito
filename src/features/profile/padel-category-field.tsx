import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import {
  useController,
  type Control,
  type FieldErrors,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Text, View } from '@/tw';
import {
  formatCategoryLabel,
  getPadelCategoryDescription,
  isPadelCategoryNumber,
  type PadelCategoryNumber,
} from '@/lib/padel-category';
import { PadelCategoryGrid } from '@/features/profile/padel-category-grid';

export type PadelCategoryFormValues = {
  padel_category: PadelCategoryNumber;
};

type PadelCategoryFieldProps<T extends FieldValues & Partial<PadelCategoryFormValues>> = {
  control: Control<T>;
  errors: FieldErrors<T>;
  sectionLabel?: string;
  containerClassName?: string;
  /** Elevates the selected category description into a card (onboarding). */
  emphasizeDescription?: boolean;
};

type CategoryDescriptionProps = {
  category: PadelCategoryNumber;
  emphasized: boolean;
};

function CategoryDescription({ category, emphasized }: CategoryDescriptionProps) {
  const description = getPadelCategoryDescription(category);
  if (description.length === 0) {
    return null;
  }

  if (!emphasized) {
    return (
      <Text className="font-grotesk text-sm text-neutral/65 mt-4 leading-[22px]">
        {description}
      </Text>
    );
  }

  return (
    <View style={styles.descriptionCard}>
      <Text style={styles.descriptionEyebrow}>
        {formatCategoryLabel(category)}
      </Text>
      <Text className="font-grotesk text-[14px] text-neutral/90 leading-[22px]">
        {description}
      </Text>
    </View>
  );
}

export function PadelCategoryField<T extends FieldValues & Partial<PadelCategoryFormValues>>({
  control,
  errors,
  sectionLabel = 'Padel category',
  containerClassName = 'mb-8',
  emphasizeDescription = false,
}: PadelCategoryFieldProps<T>) {
  const { field } = useController({
    control,
    name: 'padel_category' as Path<T>,
  });

  const handleSelect = useCallback(
    (category: PadelCategoryNumber) => {
      field.onChange(category);
    },
    [field],
  );

  const selected =
    typeof field.value === 'number' && isPadelCategoryNumber(field.value) ? field.value : null;

  const fieldError = errors.padel_category as { message?: string } | undefined;

  return (
    <View className={containerClassName}>
      {sectionLabel.length > 0 ? (
        <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-neutral/60 mb-3">
          {sectionLabel}
        </Text>
      ) : null}

      <PadelCategoryGrid selected={selected} onSelect={handleSelect} />

      {selected !== null ? (
        <CategoryDescription category={selected} emphasized={emphasizeDescription} />
      ) : null}

      {fieldError?.message !== undefined ? (
        <Text className="font-grotesk text-sm text-warning mt-3 leading-5">
          {fieldError.message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  descriptionCard: {
    marginTop: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(94,112,184,0.55)',
    backgroundColor: 'rgba(94,112,184,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  descriptionEyebrow: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: 'rgba(94,112,184,0.85)',
  },
});
