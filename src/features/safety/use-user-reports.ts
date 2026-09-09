import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toUserFacingError } from '@/lib/error-message';
import { logger } from '@/lib/logger';
import type { Database } from '@/types/database';
import type { UserReportReason } from '@/features/safety/safety-display';

type PublicProfileRow = Database['public']['Views']['public_profiles']['Row'];
type UserReportRow = Database['public']['Tables']['user_reports']['Row'];

export type UserReportSummary = UserReportRow & {
  reporter: PublicProfileRow | null;
  reported: PublicProfileRow | null;
  reportedBannedAt: string | null;
};

export type ReportUserInput = {
  reportedId: string;
  reason: UserReportReason;
  comment?: string;
  matchId?: string | null;
  postId?: string | null;
};

export const userReportKeys = {
  all: ['user-reports'] as const,
  open: ['user-reports', 'open'] as const,
};

async function fetchPublicProfilesByIds(ids: string[]): Promise<Map<string, PublicProfileRow>> {
  const uniqueIds = Array.from(new Set(ids.filter((id) => id.length > 0)));
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('public_profiles')
    .select('*')
    .in('id', uniqueIds);

  if (error !== null) {
    throw error;
  }

  const map = new Map<string, PublicProfileRow>();
  for (const profile of data ?? []) {
    if (profile.id !== null) {
      map.set(profile.id, profile);
    }
  }
  return map;
}

export function useOpenUserReports(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userReportKeys.open,
    enabled: options?.enabled ?? true,
    queryFn: async (): Promise<UserReportSummary[]> => {
      const { data, error } = await supabase
        .from('user_reports')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (error !== null) {
        throw error;
      }

      const rows = data ?? [];
      if (rows.length === 0) {
        return [];
      }

      const profileIds = rows.flatMap((row) => [row.reporter_id, row.reported_id]);
      const reportedIds = Array.from(new Set(rows.map((row) => row.reported_id)));
      const profilesById = await fetchPublicProfilesByIds(profileIds);

      const banStatusByUserId = new Map<string, string | null>();
      if (reportedIds.length > 0) {
        const { data: banRows, error: banError } = await supabase.rpc(
          'fetch_ban_status_for_users',
          { p_user_ids: reportedIds },
        );

        if (banError !== null) {
          throw banError;
        }

        for (const row of banRows ?? []) {
          banStatusByUserId.set(row.user_id, row.banned_at);
        }
      }

      return rows.map((row) => ({
        ...row,
        reporter: profilesById.get(row.reporter_id) ?? null,
        reported: profilesById.get(row.reported_id) ?? null,
        reportedBannedAt: banStatusByUserId.get(row.reported_id) ?? null,
      }));
    },
  });
}

export function useReportUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReportUserInput): Promise<string> => {
      const { data, error } = await supabase.rpc('report_user', {
        p_reported_id: input.reportedId,
        p_reason: input.reason,
        p_comment: input.comment?.trim() || undefined,
        p_match_id: input.matchId ?? undefined,
        p_community_post_id: input.postId ?? undefined,
      });

      if (error !== null) {
        throw error;
      }

      if (data === null) {
        throw new Error('Report could not be submitted.');
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userReportKeys.all });
    },
    onError: (error) => {
      logger.error('report_user failed', error);
    },
  });
}

export function useResolveUserReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string): Promise<void> => {
      const { error } = await supabase.rpc('resolve_user_report', {
        p_report_id: reportId,
      });

      if (error !== null) {
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userReportKeys.all });
    },
    onError: (error) => {
      logger.error('resolve_user_report failed', error);
    },
  });
}

export function reportUserErrorMessage(error: unknown): string {
  return toUserFacingError(error, 'Could not submit report. Please try again.');
}

export function resolveUserReportErrorMessage(error: unknown): string {
  return toUserFacingError(error, 'Could not resolve report. Please try again.');
}

export type GroupedUserReports = {
  reportedId: string;
  reportedName: string;
  reportedBannedAt: string | null;
  reports: UserReportSummary[];
};

export function groupOpenUserReports(reports: UserReportSummary[]): GroupedUserReports[] {
  const grouped = new Map<string, GroupedUserReports>();

  for (const report of reports) {
    const existing = grouped.get(report.reported_id);
    const reportedName = report.reported?.display_name ?? 'Player';

    if (existing === undefined) {
      grouped.set(report.reported_id, {
        reportedId: report.reported_id,
        reportedName,
        reportedBannedAt: report.reportedBannedAt,
        reports: [report],
      });
    } else {
      existing.reports.push(report);
    }
  }

  return Array.from(grouped.values()).sort(
    (a, b) => b.reports.length - a.reports.length || a.reportedName.localeCompare(b.reportedName),
  );
}

export function useResolveAllUserReportsForUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportIds: string[]): Promise<void> => {
      for (const reportId of reportIds) {
        const { error } = await supabase.rpc('resolve_user_report', {
          p_report_id: reportId,
        });

        if (error !== null) {
          throw error;
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userReportKeys.all });
    },
    onError: (error) => {
      logger.error('resolve_user_report batch failed', error);
    },
  });
}
