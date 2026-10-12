import { PHASES, PlayerView, totalScores } from '@quaranta/shared';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

/** Online presence for a seat. Seats that aren't listed are treated as always present. */
export interface SeatStatus {
  connected: boolean;
  /** A bot is playing this seat's turns because the player timed out or left. */
  autoplay: boolean;
}

interface PlayerStripProps {
  view: PlayerView;
  seatStatus?: Record<string, SeatStatus>;
}

/** Every player's card count, open status and running score. */
export function PlayerStrip({ view, seatStatus }: PlayerStripProps) {
  const scores = totalScores(view);
  const paced = view.mode === 'paced';
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {view.players.map((player, index) => {
        const active = view.status === 'playing' && index === view.currentPlayerIndex;
        const seat = seatStatus?.[player.id];
        const away = seat ? !seat.connected : false;
        const phase = PHASES[player.phaseIndex];
        const label = [
          `${player.name}: ${player.handCount} cards, ${scores[player.id]} points`,
          paced ? `working on ${phase.name}` : '',
          player.isOpen ? 'open' : '',
          active ? 'playing now' : '',
          away ? 'disconnected' : '',
          seat?.autoplay ? 'a bot is playing for them' : '',
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <View key={player.id} style={[styles.chip, active && styles.active, away && styles.away]} accessible accessibilityLabel={label}>
            <View style={styles.nameRow}>
              {seat && <View style={[styles.dot, seat.connected ? styles.dotOn : styles.dotOff]} />}
              <Text style={styles.name} numberOfLines={1}>
                {player.name}
                {index === view.dealerIndex ? ' · D' : ''}
              </Text>
            </View>
            <Text style={styles.detail}>
              {player.handCount} cards · {scores[player.id]} pts
            </Text>
            {paced && (
              <Text style={styles.phase} numberOfLines={1}>
                {phase.name}
              </Text>
            )}
            {seat?.autoplay ? (
              <Text style={styles.bot}>BOT PLAYING</Text>
            ) : (
              player.isOpen && <Text style={styles.open}>OPEN</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    backgroundColor: colors.feltLight,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 104,
  },
  active: {
    borderColor: colors.gold,
  },
  away: {
    opacity: 0.6,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: colors.success },
  dotOff: { backgroundColor: colors.danger },
  name: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    flexShrink: 1,
  },
  detail: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  phase: {
    color: colors.text,
    fontSize: 11,
    marginTop: 2,
  },
  open: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 1,
  },
  bot: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 1,
  },
});
