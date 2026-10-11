import { Card, GameState, PHASES, currentPhase, currentPlayer, sortCards, topDiscard } from '@quaranta/shared';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { PlayerStrip } from '@/components/PlayerStrip';
import { CardBack, PlayingCard } from '@/components/PlayingCard';
import { RoundSummary } from '@/components/RoundSummary';
import { TableMelds } from '@/components/TableMelds';
import { useGameStore } from '@/stores/gameStore';
import { colors, radius, spacing, useLayout } from '@/theme';

/** Pause between bot moves so people can follow along. */
const BOT_DELAY_MS = 650;

function turnPrompt(game: GameState, humanId: string): string {
  const player = currentPlayer(game);
  const phase = currentPhase(game);
  if (player.id !== humanId) return `${player.name} is playing…`;
  if (game.turnStage === 'draw') return 'Your turn. Draw from the deck or take the top discard.';
  if (!player.isOpen) return `Open with ${phase.name}: select cards and tap Open, or discard to end your turn.`;
  if (game.openedThisTurn) return 'You opened! Discard a card to end your turn.';
  return 'Lay new melds, tap a meld on the table to add cards, then discard.';
}

export default function GameScreen() {
  const router = useRouter();
  const layout = useLayout();
  const game = useGameStore((s) => s.game);
  const humanId = useGameStore((s) => s.humanId);
  const selectedIds = useGameStore((s) => s.selectedIds);
  const stagedMelds = useGameStore((s) => s.stagedMelds);
  const sortBy = useGameStore((s) => s.sortBy);
  const message = useGameStore((s) => s.message);
  const store = useGameStore.getState();

  // Drive bot turns one action at a time.
  useEffect(() => {
    if (!game || game.status !== 'playing' || !currentPlayer(game).isBot) return;
    const timer = setTimeout(() => useGameStore.getState().runBotStep(), BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [game]);

  const human = game?.players.find((p) => p.id === humanId);
  const stagedIds = useMemo(() => new Set(stagedMelds.flat()), [stagedMelds]);
  const hand = useMemo(
    () => (human ? sortCards(human.hand.filter((c) => !stagedIds.has(c.id)), sortBy) : []),
    [human, stagedIds, sortBy],
  );

  if (!game || !humanId || !human) {
    return <Redirect href="/" />;
  }

  const phase = currentPhase(game);
  const isMyTurn = game.status === 'playing' && currentPlayer(game).id === humanId;
  const canDraw = isMyTurn && game.turnStage === 'draw';
  const inPlay = isMyTurn && game.turnStage === 'play';
  const canPlayOnTable = inPlay && human.isOpen && !game.openedThisTurn;
  const discard = topDiscard(game);
  const byId = new Map(human.hand.map((c) => [c.id, c] as const));
  const recentLog = game.log.slice(-3).reverse();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.header, { maxWidth: layout.contentWidth }]}>
        <View style={styles.headerText}>
          <Text style={styles.phaseLabel}>
            Hand {game.phaseIndex + 1} of {PHASES.length}
          </Text>
          <Text style={styles.phaseName} accessibilityRole="header">
            {phase.name}
          </Text>
        </View>
        <Button label="Menu" variant="secondary" compact onPress={() => router.replace('/')} />
      </View>

      <ScrollView style={styles.table} contentContainerStyle={[styles.tableContent, { maxWidth: layout.contentWidth }]}>
        <Text style={styles.requirement}>{phase.description}</Text>
        <PlayerStrip game={game} />

        <View style={styles.piles}>
          <Pressable
            onPress={store.drawFromDeck}
            disabled={!canDraw}
            accessibilityRole="button"
            accessibilityLabel={`Draw from the deck, ${game.deck.length} cards left`}
            style={[styles.pile, canDraw && styles.pileActive]}
          >
            <CardBack width={layout.handCardWidth} />
            <Text style={styles.pileLabel}>Deck · {game.deck.length}</Text>
          </Pressable>
          <Pressable
            onPress={store.drawFromDiscard}
            disabled={!canDraw || !discard}
            accessibilityRole="button"
            accessibilityLabel="Take the top discard"
            style={[styles.pile, canDraw && !!discard && styles.pileActive]}
          >
            {discard ? (
              <PlayingCard card={discard} width={layout.handCardWidth} />
            ) : (
              <View style={[styles.emptyPile, { width: layout.handCardWidth, height: layout.handCardWidth * 1.4 }]} />
            )}
            <Text style={styles.pileLabel}>Discard</Text>
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
          melds={game.melds}
          players={game.players}
          cardWidth={layout.tableCardWidth}
          highlight={canPlayOnTable && selectedIds.length > 0}
          onMeldPress={canPlayOnTable ? store.playSelectionOnMeld : undefined}
        />
      </ScrollView>

      <View style={[styles.dock, { maxWidth: layout.contentWidth }]}>
        <Text style={[styles.prompt, message?.tone === 'error' && styles.error]} accessibilityLiveRegion="polite">
          {message?.text ?? turnPrompt(game, humanId)}
        </Text>

        {stagedMelds.length > 0 && (
          <View style={styles.staged}>
            {stagedMelds.map((group, index) => (
              <Pressable
                key={group.join()}
                onPress={() => store.unstageMeld(index)}
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
          {inPlay && !human.isOpen && (
            <>
              <Button label="Group" variant="secondary" compact disabled={selectedIds.length === 0} onPress={store.stageSelection} />
              <Button
                label="Open"
                compact
                disabled={stagedMelds.length === 0 && selectedIds.length === 0}
                onPress={store.openWithStaged}
              />
            </>
          )}
          {canPlayOnTable && (
            <Button label="Lay meld" compact disabled={selectedIds.length < 3} onPress={store.laySelection} />
          )}
          {inPlay && (
            <Button label="Discard" variant="secondary" compact disabled={selectedIds.length !== 1} onPress={store.discardSelection} />
          )}
          <View style={styles.spacer} />
          {selectedIds.length > 0 && <Button label="Clear" variant="ghost" compact onPress={store.clearSelection} />}
          <Button
            label={sortBy === 'suit' ? 'By suit' : 'By rank'}
            variant="ghost"
            compact
            onPress={() => store.setSortBy(sortBy === 'suit' ? 'rank' : 'suit')}
          />
        </View>

        <View style={styles.hand}>
          {hand.map((card: Card) => (
            <PlayingCard
              key={card.id}
              card={card}
              width={layout.handCardWidth}
              selected={selectedIds.includes(card.id)}
              onPress={() => store.toggleCard(card.id)}
              accessibilityHint="Selects this card"
            />
          ))}
        </View>
      </View>

      <RoundSummary
        game={game}
        onNext={store.nextRound}
        onExit={() => {
          store.quitGame();
          router.replace('/');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.felt },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
