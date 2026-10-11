import { GameState, PHASES, leaders, totalScores } from '@quaranta/shared';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { Button } from './Button';

interface RoundSummaryProps {
  game: GameState;
  onNext: () => void;
  onExit: () => void;
}

/** Shown when a hand ends: who went out, everyone's points per hand, and running totals. */
export function RoundSummary({ game, onNext, onExit }: RoundSummaryProps) {
  const visible = game.status !== 'playing';
  const lastResult = game.results[game.results.length - 1];
  const totals = totalScores(game);
  const isGameOver = game.status === 'gameOver';
  const winnerNames = leaders(game).map((p) => p.name);
  const wentOut = lastResult?.winnerId ? game.players.find((p) => p.id === lastResult.winnerId)?.name : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={isGameOver ? onExit : onNext}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title} accessibilityRole="header">
            {isGameOver ? `${winnerNames.join(' & ')} ${winnerNames.length > 1 ? 'tie' : 'wins'}!` : 'Hand complete'}
          </Text>
          {lastResult && (
            <Text style={styles.subtitle}>
              {PHASES[lastResult.phaseIndex].name}: {wentOut ? `${wentOut} went out.` : 'nobody went out.'}
            </Text>
          )}

          <ScrollView horizontal>
            <View>
              <View style={styles.row}>
                <Text style={[styles.cell, styles.nameCell, styles.head]}>Player</Text>
                {game.results.map((r) => (
                  <Text key={r.phaseIndex} style={[styles.cell, styles.head]}>
                    {r.phaseIndex + 1}
                  </Text>
                ))}
                <Text style={[styles.cell, styles.head, styles.total]}>Total</Text>
              </View>
              {game.players.map((p) => (
                <View key={p.id} style={styles.row}>
                  <Text style={[styles.cell, styles.nameCell]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {game.results.map((r) => (
                    <Text key={r.phaseIndex} style={styles.cell}>
                      {r.points[p.id]}
                    </Text>
                  ))}
                  <Text style={[styles.cell, styles.total]}>{totals[p.id]}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.hint}>Lowest total after all eight hands wins.</Text>
          {isGameOver ? (
            <Button label="Back to menu" onPress={onExit} />
          ) : (
            <Button label={`Deal hand ${game.phaseIndex + 2}: ${PHASES[game.phaseIndex + 1].name}`} onPress={onNext} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.felt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 560,
  },
  title: {
    color: colors.gold,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.text,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cell: {
    color: colors.text,
    width: 36,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  nameCell: {
    width: 96,
    textAlign: 'left',
  },
  head: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  total: {
    width: 56,
    fontWeight: '800',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
