import { PHASES, PlayerView, leaders, openingsCompleted, totalScores } from '@quaranta/shared';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { Button } from './Button';

interface RoundSummaryProps {
  view: PlayerView;
  onNext: () => void;
  onExit: () => void;
  /** The deal button is disabled while a request to the server is in flight. */
  busy?: boolean;
}

/** Shown when a hand ends: who went out, everyone's points per hand, and running totals. */
export function RoundSummary({ view, onNext, onExit, busy }: RoundSummaryProps) {
  const visible = view.status !== 'playing';
  const lastResult = view.results[view.results.length - 1];
  const totals = totalScores(view);
  const isGameOver = view.status === 'gameOver';
  const paced = view.mode === 'paced';
  const winnerNames = leaders(view).map((p) => p.name);
  const wentOut = lastResult?.winnerId ? view.players.find((p) => p.id === lastResult.winnerId)?.name : null;
  const handName = lastResult
    ? paced
      ? `Hand ${lastResult.phaseIndex + 1}`
      : PHASES[lastResult.phaseIndex].name
    : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={isGameOver ? onExit : onNext}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title} accessibilityRole="header">
            {isGameOver ? `${winnerNames.join(' & ')} ${winnerNames.length > 1 ? 'tie' : 'wins'}!` : 'Hand complete'}
          </Text>
          {lastResult && (
            <Text style={styles.subtitle}>
              {handName}: {wentOut ? `${wentOut} went out.` : 'nobody went out.'}
            </Text>
          )}

          <ScrollView horizontal>
            <View>
              <View style={styles.row}>
                <Text style={[styles.cell, styles.nameCell, styles.head]}>Player</Text>
                {view.results.map((r) => (
                  <Text key={r.phaseIndex} style={[styles.cell, styles.head]}>
                    {r.phaseIndex + 1}
                  </Text>
                ))}
                {paced && <Text style={[styles.cell, styles.head, styles.total]}>Done</Text>}
                <Text style={[styles.cell, styles.head, styles.total]}>Total</Text>
              </View>
              {view.players.map((p) => (
                <View key={p.id} style={styles.row}>
                  <Text style={[styles.cell, styles.nameCell]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {view.results.map((r) => (
                    <Text key={r.phaseIndex} style={styles.cell}>
                      {r.points[p.id]}
                    </Text>
                  ))}
                  {paced && <Text style={[styles.cell, styles.total]}>{openingsCompleted(view, p.id)}</Text>}
                  <Text style={[styles.cell, styles.total]}>{totals[p.id]}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {paced && !isGameOver && (
            <View style={styles.next}>
              <Text style={styles.hint}>Up next</Text>
              {view.players.map((p) => (
                <Text key={p.id} style={styles.nextRow}>
                  {p.name}: {PHASES[Math.min(p.isOpen ? p.phaseIndex + 1 : p.phaseIndex, PHASES.length - 1)].name}
                  {p.isOpen ? '' : ' (again)'}
                </Text>
              ))}
            </View>
          )}
          <Text style={styles.hint}>
            {paced
              ? 'Open to move on to your next opening. The first to finish All Down wins; points break ties.'
              : 'Lowest total after all eight hands wins.'}
          </Text>
          {isGameOver ? (
            <Button label="Back to menu" onPress={onExit} />
          ) : (
            <Button
              disabled={busy}
              label={paced ? `Deal hand ${view.phaseIndex + 2}` : `Deal hand ${view.phaseIndex + 2}: ${PHASES[view.phaseIndex + 1].name}`}
              onPress={onNext}
            />
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
  next: { gap: 2 },
  nextRow: { color: colors.text, fontSize: 13 },
});
