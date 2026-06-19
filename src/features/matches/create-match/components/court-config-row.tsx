import { View, Text } from '@/tw';
import {
  COURT_STRUCTURE_OPTIONS,
  COURT_SURFACE_OPTIONS,
  COURT_TYPE_OPTIONS,
  type CourtConfig,
  type CourtStructure,
  type CourtSurface,
  type CourtType,
} from '@/lib/padel-court';
import { InlineSelect } from './inline-select';

type CourtConfigRowProps = {
  index: number;
  config: CourtConfig;
  onChange: (index: number, patch: Partial<CourtConfig>) => void;
};

export function CourtConfigRow({ index, config, onChange }: CourtConfigRowProps) {
  return (
    <View className="gap-2">
      <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/45">
        Court {index + 1}
      </Text>
      <View className="rounded-xl bg-surface-1 border border-neutral/10 flex-row overflow-hidden">
        <InlineSelect<CourtType>
          embedded
          showDivider
          sheetTitle="Court type"
          value={config.type}
          options={COURT_TYPE_OPTIONS}
          onChange={(type) => onChange(index, { type })}
        />
        <InlineSelect<CourtStructure>
          embedded
          showDivider
          sheetTitle="Court structure"
          value={config.structure}
          options={COURT_STRUCTURE_OPTIONS}
          onChange={(structure) => onChange(index, { structure })}
        />
        <InlineSelect<CourtSurface>
          embedded
          sheetTitle="Court surface"
          value={config.surface}
          options={COURT_SURFACE_OPTIONS}
          onChange={(surface) => onChange(index, { surface })}
        />
      </View>
    </View>
  );
}
