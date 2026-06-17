import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text } from '@/tw';
import { CreateMatchForm } from '@/features/matches/create-match/create-match-form';

export default function CreateMatchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + 16 }} className="pb-6">
          <View className="flex-row items-start gap-3 mb-4">
            <Pressable
              onPress={() => router.back()}
              className="w-11 h-11 rounded-xl bg-surface-1 border border-neutral/10 items-center justify-center"
            >
              <Ionicons name="chevron-back" size={22} color="#E4E4E4" />
            </Pressable>
            <View className="flex-1 pt-0.5">
              <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38 mb-1">
                NEW MATCH
              </Text>
              <Text
                className="font-grotesk font-extrabold text-[30px] text-neutral"
                style={{ letterSpacing: -0.8 }}
              >
                Host a match
              </Text>
              <Text className="font-grotesk text-sm text-neutral/60 mt-2 leading-5">
                Fill the essentials and publish. Players nearby can request your open spots.
              </Text>
            </View>
          </View>

          <CreateMatchForm />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
});
