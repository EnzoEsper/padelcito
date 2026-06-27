import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View, Text, Pressable } from '@/tw';
import {
  getPenaltyReportCopy,
  parseReliabilityEventType,
} from '@/features/ratings/penalty-report';
import {
  fetchPublicProfile,
  useSubmitPenaltyReport,
} from '@/features/ratings/use-reliability';

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  surface3: '#232429',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
  warning: '#E0B15B',
  warningTint: 'rgba(224,177,91,0.08)',
  warningBorder: 'rgba(224,177,91,0.30)',
} as const;

function toggleTag(selected: string[], tag: string): string[] {
  return selected.includes(tag) ? selected.filter((item) => item !== tag) : [...selected, tag];
}

export default function ReportPenaltyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    matchId?: string;
    subjectId?: string;
    type?: string;
    participantId?: string;
  }>();

  const matchId = typeof params.matchId === 'string' ? params.matchId : '';
  const subjectId = typeof params.subjectId === 'string' ? params.subjectId : '';
  const participantId =
    typeof params.participantId === 'string' ? params.participantId : undefined;
  const eventType = parseReliabilityEventType(
    typeof params.type === 'string' ? params.type : undefined,
  );

  const copy = eventType !== null ? getPenaltyReportCopy(eventType) : null;
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const submitReport = useSubmitPenaltyReport();

  const { data: subject, isPending: subjectPending } = useQuery({
    queryKey: ['public-profile', subjectId],
    enabled: subjectId.length > 0,
    queryFn: () => fetchPublicProfile(subjectId),
  });

  const subjectLabel = useMemo(() => {
    const name = subject?.display_name;
    if (name !== null && name !== undefined && name.length > 0) {
      return name;
    }
    return 'Player';
  }, [subject?.display_name]);

  const paramsValid =
    matchId.length > 0 && subjectId.length > 0 && eventType !== null && copy !== null;

  function handleSubmit() {
    if (!paramsValid || eventType === null) return;

    submitReport.mutate(
      {
        matchId,
        subjectId,
        type: eventType,
        participantId: participantId ?? null,
        reasonTags: selectedTags,
        comment: comment.trim().length > 0 ? comment.trim() : null,
      },
      {
        onSuccess: () => {
          Alert.alert('Report submitted', 'Thank you. This helps keep matches reliable.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : 'Could not submit report. Please try again.';
          Alert.alert('Report failed', message);
        },
      },
    );
  }

  if (!paramsValid) {
    return (
      <View style={[styles.centerState, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.errorText}>Invalid report link.</Text>
        <Pressable onPress={() => router.back()} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={C.mist} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.screenLabel}>RELIABILITY</Text>
          <Text style={styles.screenTitle}>{copy.screenTitle}</Text>
        </View>
      </View>

      <View style={styles.noticeCard}>
        <Ionicons name="warning-outline" size={18} color={C.warning} />
        <View style={styles.noticeContent}>
          <Text style={styles.noticeTitle}>{copy.eventTitle}</Text>
          <Text style={styles.noticeBody}>{copy.eventDescription}</Text>
        </View>
      </View>

      <View style={styles.subjectCard}>
        <Text style={styles.sectionLabel}>REPORTING</Text>
        {subjectPending ? (
          <ActivityIndicator color={C.mist} />
        ) : (
          <Text style={styles.subjectName}>{subjectLabel}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>REASON (OPTIONAL)</Text>
        <View style={styles.chipRow}>
          {copy.reasonTags.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => setSelectedTags((current) => toggleTag(current, tag))}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>COMMENT (OPTIONAL)</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Add context if helpful"
          placeholderTextColor={C.faint}
          multiline
          maxLength={500}
          style={styles.commentInput}
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={handleSubmit}
          disabled={submitReport.isPending}
          style={[styles.submitButton, submitReport.isPending && styles.submitButtonDisabled]}
        >
          {submitReport.isPending ? (
            <ActivityIndicator color={C.background} />
          ) : (
            <Text style={styles.submitButtonText}>{copy.submitLabel}</Text>
          )}
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Not now</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
    backgroundColor: C.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  screenLabel: {
    fontFamily: 'Space Mono',
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: C.dim,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  screenTitle: {
    fontFamily: 'HankenGrotesk-ExtraBold',
    fontSize: 24,
    color: C.mist,
    letterSpacing: -0.5,
  },
  noticeCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: C.warningTint,
    borderWidth: 1,
    borderColor: C.warningBorder,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 15,
    color: C.warning,
    marginBottom: 6,
  },
  noticeBody: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 19,
    color: C.dim,
  },
  subjectCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 16,
    padding: 16,
  },
  subjectName: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 18,
    color: C.mist,
    marginTop: 6,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: C.dim,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.hair,
    backgroundColor: C.surface1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: C.warning,
    backgroundColor: C.warningTint,
  },
  chipText: {
    fontFamily: 'HankenGrotesk-Medium',
    fontSize: 13,
    color: C.dim,
  },
  chipTextActive: {
    color: C.warning,
  },
  commentInput: {
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.hair,
    backgroundColor: C.surface1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    color: C.mist,
    textAlignVertical: 'top',
  },
  actions: {
    marginHorizontal: 20,
    gap: 12,
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: C.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 15,
    color: C.background,
  },
  ghostButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  ghostButtonText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.dim,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: C.background,
  },
  errorText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    color: C.dim,
    marginBottom: 16,
  },
});
