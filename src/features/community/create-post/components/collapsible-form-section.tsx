import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { Pressable, View, Text } from '@/tw';
import { SectionLabel } from '@/features/matches/create-match/components/section-label';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental !== undefined) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type CollapsibleFormSectionProps = {
  sectionLabel: string;
  title: string;
  subtitle: string;
  icon?: keyof typeof Ionicons.glyphMap;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function CollapsibleFormSection({
  sectionLabel,
  title,
  subtitle,
  icon = 'options-outline',
  expanded,
  onToggle,
  children,
}: CollapsibleFormSectionProps) {
  function handleToggle(): void {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  }

  return (
    <View>
      <SectionLabel>{sectionLabel}</SectionLabel>
      <Pressable
        onPress={handleToggle}
        className="rounded-xl bg-surface-1 border border-neutral/10 px-4 py-4 flex-row items-center gap-3"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View className="w-10 h-10 rounded-xl bg-surface-3 items-center justify-center">
          <Ionicons name={icon} size={20} color="rgba(228,228,228,0.60)" />
        </View>
        <View className="flex-1">
          <Text className="font-grotesk text-base font-semibold text-neutral">{title}</Text>
          <Text className="font-grotesk text-xs text-neutral/60 mt-0.5" numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="rgba(228,228,228,0.38)"
        />
      </Pressable>
      {expanded ? <View className="mt-3 gap-5">{children}</View> : null}
    </View>
  );
}
