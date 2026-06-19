import { View, Text } from '@/tw';
import type { CourtConfig } from '@/lib/padel-court';
import { SectionLabel } from './section-label';
import { CourtConfigRow } from './court-config-row';

const COLUMN_LABELS = ['Type', 'Structure', 'Surface'] as const;

type CourtsConfigSectionProps = {
  courtCount: number;
  courtConfigs: CourtConfig[];
  onUpdateCourt: (index: number, patch: Partial<CourtConfig>) => void;
};

export function CourtsConfigSection({
  courtCount,
  courtConfigs,
  onUpdateCourt,
}: CourtsConfigSectionProps) {
  return (
    <View>
      <SectionLabel>Courts setup</SectionLabel>
      <View className="flex-row mb-2 px-1">
        {COLUMN_LABELS.map((label) => (
          <Text
            key={label}
            className="flex-1 text-center font-mono text-[10px] tracking-[1.5px] uppercase text-neutral/45"
          >
            {label}
          </Text>
        ))}
      </View>
      <View className="gap-3">
        {courtConfigs.slice(0, courtCount).map((config, index) => (
          <CourtConfigRow
            key={`court-config-${index}`}
            index={index}
            config={config}
            onChange={onUpdateCourt}
          />
        ))}
      </View>
    </View>
  );
}
