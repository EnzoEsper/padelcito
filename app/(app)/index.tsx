import { View, Text } from '@/tw';

// TODO(Step 1.3): Replace with the main app home screen.
export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-primary-hi mb-3">
        PADELCITO
      </Text>
      <Text className="font-grotesk font-extrabold text-[30px] text-neutral">
        You're in.
      </Text>
      <Text className="font-grotesk text-base text-neutral/60 mt-2">
        Step 1.3 — profile setup coming next.
      </Text>
    </View>
  );
}
