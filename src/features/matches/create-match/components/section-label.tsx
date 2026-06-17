import { View, Text } from '@/tw';

type SectionLabelProps = {
  children: string;
  trailing?: string;
};

export function SectionLabel({ children, trailing }: SectionLabelProps) {
  return (
    <View className="flex-row items-center justify-between mb-2">
      <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-neutral/60">
        {children}
      </Text>
      {trailing !== undefined ? (
        <Text className="font-mono text-[11px] tracking-[0.08em] text-neutral/60">{trailing}</Text>
      ) : null}
    </View>
  );
}
