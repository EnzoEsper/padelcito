import { ScrollView, View, Text } from '@/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function MatchRowSkeleton() {
  return (
    <View className="bg-surface-1 border border-neutral/10 rounded-2xl mx-5 mb-3 px-4 py-4">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-surface-3" />
        <View className="flex-1 gap-2">
          <View className="h-3 w-40 rounded-full bg-surface-3" />
          <View className="h-2.5 w-28 rounded-full bg-surface-3" />
        </View>
        <View className="h-6 w-16 rounded-lg bg-surface-3" />
      </View>
    </View>
  );
}

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-6"
    >
      <View style={{ paddingTop: insets.top + 16 }} className="px-5 pb-5">
        <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38 mb-1">
          MATCHES
        </Text>
        <Text className="font-grotesk font-extrabold text-[30px] text-neutral" style={{ letterSpacing: -0.8 }}>
          My Matches
        </Text>
      </View>

      {/* Segment control skeleton */}
      <View className="mx-5 mb-4 bg-surface-1 border border-neutral/10 rounded-xl h-10 flex-row items-center p-1 gap-1">
        <View className="flex-1 h-full bg-surface-3 rounded-lg" />
        <View className="flex-1 h-full" />
      </View>

      {[0, 1, 2, 3].map((i) => (
        <MatchRowSkeleton key={i} />
      ))}

      <View className="items-center mt-4 px-5">
        <Text className="font-mono text-[10px] tracking-[1.5px] uppercase text-neutral/38 text-center">
          MATCH HISTORY COMING SOON
        </Text>
      </View>
    </ScrollView>
  );
}
