import { StyleSheet } from 'react-native';
import { Text, View } from '@/tw';
import { AppBottomSheet } from '@/components/app-bottom-sheet';

type ProfileStatsInfoSheetProps = {
  visible: boolean;
  onClose: () => void;
};

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <Text style={styles.blockBody}>{body}</Text>
    </View>
  );
}

export function ProfileStatsInfoSheet({ visible, onClose }: ProfileStatsInfoSheetProps) {
  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="Profile stats"
      showClose
      maxHeight="72%"
    >
      <InfoBlock
        title="Rating (quality)"
        body="Average star score from optional post-match reviews. Only aggregates are public — individual reviews stay private."
      />
      <InfoBlock
        title="Reliability (show-up)"
        body="Percentage based on verified match commitments. Shows as New until a player has at least 3 qualified matches on the platform."
      />
      <InfoBlock
        title="Drive vs Backhand"
        body="Court sides are fixed: Drive is the right side, Backhand is the left side — not relative to your dominant hand. Hosts may seek a side for open spots; your profile shows where you prefer to play."
      />
      <InfoBlock
        title="Highlights"
        body="Top tags from community ratings, such as Punctual or Good vibe. Tags are aggregated — no individual comments are shown."
      />
      <InfoBlock
        title="Gender & age"
        body="Optional and self-reported — not imported from Google or Apple. Your full birthday is never shown; only age may appear when set. Prefer not to say hides gender from others. Match fit is checked on the match screen before you request to join — not on player profiles. Hosts make final roster decisions."
      />
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: 18,
    gap: 6,
  },
  blockTitle: {
    fontFamily: 'HankenGrotesk-Bold',
    fontSize: 15,
    color: '#E4E4E4',
  },
  blockBody: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(228,228,228,0.60)',
  },
});
