import { OptionSelectField } from '@/components/option-select';
import { formatDurationLabel, type DurationOption } from '../use-create-match-form';

type DurationSelectProps = {
  value: DurationOption;
  options: readonly DurationOption[];
  onChange: (minutes: DurationOption) => void;
  embedded?: boolean;
};

export function DurationSelect({ value, options, onChange, embedded = false }: DurationSelectProps) {
  return (
    <OptionSelectField
      embedded={embedded}
      sheetTitle="Duration"
      value={String(value) as `${DurationOption}`}
      options={options.map((minutes) => ({
        value: String(minutes) as `${DurationOption}`,
        label: formatDurationLabel(minutes),
      }))}
      onChange={(next) => onChange(Number.parseInt(next, 10) as DurationOption)}
    />
  );
}
