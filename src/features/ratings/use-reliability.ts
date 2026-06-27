import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { matchKeys } from '@/features/matches/use-matches';
import { notificationKeys } from '@/features/notifications/use-notifications';
import type { ReliabilityEventType } from '@/features/ratings/penalty-report';
import type { Database } from '@/types/database';

type ReliabilityReportInsert = Database['public']['Tables']['reliability_reports']['Insert'];

export type SubmitPenaltyReportInput = {
  matchId: string;
  subjectId: string;
  type: ReliabilityEventType;
  participantId?: string | null;
  reasonTags: string[];
  comment: string | null;
};

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error !== null || user === null) {
    throw new Error('Not authenticated');
  }

  return user.id;
}

export function useSubmitPenaltyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitPenaltyReportInput) => {
      const reporterId = await getCurrentUserId();
      const trimmedComment = input.comment?.trim() ?? '';

      const insert: ReliabilityReportInsert = {
        match_id: input.matchId,
        reporter_id: reporterId,
        subject_id: input.subjectId,
        type: input.type,
        participant_id: input.participantId ?? null,
        reason_tags: input.reasonTags,
        comment: trimmedComment.length > 0 ? trimmedComment : null,
      };

      const { error } = await supabase.from('reliability_reports').insert(insert);

      if (error !== null) throw error;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['profile', 'me'] }),
        queryClient.invalidateQueries({ queryKey: matchKeys.detail(variables.matchId) }),
        queryClient.invalidateQueries({ queryKey: matchKeys.mine }),
      ]);
    },
  });
}

export async function fetchPublicProfile(profileId: string) {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, display_name, username, reliability_score, penalty_count')
    .eq('id', profileId)
    .maybeSingle();

  if (error !== null) throw error;
  return data;
}
