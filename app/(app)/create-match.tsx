import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View, Text, Pressable, TextInput } from '@/tw';
import {
  useCreateMatch,
  type Coords,
} from '@/features/matches/use-matches';
import type { Database } from '@/types/database';

type SkillLevel = Database['public']['Enums']['skill_level'];

const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert', 'pro'];

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="font-mono text-[11px] tracking-[0.13em] uppercase text-neutral/60 mb-2">
      {children}
    </Text>
  );
}

function formatCoord(value: number, posLabel: string, negLabel: string): string {
  const label = value >= 0 ? posLabel : negLabel;
  return `${Math.abs(value).toFixed(4)}° ${label}`;
}

function parseStartsAt(dateText: string, timeText: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText) || !/^\d{2}:\d{2}$/.test(timeText)) {
    return null;
  }

  const date = new Date(`${dateText}T${timeText}:00`);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
    return null;
  }

  return date.toISOString();
}

export default function CreateMatchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const createMatch = useCreateMatch();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [title, setTitle] = useState('');
  const [venueName, setVenueName] = useState('');
  const [description, setDescription] = useState('');
  const [dateText, setDateText] = useState(today);
  const [timeText, setTimeText] = useState('19:30');
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [capacity, setCapacity] = useState('4');
  const [skillMin, setSkillMin] = useState<SkillLevel>('beginner');
  const [skillMax, setSkillMax] = useState<SkillLevel>('pro');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  async function fetchLocation(): Promise<void> {
    setLocationError(null);
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setLocationError('Location permission is required to place the match pin.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
    } catch {
      setLocationError('Could not get your location. Please try again.');
    } finally {
      setIsLocating(false);
    }
  }

  async function handleSubmit(): Promise<void> {
    const startsAt = parseStartsAt(dateText.trim(), timeText.trim());
    const parsedDuration = Number.parseInt(durationMinutes, 10);
    const parsedCapacity = Number.parseInt(capacity, 10);

    if (title.trim().length < 3) {
      Alert.alert('Missing title', 'Use at least 3 characters for the match title.');
      return;
    }
    if (startsAt === null) {
      Alert.alert('Invalid date', 'Use a future date and time, for example 2026-06-14 and 19:30.');
      return;
    }
    if (coords === null) {
      Alert.alert('Missing location', 'Add your current location so players can discover the match.');
      return;
    }
    if (parsedDuration < 15 || parsedDuration > 480 || Number.isNaN(parsedDuration)) {
      Alert.alert('Invalid duration', 'Duration must be between 15 and 480 minutes.');
      return;
    }
    if (parsedCapacity < 2 || parsedCapacity > 60 || Number.isNaN(parsedCapacity)) {
      Alert.alert('Invalid capacity', 'Capacity must be between 2 and 60 players.');
      return;
    }

    try {
      const matchId = await createMatch.mutateAsync({
        title,
        description: description.trim() || null,
        venueName: venueName.trim() || null,
        startsAt,
        durationMinutes: parsedDuration,
        capacity: parsedCapacity,
        coords,
        skillMin,
        skillMax,
      });
      router.replace(`/(app)/match-detail?id=${matchId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create match.';
      Alert.alert('Create match failed', message);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-5 pb-10"
      >
        <View style={{ paddingTop: insets.top + 16 }} className="pb-5 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-11 h-11 rounded-xl bg-surface-1 border border-neutral/10 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={22} color="#E4E4E4" />
          </Pressable>
          <View>
            <Text className="font-mono text-[10.5px] tracking-[1.5px] uppercase text-neutral/38 mb-1">
              HOST
            </Text>
            <Text className="font-grotesk font-extrabold text-[30px] text-neutral" style={{ letterSpacing: -0.8 }}>
              Create Match
            </Text>
          </View>
        </View>

        <View className="gap-5">
          <View>
            <FieldLabel>Title</FieldLabel>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Padel after work"
              placeholderTextColor="rgba(228,228,228,0.20)"
              className="h-14 rounded-xl bg-surface-2 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
            />
          </View>

          <View>
            <FieldLabel>Venue</FieldLabel>
            <TextInput
              value={venueName}
              onChangeText={setVenueName}
              placeholder="Club Norte · Court 3"
              placeholderTextColor="rgba(228,228,228,0.20)"
              className="h-14 rounded-xl bg-surface-2 border border-neutral/10 px-4 font-grotesk text-base text-neutral"
            />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FieldLabel>Date</FieldLabel>
              <TextInput
                value={dateText}
                onChangeText={setDateText}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="rgba(228,228,228,0.20)"
                className="h-14 rounded-xl bg-surface-2 border border-neutral/10 px-4 font-mono text-sm text-neutral"
              />
            </View>
            <View className="w-28">
              <FieldLabel>Time</FieldLabel>
              <TextInput
                value={timeText}
                onChangeText={setTimeText}
                placeholder="19:30"
                placeholderTextColor="rgba(228,228,228,0.20)"
                className="h-14 rounded-xl bg-surface-2 border border-neutral/10 px-4 font-mono text-sm text-neutral"
              />
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FieldLabel>Duration</FieldLabel>
              <TextInput
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                keyboardType="number-pad"
                className="h-14 rounded-xl bg-surface-2 border border-neutral/10 px-4 font-mono text-sm text-neutral"
              />
            </View>
            <View className="flex-1">
              <FieldLabel>Capacity</FieldLabel>
              <TextInput
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="number-pad"
                className="h-14 rounded-xl bg-surface-2 border border-neutral/10 px-4 font-mono text-sm text-neutral"
              />
            </View>
          </View>

          <View>
            <FieldLabel>Skill Range</FieldLabel>
            <View className="gap-3">
              <View className="flex-row flex-wrap gap-2">
                {SKILL_LEVELS.map((level) => (
                  <Pressable
                    key={`min-${level}`}
                    onPress={() => setSkillMin(level)}
                    className={[
                      'rounded-lg px-3 py-2 border',
                      skillMin === level ? 'bg-primary border-primary-hi' : 'bg-surface-2 border-neutral/10',
                    ].join(' ')}
                  >
                    <Text className="font-mono text-[10px] uppercase text-neutral">
                      Min {level}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className="flex-row flex-wrap gap-2">
                {SKILL_LEVELS.map((level) => (
                  <Pressable
                    key={`max-${level}`}
                    onPress={() => setSkillMax(level)}
                    className={[
                      'rounded-lg px-3 py-2 border',
                      skillMax === level ? 'bg-primary border-primary-hi' : 'bg-surface-2 border-neutral/10',
                    ].join(' ')}
                  >
                    <Text className="font-mono text-[10px] uppercase text-neutral">
                      Max {level}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View>
            <FieldLabel>Map Pin</FieldLabel>
            <Pressable
              onPress={() => void fetchLocation()}
              className="rounded-xl bg-surface-1 border border-neutral/10 px-4 py-4"
            >
              {isLocating ? (
                <View className="flex-row items-center gap-3">
                  <ActivityIndicator color="#E4E4E4" size="small" />
                  <Text className="font-grotesk text-sm text-neutral/60">Fetching location...</Text>
                </View>
              ) : coords !== null ? (
                <Text className="font-mono text-[11px] tracking-[0.08em] text-neutral/60">
                  {formatCoord(coords.lat, 'N', 'S')}  {formatCoord(coords.lng, 'E', 'W')}
                </Text>
              ) : (
                <Text className="font-grotesk text-sm text-neutral/60">
                  Use current location
                </Text>
              )}
            </Pressable>
            {locationError !== null ? (
              <Text className="font-grotesk text-sm text-warning mt-2">{locationError}</Text>
            ) : null}
          </View>

          <View>
            <FieldLabel>Message</FieldLabel>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
              textAlignVertical="top"
              placeholder="Add details players should know..."
              placeholderTextColor="rgba(228,228,228,0.20)"
              className="min-h-24 rounded-xl bg-surface-2 border border-neutral/10 px-4 py-3 font-grotesk text-base text-neutral"
            />
          </View>

          <Pressable
            onPress={() => void handleSubmit()}
            disabled={createMatch.isPending}
            className={[
              'h-14 rounded-xl items-center justify-center',
              createMatch.isPending ? 'bg-surface-1' : 'bg-primary',
            ].join(' ')}
          >
            <Text className="font-grotesk font-bold text-base text-neutral">
              {createMatch.isPending ? 'Publishing...' : 'Publish Match'}
            </Text>
          </Pressable>
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
