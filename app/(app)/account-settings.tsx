import { Linking, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/tw';
import { useAppAlert } from '@/components/app-alert-dialog';
import { SettingsRow, SettingsSection } from '@/components/settings-list';
import { StackScreenLayout } from '@/components/stack-screen-layout';
import { supabase } from '@/lib/supabase';
import {
  deleteAccountErrorMessage,
  useDeleteAccount,
} from '@/features/account/use-delete-account';
import { LEGAL_URLS } from '@/lib/legal-urls';

const C = {
  dim: 'rgba(228,228,228,0.60)',
  warning: '#E0B15B',
  danger: '#E07B7B',
} as const;

export default function AccountSettingsScreen() {
  const router = useRouter();
  const appAlert = useAppAlert();
  const deleteAccount = useDeleteAccount();

  const confirmSignOut = () => {
    appAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          void supabase.auth.signOut();
        },
      },
    ]);
  };

  const confirmDeleteAccount = () => {
    appAlert(
      'Delete Account',
      'This permanently deletes your profile, matches, posts, and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteAccount.mutateAsync().catch((error: unknown) => {
              appAlert('Could not delete account', deleteAccountErrorMessage(error));
            });
          },
        },
      ],
    );
  };

  return (
    <StackScreenLayout eyebrow="ACCOUNT" title="Settings">
      <SettingsSection label="SAFETY">
        <SettingsRow
          label="Blocked users"
          isFirst
          onPress={() => router.push('/(app)/blocked-users')}
        />
      </SettingsSection>

      <SettingsSection label="LEGAL">
        <SettingsRow
          label="Privacy Policy"
          isFirst
          trailing="external"
          onPress={() => void Linking.openURL(LEGAL_URLS.privacyPolicy)}
        />
        <SettingsRow
          label="Terms of Service"
          trailing="external"
          onPress={() => void Linking.openURL(LEGAL_URLS.termsOfService)}
        />
        <SettingsRow
          label="Account deletion (web)"
          trailing="external"
          onPress={() => void Linking.openURL(LEGAL_URLS.accountDeletion)}
        />
      </SettingsSection>

      <SettingsSection label="SESSION">
        <SettingsRow
          label="Sign Out"
          isFirst
          trailing="none"
          onPress={confirmSignOut}
          labelColor={C.warning}
        />
        <SettingsRow
          label={deleteAccount.isPending ? 'Deleting…' : 'Delete Account'}
          trailing="none"
          onPress={confirmDeleteAccount}
          labelColor={C.danger}
        />
      </SettingsSection>

      <Text style={styles.footerNote}>
        Need help? Email {LEGAL_URLS.supportEmail}
      </Text>
    </StackScreenLayout>
  );
}

const styles = StyleSheet.create({
  footerNote: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    color: C.dim,
    lineHeight: 18,
  },
});
