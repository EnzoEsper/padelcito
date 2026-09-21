import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { publicProfileKeys } from '@/features/profile/use-public-profile';

export type ProfileGender = Database['public']['Enums']['profile_gender'];

export type ProfileDemographics = {
  gender: ProfileGender;
  birth_date: string | null;
};

export type UpdateProfileDemographicsInput = {
  gender: ProfileGender;
  birth_date: string | null;
};

export const profileDemographicsKeys = {
  me: ['profile', 'me', 'demographics'] as const,
};

async function fetchCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error !== null || user === null) {
    throw new Error('Not authenticated');
  }
  return user.id;
}

async function fetchProfileDemographics(userId: string): Promise<ProfileDemographics> {
  const { data, error } = await supabase
    .from('profiles')
    .select('gender, birth_date')
    .eq('id', userId)
    .single();

  if (error !== null) {
    throw error;
  }

  return {
    gender: data.gender,
    birth_date: data.birth_date,
  };
}

export function useProfileDemographics() {
  return useQuery({
    queryKey: profileDemographicsKeys.me,
    queryFn: async () => {
      const userId = await fetchCurrentUserId();
      return fetchProfileDemographics(userId);
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateProfileDemographics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileDemographicsInput): Promise<void> => {
      const userId = await fetchCurrentUserId();
      const { error } = await supabase
        .from('profiles')
        .update({
          gender: input.gender,
          birth_date: input.birth_date,
        })
        .eq('id', userId);

      if (error !== null) {
        throw error;
      }
    },
    onSuccess: async () => {
      const userId = await fetchCurrentUserId();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileDemographicsKeys.me }),
        queryClient.invalidateQueries({ queryKey: ['profile', 'me'] }),
        queryClient.invalidateQueries({ queryKey: publicProfileKeys.detail(userId) }),
      ]);
    },
  });
}
