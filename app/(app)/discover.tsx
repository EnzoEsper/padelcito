import { ScrollView, View, Text } from '@/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function SkeletonCard() {
  return (
    <View className="bg-surface-1 border border-neutral/10 rounded-2xl p-5 mx-5 mb-3">
      <View className="flex-row items-center gap-4 mb-4">
        <View className="w-10 h-10 rounded-full bg-surface-3" />
        <View className="flex-1 gap-2">
          <View className="h-3 w-32 rounded-full bg-surface-3" />
          <View className="h-2.5 w-20 rounded-full bg-surface-3" />
        </View>
        <View className="h-6 w-14 rounded-full bg-surface-3" />
      </View>
      <View className="h-2 w-full rounded-full bg-surface-3 mb-2" />
      <View className="h-2 w-4/5 rounded-full bg-surface-3" />
    </View>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-6"
    >
      <View style={{ paddingTop: insets.top + 16 }} className="px-5 pb-5">
        <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38 mb-1">
          DISCOVER
        </Text>
        <Text className="font-grotesk font-extrabold text-[30px] text-neutral" style={{ letterSpacing: -0.8 }}>
          Nearby
        </Text>
      </View>

      {/* Search bar skeleton */}
      <View className="mx-5 mb-5 bg-surface-1 border border-neutral/10 rounded-xl h-11" />

      {/* Cards skeleton */}
      {[0, 1, 2, 3].map((i) => (
        <SkeletonCard key={i} />
      ))}

      <View className="items-center mt-4 px-5">
        <Text className="font-mono text-[10px] tracking-[1.5px] uppercase text-neutral/38 text-center">
          MATCHMAKING COMING SOON
        </Text>
      </View>
    </ScrollView>
  );
}
