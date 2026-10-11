import { GameState, totalScores } from '@quaranta/shared';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

/** Every player's card count, open status and running score. */
export function PlayerStrip({ game }: { game: GameState }) {
  const scores = totalScores(game);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {game.players.map((player, index) => {
        const active = game.status === 'playing' && index === game.currentPlayerIndex;
        return (
          <View
            key={player.id}
            style={[styles.chip, active && styles.active]}
            accessible
            accessibilityLabel={`${player.name}: ${player.hand.length} cards, ${scores[player.id]} points${player.isOpen ? ', open' : ''}${active ? ', playing now' : ''}`}
          >
            <Text style={styles.name} numberOfLines={1}>
              {player.name}
              {index === game.dealerIndex ? ' · D' : ''}
            </Text>
            <Text style={styles.detail}>
              {player.hand.length} cards · {scores[player.id]} pts
            </Text>
            {player.isOpen && <Text style={styles.open}>OPEN</Text>}
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
  name: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  detail: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  open: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 1,
  },
});
