import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { ConnectionState } from '@/services/online';
import { colors, radius, spacing } from '@/theme';

interface OnlineBannerProps {
  connection: ConnectionState;
  /** A bot has been playing the viewer's seat. */
  botIsPlayingForMe: boolean;
  onResume: () => void;
  busy?: boolean;
}

/** Tells the player when the connection is down or a bot has been covering for them. */
export function OnlineBanner({ connection, botIsPlayingForMe, onResume, busy }: OnlineBannerProps) {
  if (connection === 'offline') {
    return (
      <View style={[styles.bar, styles.offline]} accessibilityRole="alert">
        <Text style={styles.text}>Connection lost. Your moves are paused, and the table keeps going without you until you&apos;re back.</Text>
      </View>
    );
  }
  if (connection === 'connecting') {
    return (
      <View style={[styles.bar, styles.info]} accessibilityLiveRegion="polite">
        <Text style={styles.text}>Connecting to the table…</Text>
      </View>
    );
  }
  if (botIsPlayingForMe) {
    return (
      <View style={[styles.bar, styles.info]} accessibilityLiveRegion="polite">
        <Text style={styles.text}>You were away, so a computer player has been taking your turns.</Text>
        <Button label="I'm back" compact disabled={busy} onPress={onResume} />
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  offline: { backgroundColor: colors.dangerSurface },
  info: { backgroundColor: colors.feltLight },
  text: { color: colors.text, fontSize: 13, flex: 1 },
});
