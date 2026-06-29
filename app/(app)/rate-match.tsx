import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View, Text, Pressable } from '@/tw';
import { useAppAlert } from '@/components/app-alert-dialog';
import {
  QUALITY_REASON_TAGS,
  RATING_SCREEN_COPY,
  formatStarLabel,
  toggleQualityTag,
} from '@/features/ratings/rating-display';
import {
  useRatableMatch,
  useSubmitRatings,
  type RatableMember,
} from '@/features/ratings/use-ratings';

const C = {
  background: '#0B0B0B',
  surface1: '#141417',
  surface3: '#232429',
  mist: '#E4E4E4',
  dim: 'rgba(228,228,228,0.60)',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
  primaryHi: '#6B7FD7',
  primaryTint: 'rgba(107,127,215,0.12)',
  primaryBorder: 'rgba(107,127,215,0.35)',
  success: '#5BE0A6',
} as const;

type MemberDraft = {
  stars: number | null;
  tags: string[];
};

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (stars: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = value !== null && star <= value;
        return (
          <Pressable
            key={star}
            disabled={disabled}
            onPress={() => onChange(star)}
            style={styles.starButton}
            accessibilityLabel={formatStarLabel(star)}
            accessibilityRole="button"
          >
            <Ionicons
              name={active ? 'star' : 'star-outline'}
              size={24}
              color={active ? C.primaryHi : C.faint}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function MemberRatingCard({
  member,
  draft,
  onChangeStars,
  onToggleTag,
}: {
  member: RatableMember;
  draft: MemberDraft;
  onChangeStars: (stars: number) => void;
  onToggleTag: (tag: string) => void;
}) {
  if (member.alreadyRated) {
    return (
      <View style={styles.memberCard}>
        <View style={styles.memberHeader}>
          <Text style={styles.memberName}>{member.displayName}</Text>
          <View style={styles.doneBadge}>
            <Ionicons name="checkmark-circle" size={14} color={C.success} />
            <Text style={styles.doneBadgeText}>{RATING_SCREEN_COPY.doneLabel}</Text>
          </View>
        </View>
        {member.existingStars !== null ? (
          <StarPicker value={member.existingStars} onChange={() => undefined} disabled />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.memberCard}>
      <Text style={styles.memberName}>{member.displayName}</Text>
      <Text style={styles.fieldLabel}>{RATING_SCREEN_COPY.starsLabel}</Text>
      <StarPicker value={draft.stars} onChange={onChangeStars} />
      <Text style={styles.fieldLabel}>{RATING_SCREEN_COPY.tagsLabel}</Text>
      <View style={styles.chipRow}>
        {QUALITY_REASON_TAGS.map((tag) => {
          const active = draft.tags.includes(tag);
          return (
            <Pressable
              key={tag}
              onPress={() => onToggleTag(tag)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function RateMatchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const appAlert = useAppAlert();
  const params = useLocalSearchParams<{ matchId?: string }>();
  const matchId = typeof params.matchId === 'string' ? params.matchId : '';
  const copy = RATING_SCREEN_COPY;

  const { data, isPending, error } = useRatableMatch(matchId.length > 0 ? matchId : null);
  const submitRatings = useSubmitRatings();
  const [comment, setComment] = useState('');
  const [drafts, setDrafts] = useState<Record<string, MemberDraft>>({});

  const unratedMembers = useMemo(
    () => (data?.members ?? []).filter((member) => !member.alreadyRated),
    [data?.members],
  );

  const matchLabel = useMemo(() => {
    if (data === undefined) return '';
    return data.venueName ?? data.matchTitle;
  }, [data]);

  function getDraft(memberId: string): MemberDraft {
    return drafts[memberId] ?? { stars: null, tags: [] };
  }

  function updateDraft(memberId: string, patch: Partial<MemberDraft>) {
    setDrafts((current) => ({
      ...current,
      [memberId]: {
        ...getDraft(memberId),
        ...patch,
      },
    }));
  }

  function handleSubmit() {
    if (data === undefined) return;

    const entries = unratedMembers
      .map((member) => {
        const draft = getDraft(member.profileId);
        if (draft.stars === null) return null;
        return {
          rateeId: member.profileId,
          stars: draft.stars,
          tags: draft.tags,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    if (entries.length === 0) {
      appAlert('Select stars', 'Choose at least one star rating before submitting.');
      return;
    }

    submitRatings.mutate(
      {
        matchId: data.matchId,
        entries,
        comment: comment.trim().length > 0 ? comment.trim() : null,
      },
      {
        onSuccess: () => {
          appAlert(copy.successTitle, copy.successMessage, [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
        onError: (submitError) => {
          const message =
            submitError instanceof Error
              ? submitError.message
              : 'Could not submit ratings. Please try again.';
          appAlert('Rating failed', message);
        },
      },
    );
  }

  if (matchId.length === 0) {
    return (
      <View style={[styles.centerState, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.errorText}>Invalid rating link.</Text>
        <Pressable onPress={() => router.back()} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>{copy.skipLabel}</Text>
        </Pressable>
      </View>
    );
  }

  if (isPending) {
    return (
      <View style={[styles.centerState, { paddingTop: insets.top + 24 }]}>
        <ActivityIndicator color={C.mist} />
      </View>
    );
  }

  if (error !== null || data === undefined) {
    return (
      <View style={[styles.centerState, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.errorText}>Could not load match ratings.</Text>
        <Pressable onPress={() => router.back()} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>{copy.skipLabel}</Text>
        </Pressable>
      </View>
    );
  }

  if (!data.ratingWindowOpen) {
    return (
      <View style={[styles.centerState, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.errorText}>The rating window for this match has closed.</Text>
        <Pressable onPress={() => router.back()} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>{copy.skipLabel}</Text>
        </Pressable>
      </View>
    );
  }

  if (data.allRated || data.members.length === 0) {
    return (
      <View style={[styles.centerState, { paddingTop: insets.top + 24 }]}>
        <Ionicons name="checkmark-circle-outline" size={40} color={C.success} />
        <Text style={styles.doneTitle}>{copy.doneLabel}</Text>
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
          <Text style={styles.screenLabel}>QUALITY</Text>
          <Text style={styles.screenTitle}>{copy.screenTitle}</Text>
        </View>
      </View>

      <View style={styles.noticeCard}>
        <Ionicons name="star-outline" size={18} color={C.primaryHi} />
        <View style={styles.noticeContent}>
          <Text style={styles.noticeTitle}>{matchLabel}</Text>
          <Text style={styles.noticeBody}>{copy.subtitle}</Text>
        </View>
      </View>

      {data.members.map((member) => (
        <MemberRatingCard
          key={member.profileId}
          member={member}
          draft={getDraft(member.profileId)}
          onChangeStars={(stars) => updateDraft(member.profileId, { stars })}
          onToggleTag={(tag) =>
            updateDraft(member.profileId, {
              tags: toggleQualityTag(getDraft(member.profileId).tags, tag),
            })
          }
        />
      ))}

      {unratedMembers.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{copy.commentLabel.toUpperCase()}</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={copy.commentPlaceholder}
            placeholderTextColor={C.faint}
            multiline
            maxLength={500}
            style={styles.commentInput}
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={handleSubmit}
          disabled={submitRatings.isPending}
          style={[styles.submitButton, submitRatings.isPending && styles.submitButtonDisabled]}
        >
          {submitRatings.isPending ? (
            <ActivityIndicator color={C.background} />
          ) : (
            <Text style={styles.submitButtonText}>{copy.submitLabel}</Text>
          )}
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>{copy.skipLabel}</Text>
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
  centerState: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
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
    backgroundColor: C.primaryTint,
    borderWidth: 1,
    borderColor: C.primaryBorder,
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
    color: C.primaryHi,
    marginBottom: 6,
  },
  noticeBody: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 19,
    color: C.dim,
  },
  memberCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: C.surface1,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 16,
    padding: 16,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  memberName: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 18,
    color: C.mist,
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: C.dim,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  starButton: {
    padding: 2,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doneBadgeText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    color: C.success,
  },
  doneTitle: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 18,
    color: C.mist,
    textAlign: 'center',
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
    backgroundColor: C.surface3,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: C.primaryBorder,
    backgroundColor: C.primaryTint,
  },
  chipText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    color: C.dim,
  },
  chipTextActive: {
    color: C.primaryHi,
    fontFamily: 'HankenGrotesk-Bold',
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
    backgroundColor: C.primaryHi,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 16,
    color: C.background,
  },
  ghostButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 15,
    color: C.dim,
  },
  errorText: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 15,
    color: C.dim,
    textAlign: 'center',
  },
});
