import { Ionicons } from '@expo/vector-icons';
import { View, Text } from '@/tw';
import { maxOpenSpots } from '../use-create-match-form';
import { SectionLabel } from './section-label';
import { StepperField } from './stepper-field';

type PlayerRosterPreviewProps = {
  totalPlayers: number;
  confirmedCount: number;
  openSpots: number;
  onTotalChange: (value: number) => void;
  onOpenSpotsChange: (value: number) => void;
  minTotalPlayers: number;
  maxTotalPlayers: number;
};

function formatRosterSummary(confirmedCount: number, openSpots: number): string {
  if (confirmedCount === 0) {
    return `You host, looking for ${openSpots} more.`;
  }
  return `You host, ${confirmedCount} confirmed, looking for ${openSpots} more.`;
}

export function PlayerRosterPreview({
  totalPlayers,
  confirmedCount,
  openSpots,
  onTotalChange,
  onOpenSpotsChange,
  minTotalPlayers,
  maxTotalPlayers,
}: PlayerRosterPreviewProps) {
  const maxOpen = maxOpenSpots(totalPlayers);

  const slots = Array.from({ length: totalPlayers }, (_, index) => {
    if (index === 0) return 'host' as const;
    if (index <= confirmedCount) return 'confirmed' as const;
    return 'open' as const;
  });

  return (
    <View>
      <SectionLabel trailing={`${totalPlayers} total`}>Players</SectionLabel>
      <View className="rounded-xl bg-surface-1 border border-neutral/10 px-4 py-4 gap-4">
        <View className="flex-row flex-wrap gap-2.5">
          {slots.map((slot, index) => {
            if (slot === 'host') {
              return (
                <View
                  key={`slot-${index}`}
                  className="w-10 h-10 rounded-full bg-neutral items-center justify-center"
                >
                  <Ionicons name="person" size={18} color="#0B0B0B" />
                </View>
              );
            }
            if (slot === 'confirmed') {
              return (
                <View
                  key={`slot-${index}`}
                  className="w-10 h-10 rounded-full bg-surface-3 border border-neutral/10"
                />
              );
            }
            return (
              <View
                key={`slot-${index}`}
                className="w-10 h-10 rounded-full border border-dashed border-neutral/25 items-center justify-center bg-surface-2/40"
              >
                <Ionicons name="add" size={16} color="rgba(228,228,228,0.45)" />
              </View>
            );
          })}
        </View>

        <Text className="font-grotesk text-sm text-neutral/60 leading-5">
          {formatRosterSummary(confirmedCount, openSpots)}
        </Text>

        <View className="gap-2.5">
          <View className="rounded-xl bg-surface-2/80 border border-neutral/8 px-3">
            <StepperField
              label="Total players"
              icon="people"
              value={totalPlayers}
              onDecrement={() => onTotalChange(totalPlayers - 1)}
              onIncrement={() => onTotalChange(totalPlayers + 1)}
              decrementDisabled={totalPlayers <= minTotalPlayers}
              incrementDisabled={totalPlayers >= maxTotalPlayers}
            />
          </View>
          <View className="rounded-xl bg-surface-2/80 border border-neutral/8 px-3">
            <StepperField
              label="Open spots"
              sublabel="Players you need"
              icon="flash"
              value={openSpots}
              onDecrement={() => onOpenSpotsChange(openSpots - 1)}
              onIncrement={() => onOpenSpotsChange(openSpots + 1)}
              decrementDisabled={openSpots <= 1}
              incrementDisabled={openSpots >= maxOpen}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
