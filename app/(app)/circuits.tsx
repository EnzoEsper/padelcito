import { ScrollView, View, Text } from '@/tw';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationBell } from '@/components/notification-bell';

function BracketSkeleton() {
  return (
    <View className="bg-surface-1 border border-neutral/10 rounded-2xl mx-5 mb-3 p-5">
      <View className="flex-row items-center gap-3 mb-4">
        <View className="w-8 h-8 rounded-lg bg-surface-3" />
        <View className="flex-1 gap-2">
          <View className="h-3 w-36 rounded-full bg-surface-3" />
          <View className="h-2.5 w-24 rounded-full bg-surface-3" />
        </View>
        <View className="h-5 w-10 rounded-full bg-surface-3" />
      </View>
      <View className="flex-row gap-2">
        <View className="h-2 flex-1 rounded-full bg-surface-3" />
        <View className="h-2 w-16 rounded-full bg-surface-3" />
      </View>
    </View>
  );
}

export default function CircuitsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-6"
    >
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="px-5 pb-5 flex-row justify-between items-start"
      >
        <View>
          <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38 mb-1">
            CIRCUITS
          </Text>
          <Text className="font-grotesk font-extrabold text-[30px] text-neutral" style={{ letterSpacing: -0.8 }}>
            Tournaments
          </Text>
        </View>
        <NotificationBell />
      </View>

      {[0, 1, 2].map((i) => (
        <BracketSkeleton key={i} />
      ))}

      <View className="items-center mt-4 px-5">
        <Text className="font-mono text-[10px] tracking-[1.5px] uppercase text-neutral/38 text-center">
          BRACKETS & CIRCUITS COMING SOON
        </Text>
      </View>
    </ScrollView>
  );
}
