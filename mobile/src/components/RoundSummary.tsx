import { PHASES, PublicGameView, PublicPlayer, STAKES, formatCents, leaders, openingsCompleted, totalScores } from '@quaranta/shared';
import { ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, seatColor, shadows, spacing } from '@/theme';
import { Button } from './Button';
import { Appear } from './motion';

interface RoundSummaryProps {
  view: PublicGameView;
  onNext: () => void;
  onExit: () => void;
  /** The deal button is disabled while a request to the server is in flight. */
  busy?: boolean;
}

interface Standing {
  player: PublicPlayer;
  seat: number;
}

/** Shown when a hand ends: who went out, everyone's points per hand, and running totals. */
export function RoundSummary({ view, onNext, onExit, busy }: RoundSummaryProps) {
  const visible = view.status !== 'playing';
  const lastResult = view.results[view.results.length - 1];
  const totals = totalScores(view);
  const isGameOver = view.status === 'gameOver';
  const paced = view.mode === 'paced';
  const leaderIds = new Set(leaders(view).map((p) => p.id));
  const winnerNames = leaders(view).map((p) => p.name);
  const wentOut = lastResult?.winnerId ? view.players.find((p) => p.id === lastResult.winnerId)?.name : null;
  // Rank players by running total so the table reads as standings.
  const standings = view.players
    .map((player, seat) => ({ player, seat }))
    .sort((a, b) => totals[a.player.id] - totals[b.player.id]);

  /** One column group of the standings table: a header row, then a row per player. */
  const column = (header: ReactNode, cells: (entry: Standing, leading: boolean) => ReactNode) => (
    <View>
      <View style={[styles.row, styles.headRow]}>{header}</View>
      {standings.map((entry, rank) => {
        const leading = leaderIds.has(entry.player.id);
        return (
          <Appear key={entry.player.id} delay={260 + rank * 70} from="below">
            <View style={[styles.row, leading && styles.leaderRow]}>{cells(entry, leading)}</View>
          </Appear>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={isGameOver ? onExit : onNext}>
      <View style={styles.backdrop}>
        {visible && (
          <Appear key={`${view.phaseIndex}-${view.status}`} from="below" duration={360} delay={120} style={styles.sheet}>
            <Text style={styles.kicker}>
              {isGameOver
                ? 'Game over'
                : paced
                  ? `Hand ${(lastResult?.phaseIndex ?? view.phaseIndex) + 1}`
                  : `Hand ${(lastResult?.phaseIndex ?? view.phaseIndex) + 1} of ${PHASES.length}`}
            </Text>
            <Text style={styles.title} accessibilityRole="header">
              {isGameOver ? `${winnerNames.join(' & ')} ${winnerNames.length > 1 ? 'tie' : 'wins'}!` : 'Hand complete'}
            </Text>
            {lastResult && (
              <Text style={styles.subtitle}>
                {paced ? `Hand ${lastResult.phaseIndex + 1}` : PHASES[lastResult.phaseIndex].name}:{' '}
                {wentOut
                  ? `${wentOut} went out and took the ${formatCents(lastResult.pot ?? 0)} pot.`
                  : 'nobody went out.'}
              </Text>
            )}

            {/* Names and totals stay put; only the per-hand scores scroll on narrow screens. */}
            <View style={styles.table}>
              {column(
                <Text style={[styles.cell, styles.nameCell, styles.head]}>Player</Text>,
                ({ player, seat }, leading) => (
                  <View style={[styles.nameCell, styles.nameWrap]}>
                    <View style={[styles.dot, { backgroundColor: seatColor(seat) }]} />
                    <Text style={[styles.nameText, leading && styles.leaderText]} numberOfLines={1}>
                      {player.name}
                    </Text>
                  </View>
                ),
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.handsScroll}>
                {column(
                  view.results.map((r) => (
                    <Text key={r.phaseIndex} style={[styles.cell, styles.head]}>
                      {r.phaseIndex + 1}
                    </Text>
                  )),
                  ({ player }) =>
                    view.results.map((r) => (
                      <Text key={r.phaseIndex} style={[styles.cell, r.winnerId === player.id && styles.wentOut]}>
                        {r.points[player.id]}
                      </Text>
                    )),
                )}
              </ScrollView>
              {column(
                <>
                  {paced && <Text style={[styles.cell, styles.head, styles.total]}>Done</Text>}
                  <Text style={[styles.cell, styles.head, styles.total]}>Total</Text>
                  <Text style={[styles.cell, styles.head, styles.money]}>{isGameOver ? 'Won' : 'Net'}</Text>
                </>,
                ({ player }, leading) => (
                  <>
                    {paced && <Text style={[styles.cell, styles.total]}>{openingsCompleted(view, player.id)}</Text>}
                    <Text style={[styles.cell, styles.total, leading && styles.leaderText]}>{totals[player.id]}</Text>
                    <Money cents={view.purses[player.id] ?? 0} />
                  </>
                ),
              )}
            </View>

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
              {isGameOver
                ? `${
                    paced ? 'Most openings completed wins, with points breaking ties' : 'Lowest total after eight hands wins'
                  }, and the winner collects ${formatCents(STAKES.gameWin)} from everyone.`
                : paced
                  ? `Open to move on to your next opening. Everyone antes ${formatCents(STAKES.ante)}.`
                  : `Up next: ${PHASES[view.phaseIndex + 1].description} Everyone antes ${formatCents(STAKES.ante)}.`}
            </Text>
            {isGameOver ? (
              <Button label="Back to menu" onPress={onExit} />
            ) : (
              <Button
                label={paced ? `Deal hand ${view.phaseIndex + 2}` : `Deal hand ${view.phaseIndex + 2}: ${PHASES[view.phaseIndex + 1].name}`}
                disabled={busy}
                onPress={onNext}
              />
            )}
          </Appear>
        )}
      </View>
    </Modal>
  );
}

function Money({ cents }: { cents: number }) {
  return (
    <Text style={[styles.cell, styles.money, cents > 0 ? styles.up : cents < 0 ? styles.down : null]}>
      {cents > 0 ? '+' : ''}
      {formatCents(cents)}
    </Text>
  );
}

const styles = StyleSheet.create({
  next: { gap: 2 },
  nextRow: { color: colors.text, fontSize: 13 },
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.feltDark,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(242, 214, 150, 0.25)',
    padding: spacing.xl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 560,
    boxShadow: shadows.panel,
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.gold,
    fontSize: 30,
    fontFamily: fonts.displayHeavy,
  },
  subtitle: {
    color: colors.text,
    fontSize: 15,
  },
  table: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  handsScroll: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(242, 214, 150, 0.14)',
  },
  headRow: {
    borderBottomColor: 'rgba(242, 214, 150, 0.3)',
  },
  leaderRow: {
    backgroundColor: colors.goldSoft,
  },
  cell: {
    color: colors.text,
    width: 36,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  nameCell: {
    width: 104,
    textAlign: 'left',
    paddingLeft: spacing.sm,
  },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nameText: {
    color: colors.text,
    flexShrink: 1,
  },
  head: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
  },
  total: {
    width: 56,
    fontWeight: '800',
  },
  money: {
    width: 64,
    textAlign: 'right',
    paddingRight: spacing.sm,
    fontWeight: '700',
  },
  up: {
    color: '#7fd69a',
  },
  down: {
    color: colors.danger,
  },
  leaderText: {
    color: colors.gold,
    fontWeight: '800',
  },
  wentOut: {
    color: colors.gold,
    fontWeight: '700',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
