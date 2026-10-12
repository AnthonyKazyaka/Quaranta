import { Card, PHASES, PlayerView, sortCards, viewBuyOfferKey, viewBuyableCard, viewCanBuy, viewCanDrawFromDeck } from '@quaranta/shared';
import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TableUi } from '@/stores/tableSlice';
import { colors, fonts, radius, seatColor, shadows, spacing, useLayout } from '@/theme';
import { Button } from './Button';
import { BuyOffer } from './BuyOffer';
import { feedback } from './feedback';
import { Appear, PressState, ThinkingDots, useShake } from './motion';
import { Piles } from './Piles';
import { PlayerStrip, SeatStatus } from './PlayerStrip';
import { PlayingCard } from './PlayingCard';
import { RoundSummary } from './RoundSummary';
import { Screen } from './Screen';
import { TableMelds } from './TableMelds';

/** Stagger between cards when a whole hand is dealt. */
const DEAL_STEP_MS = 45;

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
  /** How long the table waits for the player to decide on buying. Leave out when it doesn't wait. */
  buyDecisionMs?: number;
}

/** The hint under the table: what the player can do right now. */
export function turnPrompt(view: PlayerView): string {
  const player = view.players[view.currentPlayerIndex];
  const me = view.players.find((p) => p.id === view.viewerId);
  if (!me) return '';
  const phase = PHASES[me.phaseIndex];
  if (player.id !== me.id) return `${player.name} is playing…`;
  if (view.turnStage === 'draw') {
    return viewCanDrawFromDeck(view) ? 'Draw from the deck or take the top discard.' : 'The deck is empty. Take the top discard.';
  }
  if (!me.isOpen) return `Open with ${phase.name}: select cards and tap Open, or discard to end your turn.`;
  if (view.openedThisTurn) return 'You opened! Discard a card to end your turn.';
  return 'Lay new melds, tap a meld on the table to add cards, then discard.';
}

/**
 * Entrance delays for hand cards. Several cards arriving at once is a deal and fans in one by
 * one; a single drawn card arrives straight away.
 */
function useArrivalDelays(ids: string[]): (index: number) => number {
  const seen = useRef<Set<string>>(new Set());
  const fresh = ids.filter((id) => !seen.current.has(id)).length;
  useEffect(() => {
    seen.current = new Set(ids);
  });
  return (index) => (fresh > 2 ? index * DEAL_STEP_MS : 0);
}

/** The table: seats, piles, melds, and the player's hand. Local and online games both draw it. */
export function GameTable({ view, ui, onMenu, onExit, seatStatus, banner, headerExtra, locked, lockedReason, buyDecisionMs }: GameTableProps) {
  const layout = useLayout();
  const { selectedIds, stagedMelds, sortBy, message, pending, buyPassedKey } = ui;
  const viewerId = view.viewerId;
  const [shakeX, shake] = useShake();

  // Rejected moves shake the prompt.
  useEffect(() => {
    if (message?.tone === 'error') {
      shake();
      feedback.warn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  // A little buzz when your cards land on the table.
  const meldCount = view.melds.length;
  const lastMeldCount = useRef(meldCount);
  useEffect(() => {
    if (meldCount > lastMeldCount.current && view.players[view.currentPlayerIndex].id === viewerId) feedback.success();
    lastMeldCount.current = meldCount;
  }, [view.players, view.currentPlayerIndex, meldCount, viewerId]);

  const stagedIds = useMemo(() => new Set(stagedMelds.flat()), [stagedMelds]);
  const hand = useMemo(
    () => sortCards(view.hand.filter((c) => !stagedIds.has(c.id)), sortBy),
    [view.hand, stagedIds, sortBy],
  );
  const arrivalDelay = useArrivalDelays(hand.map((c) => c.id));

  const human = view.players.find((p) => p.id === viewerId);
  if (!human) return null;

  const paced = view.mode === 'paced';
  const phase = PHASES[human.phaseIndex];
  const active = view.players[view.currentPlayerIndex];
  const activeSeat = view.currentPlayerIndex;
  const frozen = !!locked || pending;
  const isMyTurn = view.status === 'playing' && active.id === viewerId;
  const canDraw = isMyTurn && view.turnStage === 'draw' && !frozen;
  const inPlay = isMyTurn && view.turnStage === 'play' && !frozen;
  const canPlayOnTable = inPlay && human.isOpen && !view.openedThisTurn;
  const byId = new Map(view.hand.map((c) => [c.id, c] as const));
  const recentLog = view.log.slice(-3).reverse();
  const prompt = lockedReason ?? message?.text ?? turnPrompt(view);

  // A buy offer waits on the player until they buy or pass.
  const offerKey = viewCanBuy(view, viewerId) ? viewBuyOfferKey(view) : null;
  const awaitingBuy = offerKey !== null && offerKey !== buyPassedKey;
  const offered = isMyTurn ? null : viewBuyableCard(view);
  const buyRequests = view.buyWindow?.requests ?? [];
  const humanRequested = buyRequests.includes(viewerId);
  const showOffer = offered && (awaitingBuy || humanRequested);
  const contentStyle = { maxWidth: layout.contentWidth };

  const piles = (
    <Piles
      view={view}
      cardWidth={layout.pileCardWidth}
      canDraw={canDraw}
      forSale={!!viewBuyableCard(view)}
      onDrawDeck={ui.drawFromDeck}
      onDrawDiscard={ui.drawFromDiscard}
    />
  );
  const log = (
    <View style={styles.log} accessibilityLiveRegion="polite">
      {recentLog.map((entry, i) => (
        <Appear key={entry.id} from="above" duration={220}>
          <Text style={[styles.logText, i === 0 && styles.logLatest, i === 2 && styles.logOld]} numberOfLines={2}>
            {entry.message}
          </Text>
        </Appear>
      ))}
    </View>
  );

  return (
    <Screen>
      {banner}
      <View style={[styles.header, contentStyle]}>
        <View style={styles.headerText}>
          <View style={styles.kickerRow}>
            <Text style={styles.phaseLabel}>
              {paced ? `Hand ${view.phaseIndex + 1} · your opening` : `Hand ${view.phaseIndex + 1} of ${PHASES.length}`}
            </Text>
            <PhaseProgress current={paced ? human.phaseIndex : view.phaseIndex} />
          </View>
          <Text style={styles.phaseName} accessibilityRole="header">
            {phase.name}
          </Text>
          <Text style={styles.requirement}>{phase.description}</Text>
        </View>
        {headerExtra}
        <Button label="Menu" variant="secondary" compact onPress={onMenu} />
      </View>

      <ScrollView style={styles.table} contentContainerStyle={[styles.tableContent, contentStyle]}>
        <PlayerStrip view={view} humanId={viewerId} fill={layout.isTablet} seatStatus={seatStatus} />

        {layout.isLarge ? (
          <View style={styles.wideTable}>
            <View style={styles.sideColumn}>
              {piles}
              {log}
            </View>
            <View style={styles.meldColumn}>
              <TableMelds
                melds={view.melds}
                players={view.players}
                cardWidth={layout.tableCardWidth}
                highlight={canPlayOnTable && selectedIds.length > 0}
                onMeldPress={canPlayOnTable ? ui.playSelectionOnMeld : undefined}
                columns={2}
              />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.pileRow}>
              {piles}
              {log}
            </View>
            <TableMelds
              melds={view.melds}
              players={view.players}
              cardWidth={layout.tableCardWidth}
              highlight={canPlayOnTable && selectedIds.length > 0}
              onMeldPress={canPlayOnTable ? ui.playSelectionOnMeld : undefined}
              columns={layout.isTablet ? 2 : 1}
            />
          </>
        )}
      </ScrollView>

      <View style={[styles.dock, contentStyle]}>
        <View style={styles.statusRow}>
          {isMyTurn ? (
            <View style={[styles.pill, styles.pillYou]}>
              <Text style={styles.pillYouText}>YOUR TURN</Text>
            </View>
          ) : (
            view.status === 'playing' && (
              <View style={styles.pill}>
                <View style={[styles.pillDot, { backgroundColor: seatColor(activeSeat) }]} />
                <Text style={styles.pillText} numberOfLines={1}>
                  {active.name}
                </Text>
                <ThinkingDots color={seatColor(activeSeat)} size={4} />
              </View>
            )
          )}
          <Animated.View style={[styles.promptWrap, { transform: [{ translateX: shakeX.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }) }] }]}>
            <Appear key={prompt} from="below" duration={200}>
              <Text
                style={[styles.prompt, (lockedReason || message?.tone === 'error') && styles.error]}
                accessibilityLiveRegion="polite"
              >
                {prompt}
              </Text>
            </Appear>
          </Animated.View>
        </View>

        {showOffer && offered && (
          <BuyOffer
            key={offerKey ?? offered.id}
            card={offered}
            sellerName={active.name}
            requested={humanRequested}
            rivals={buyRequests.filter((id) => id !== viewerId).map((id) => view.players.find((p) => p.id === id)?.name ?? '')}
            cardWidth={layout.tableCardWidth}
            decisionMs={buyDecisionMs}
            onBuy={() => {
              if (frozen) return;
              feedback.tap();
              ui.buyDiscard();
            }}
            onPass={ui.passBuy}
          />
        )}

        {stagedMelds.length > 0 && (
          <View style={styles.staged}>
            <Text style={styles.stagedLabel}>Opening with</Text>
            {stagedMelds.map((group, index) => (
              <Appear key={group.join()} from="scale">
                <Pressable
                  onPress={() => ui.unstageMeld(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`Opening group ${index + 1}, tap to return to hand`}
                  style={({ hovered }: PressState) => [styles.stagedGroup, hovered && styles.stagedHover]}
                >
                  {group.map((id) => {
                    const card = byId.get(id);
                    return card ? <PlayingCard key={id} card={card} width={layout.tableCardWidth} /> : null;
                  })}
                  <Text style={styles.stagedRemove}>✕</Text>
                </Pressable>
              </Appear>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          {inPlay && !human.isOpen && (
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
          {selectedIds.length > 0 && (
            <Button label={`Clear ${selectedIds.length}`} variant="ghost" compact onPress={ui.clearSelection} />
          )}
          <SortToggle value={sortBy} onChange={ui.setSortBy} />
        </View>

        <View style={[styles.hand, pending && styles.handPending]}>
          {hand.map((card: Card, index) => (
            <Appear key={card.id} from="deal" delay={arrivalDelay(index)} duration={320}>
              <PlayingCard
                card={card}
                width={layout.handCardWidth}
                selected={selectedIds.includes(card.id)}
                onPress={() => {
                  feedback.tap();
                  ui.toggleCard(card.id);
                }}
                accessibilityHint="Selects this card"
              />
            </Appear>
          ))}
        </View>
      </View>

      <RoundSummary view={view} busy={frozen} onNext={ui.nextRound} onExit={onExit} />
    </Screen>
  );
}

/** One pip per hand of the game: played, current, still to come. */
function PhaseProgress({ current }: { current: number }) {
  return (
    <View style={styles.progress} accessible={false}>
      {PHASES.map((p, i) => (
        <View key={p.condition} style={[styles.progressPip, i < current && styles.progressDone, i === current && styles.progressCurrent]} />
      ))}
    </View>
  );
}

function SortToggle({ value, onChange }: { value: 'suit' | 'rank'; onChange: (value: 'suit' | 'rank') => void }) {
  return (
    <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel="Sort hand">
      {(['suit', 'rank'] as const).map((option) => (
        <Pressable
          key={option}
          onPress={() => onChange(option)}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === option }}
          accessibilityLabel={`Sort by ${option}`}
          style={[styles.segmentItem, value === option && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, value === option && styles.segmentTextActive]}>
            {option === 'suit' ? '♠♥ Suit' : 'A–K Rank'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    width: '100%',
    alignSelf: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  phaseLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
  progress: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  progressPip: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(246, 241, 227, 0.18)' },
  progressDone: { backgroundColor: colors.goldDark },
  progressCurrent: { width: 14, backgroundColor: colors.gold },
  phaseName: { color: colors.gold, fontSize: 26, fontFamily: fonts.displayHeavy, lineHeight: 32 },
  requirement: { color: colors.textMuted, fontSize: 13 },
  table: { flex: 1 },
  tableContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    width: '100%',
    alignSelf: 'center',
  },
  wideTable: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  sideColumn: { width: 260, gap: spacing.md },
  meldColumn: { flex: 1 },
  pileRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  log: { flex: 1, gap: spacing.xs + 2, paddingTop: spacing.sm, minWidth: 0 },
  logText: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  logLatest: { color: colors.text, fontSize: 13, fontWeight: '600' },
  logOld: { opacity: 0.6 },
  dock: {
    backgroundColor: colors.panelStrong,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.panelBorder,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    width: '100%',
    alignSelf: 'center',
    boxShadow: '0px -8px 24px rgba(0, 0, 0, 0.3)',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 28 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    maxWidth: 160,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { color: colors.text, fontSize: 12, fontWeight: '800', flexShrink: 1 },
  pillYou: { backgroundColor: colors.gold, boxShadow: shadows.glow },
  pillYouText: { color: colors.feltDeep, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  promptWrap: { flex: 1, minWidth: 0 },
  prompt: { color: colors.text, fontSize: 14, lineHeight: 19 },
  error: { color: colors.danger, fontWeight: '600' },
  staged: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  stagedLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  stagedGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: 'rgba(242, 193, 78, 0.4)',
  },
  stagedHover: { backgroundColor: 'rgba(242, 193, 78, 0.26)' },
  stagedRemove: { color: colors.gold, marginHorizontal: spacing.xs, fontSize: 13, fontWeight: '800' },
  // Fixed height so the hand doesn't jump when the turn's buttons come and go.
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center', minHeight: 40 },
  spacer: { flex: 1 },
  segment: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    padding: 3,
  },
  segmentItem: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  segmentActive: { backgroundColor: 'rgba(242, 214, 150, 0.18)' },
  segmentText: { color: colors.textFaint, fontSize: 12, fontWeight: '700', userSelect: 'none' },
  segmentTextActive: { color: colors.text },
  handPending: { opacity: 0.6 },
  hand: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
});
