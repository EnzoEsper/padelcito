import { Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Text } from '@/tw';
import {
  getConfirmedPostContacts,
  sortPostContacts,
} from '@/features/community/post-display';
import { formatArgentinaWhatsAppNational } from '@/lib/argentina-whatsapp-phone';
import {
  buildOrganizerVerificationUrl,
  buildPostWhatsAppUrl,
  type PostWhatsAppContext,
} from '@/features/community/post-whatsapp';
import { useSetContactConfirmed } from '@/features/community/use-posts';
import type { PostDetail } from '@/features/community/use-posts';

const C = {
  mist: '#E4E4E4',
  faint: 'rgba(228,228,228,0.38)',
  hair: 'rgba(228,228,228,0.10)',
  success: '#5BE0A6',
  warning: '#E0B15B',
} as const;

type PostContactsDetailSectionProps = {
  post: PostDetail;
};

function toWhatsAppContext(post: PostDetail): PostWhatsAppContext {
  return {
    title: post.title,
    venue_name: post.venue_name,
    type: post.type,
    event_start: post.event_start,
    event_end: post.event_end,
  };
}

export function PostContactsDetailSection({ post }: PostContactsDetailSectionProps) {
  const setConfirmed = useSetContactConfirmed();
  const contacts = sortPostContacts(post.contacts);
  const confirmed = getConfirmedPostContacts(post.contacts);
  const showAllRows = post.isAuthor || post.isModerator;
  const visibleRows = showAllRows ? contacts : confirmed;

  if (visibleRows.length === 0 && !showAllRows) {
    return null;
  }

  async function openUrl(url: string): Promise<void> {
    await Linking.openURL(url);
  }

  async function toggleConfirmed(contactId: string, currentlyConfirmed: boolean): Promise<void> {
    await setConfirmed.mutateAsync({ contactId, confirmed: !currentlyConfirmed, postId: post.id });
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Organizer contacts</Text>
      {showAllRows && confirmed.length === 0 ? (
        <Text style={styles.hint}>
          {post.isModerator
            ? 'Confirm at least one organizer before approving this post.'
            : 'Moderators will verify these numbers before the post goes live.'}
        </Text>
      ) : null}

      {visibleRows.map((contact, index) => {
        const isConfirmed = contact.confirmed_at !== null;
        const isMain = contact.position === 0;
        const phoneLabel = formatArgentinaWhatsAppNational(contact.phone);

        return (
          <View key={contact.id} style={styles.row}>
            <View style={styles.rowMeta}>
              <View style={styles.rowTitleLine}>
                {isMain ? (
                  <View style={styles.mainBadge}>
                    <Text style={styles.mainBadgeText}>Main</Text>
                  </View>
                ) : null}
                <Text style={styles.phoneText}>{phoneLabel}</Text>
              </View>
              {contact.label !== null && contact.label.length > 0 ? (
                <Text style={styles.labelText}>{contact.label}</Text>
              ) : null}
              {contact.is_author_phone ? (
                <Text style={styles.hint}>Author number · OTP verified on profile</Text>
              ) : null}
              {showAllRows ? (
                <View style={styles.statusRow}>
                  <Ionicons
                    name={isConfirmed ? 'checkmark-circle' : 'time-outline'}
                    size={14}
                    color={isConfirmed ? C.success : C.warning}
                  />
                  <Text style={[styles.statusText, isConfirmed ? styles.statusConfirmed : null]}>
                    {isConfirmed ? 'Confirmed organizer' : 'Pending confirmation'}
                  </Text>
                </View>
              ) : null}
            </View>

            {post.isModerator && post.status === 'pending_review' ? (
              <View style={styles.modActions}>
                <Pressable
                  onPress={() =>
                    void openUrl(
                      buildOrganizerVerificationUrl(contact.phone, toWhatsAppContext(post), {
                        label: contact.label,
                      }),
                    )
                  }
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Message to verify</Text>
                </Pressable>
                <Pressable
                  onPress={() => void toggleConfirmed(contact.id, isConfirmed)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>
                    {isConfirmed ? 'Unconfirm' : 'Mark confirmed'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {post.status === 'approved' && isConfirmed && !post.isAuthor ? (
              <Pressable
                onPress={() =>
                  void openUrl(buildPostWhatsAppUrl(contact.phone, toWhatsAppContext(post)))
                }
                style={styles.waButton}
              >
                <Ionicons name="logo-whatsapp" size={16} color={C.mist} />
                <Text style={styles.waButtonText}>
                  {isMain && index === 0 ? 'Contact main organizer' : 'Contact on WhatsApp'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sectionLabel: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.faint,
  },
  hint: {
    fontFamily: 'Grotesk-Regular',
    fontSize: 13,
    color: C.faint,
    lineHeight: 18,
  },
  row: {
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.hair,
    backgroundColor: '#141417',
  },
  rowMeta: {
    gap: 4,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  mainBadge: {
    borderRadius: 6,
    backgroundColor: 'rgba(94,112,184,0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mainBadgeText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#8FA0E8',
  },
  phoneText: {
    fontFamily: 'Grotesk-SemiBold',
    fontSize: 16,
    color: C.mist,
  },
  labelText: {
    fontFamily: 'Grotesk-Regular',
    fontSize: 14,
    color: 'rgba(228,228,228,0.72)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusText: {
    fontFamily: 'Grotesk-Regular',
    fontSize: 12,
    color: C.warning,
  },
  statusConfirmed: {
    color: C.success,
  },
  modActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.hair,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontFamily: 'Grotesk-SemiBold',
    fontSize: 13,
    color: 'rgba(228,228,228,0.72)',
  },
  waButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#1B3D2E',
    paddingVertical: 12,
  },
  waButtonText: {
    fontFamily: 'Grotesk-SemiBold',
    fontSize: 14,
    color: C.mist,
  },
});
