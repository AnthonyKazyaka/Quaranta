import { Card, PHASES, PlayerView, cardLabel, sortCards } from '@quaranta/shared';
import { ReactNode, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TableUi } from '@/stores/tableSlice';
import { colors, radius, spacing, useLayout } from '@/theme';
import { Button } from './Button';
import { PlayerStrip, SeatStatus } from './PlayerStrip';
import { CardBack, PlayingCard } from './PlayingCard';
import { RoundSummary } from './RoundSummary';
import { TableMelds } from './TableMelds';

interface GameTableProps {
  view: PlayerView;
  ui: TableUi;
  /** Leaves the table (the Menu button). */
  onMenu: () => void;
  /** Leaves after the game is over. */
  onExit: () => void;
  /** Online presence, keyed by player id. */
  seatStatus?: Record<string, SeatStatus>;
  /** Shown at the top of the screen, e.g. connection warnings. */
  banner?: ReactNode;
  /** Shown beside the Menu button, e.g. the turn timer. */
  headerExtra?: ReactNode;
  /** Blocks every move, e.g. while the connection is down. */
  locked?: boolean;
  /** Shown instead of the usual hint, e.g. "Reconnecting…". */
  lockedReason?: string;
}

/** The hint under the table: what the player can do right now. */
export function turnPrompt(view: PlayerView): string {
  const current = view.players[view.currentPlayerIndex];
  const me = view.players.find((p) => p.id === view.viewerId);
  if (!me) return '';

  const offer = view.buyOffer;
  if (offer) {
    const label = cardLabel(offer.card);
    const answered = !!offer.responses[me.id];
    if (offer.eligible.includes(me.id) && !answered) {
      return `${current.name} drew from the deck. Buy ${label}?`;
    }
    return current.id === me.id
      ? `Waiting to see whether anyone buys ${label}…`
      : `Waiting for the others to decide on ${label}…`;
  }

  const phase = PHASES[me.phaseIndex];
  if (current.id !== me.id) return `${current.name} is playing…`;
  if (view.turnStage === 'draw') return 'Your turn. Draw from the deck or take the top discard.';
  if (!me.isOpen) return `Open with ${phase.name}: select cards and tap Open, or discard to end your turn.`;
  if (view.openedThisTurn) return 'You opened! Discard a card to end your turn.';
  return 'Lay new melds, tap a meld on the table to add cards, then discard.';
}

export function GameTable({ view, ui, onMenu, onExit, seatStatus, banner, headerExtra, locked, lockedReason }: GameTableProps) {
  const layout = useLayout();
  const { selectedIds, stagedMelds, sortBy, message, pending } = ui;

  const stagedIds = useMemo(() => new Set(stagedMelds.flat()), [stagedMelds]);
  const hand = useMemo(
    () => sortCards(view.hand.filter((c) => !stagedIds.has(c.id)), sortBy),
    [view.hand, stagedIds, sortBy],
  );

  const me = view.players.find((p) => p.id === view.viewerId);
  if (!me) return null;

  const phase = PHASES[me.phaseIndex];
  const paced = view.mode === 'paced';
  const frozen = !!locked || pending;
  const isMyTurn = view.status === 'playing' && view.players[view.currentPlayerIndex].id === me.id;
  const offer = view.buyOffer;
  const canDraw = isMyTurn && view.turnStage === 'draw' && !frozen;
  const inPlay = isMyTurn && view.turnStage === 'play' && !offer && !frozen;
  const canPlayOnTable = inPlay && me.isOpen && !view.openedThisTurn;
  const mustAnswerBuy = !!offer && offer.eligible.includes(me.id) && !offer.responses[me.id];
  const discard = view.topDiscard;
  const byId = new Map(view.hand.map((c) => [c.id, c] as const));
  const recentLog = view.log.slice(-3).reverse();
  const promptText = lockedReason ?? message?.text ?? turnPrompt(view);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      {banner}
      <View style={[styles.header, { maxWidth: layout.contentWidth }]}>
        <View style={styles.headerText}>
          <Text style={styles.phaseLabel}>
            {paced ? `Hand ${view.phaseIndex + 1} · your opening` : `Hand ${view.phaseIndex + 1} of ${PHASES.length}`}
          </Text>
          <Text style={styles.phaseName} accessibilityRole="header">
            {phase.name}
          </Text>
        </View>
        {headerExtra}
        <Button label="Menu" variant="secondary" compact onPress={onMenu} />
      </View>

      <ScrollView style={styles.table} contentContainerStyle={[styles.tableContent, { maxWidth: layout.contentWidth }]}>
        <Text style={styles.requirement}>{phase.description}</Text>
        <PlayerStrip view={view} seatStatus={seatStatus} />

        <View style={styles.piles}>
          <Pressable
            onPress={ui.drawFromDeck}
            disabled={!canDraw}
            accessibilityRole="button"
            accessibilityLabel={`Draw from the deck, ${view.deckCount} cards left`}
            style={[styles.pile, canDraw && styles.pileActive]}
          >
            <CardBack width={layout.handCardWidth} />
            <Text style={styles.pileLabel}>Deck · {view.deckCount}</Text>
          </Pressable>
          <Pressable
            onPress={ui.drawFromDiscard}
            disabled={!canDraw || !discard}
            accessibilityRole="button"
            accessibilityLabel="Take the top discard"
            style={[styles.pile, canDraw && !!discard && styles.pileActive, !!offer && styles.pileForSale]}
          >
            {discard ? (
              <PlayingCard card={discard} width={layout.handCardWidth} />
            ) : (
              <View style={[styles.emptyPile, { width: layout.handCardWidth, height: layout.handCardWidth * 1.4 }]} />
            )}
            <Text style={styles.pileLabel}>{offer ? 'For sale' : 'Discard'}</Text>
          </Pressable>
          <View style={styles.log} accessibilityLiveRegion="polite">
            {recentLog.map((entry, i) => (
              <Text key={entry.id} style={[styles.logText, i === 0 && styles.logLatest]} numberOfLines={2}>
                {entry.message}
              </Text>
            ))}
          </View>
        </View>

        <TableMelds
          melds={view.melds}
          players={view.players}
          cardWidth={layout.tableCardWidth}
          highlight={canPlayOnTable && selectedIds.length > 0}
          onMeldPress={canPlayOnTable ? ui.playSelectionOnMeld : undefined}
        />
      </ScrollView>

      <View style={[styles.dock, { maxWidth: layout.contentWidth }]}>
        <Text
          style={[styles.prompt, (lockedReason || message?.tone === 'error') && styles.error]}
          accessibilityLiveRegion="polite"
        >
          {promptText}
        </Text>

        {mustAnswerBuy && (
          <View style={styles.actions}>
            <Button label="Buy" compact disabled={frozen} onPress={ui.buy} />
            <Button label="Pass" variant="secondary" compact disabled={frozen} onPress={ui.passBuy} />
          </View>
        )}

        {stagedMelds.length > 0 && (
          <View style={styles.staged}>
            {stagedMelds.map((group, index) => (
              <Pressable
                key={group.join()}
                onPress={() => ui.unstageMeld(index)}
                accessibilityRole="button"
                accessibilityLabel={`Opening group ${index + 1}, tap to return to hand`}
                style={styles.stagedGroup}
              >
                {group.map((id) => {
                  const card = byId.get(id);
                  return card ? <PlayingCard key={id} card={card} width={layout.tableCardWidth} /> : null;
                })}
                <Text style={styles.stagedRemove}>✕</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          {inPlay && !me.isOpen && (
            <>
              <Button label="Group" variant="secondary" compact disabled={selectedIds.length === 0} onPress={ui.stageSelection} />
              <Button
                label="Open"
                compact
                disabled={stagedMelds.length === 0 && selectedIds.length === 0}
                onPress={ui.openWithStaged}
              />
            </>
          )}
          {canPlayOnTable && (
            <Button label="Lay meld" compact disabled={selectedIds.length < 3} onPress={ui.laySelection} />
          )}
          {inPlay && (
            <Button label="Discard" variant="secondary" compact disabled={selectedIds.length !== 1} onPress={ui.discardSelection} />
          )}
          <View style={styles.spacer} />
          {selectedIds.length > 0 && <Button label="Clear" variant="ghost" compact onPress={ui.clearSelection} />}
          <Button
            label={sortBy === 'suit' ? 'By suit' : 'By rank'}
            variant="ghost"
            compact
            onPress={() => ui.setSortBy(sortBy === 'suit' ? 'rank' : 'suit')}
          />
        </View>

        <View style={[styles.hand, pending && styles.handPending]}>
          {hand.map((card: Card) => (
            <PlayingCard
              key={card.id}
              card={card}
              width={layout.handCardWidth}
              selected={selectedIds.includes(card.id)}
              onPress={() => ui.toggleCard(card.id)}
              accessibilityHint="Selects this card"
            />
          ))}
        </View>
      </View>

      <RoundSummary view={view} busy={frozen} onNext={ui.nextRound} onExit={onExit} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.felt },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    width: '100%',
    alignSelf: 'center',
  },
  headerText: { flex: 1 },
  phaseLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  phaseName: { color: colors.gold, fontSize: 22, fontWeight: '800' },
  table: { flex: 1 },
  tableContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    width: '100%',
    alignSelf: 'center',
  },
  requirement: { color: colors.textMuted, fontSize: 13 },
  piles: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  pile: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pileActive: { borderColor: colors.gold },
  pileForSale: { borderColor: colors.success },
  pileLabel: { color: colors.textMuted, fontSize: 12 },
  emptyPile: { borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  log: { flex: 1, gap: spacing.xs, paddingTop: spacing.xs },
  logText: { color: colors.textMuted, fontSize: 12 },
  logLatest: { color: colors.text, fontSize: 13 },
  dock: {
    backgroundColor: colors.feltDark,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    width: '100%',
    alignSelf: 'center',
  },
  prompt: { color: colors.text, fontSize: 14, minHeight: 20 },
  error: { color: colors.danger },
  staged: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stagedGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.feltLight,
  },
  stagedRemove: { color: colors.textMuted, marginLeft: spacing.xs, fontSize: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  spacer: { flex: 1 },
  hand: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingTop: spacing.sm },
  handPending: { opacity: 0.6 },
});
