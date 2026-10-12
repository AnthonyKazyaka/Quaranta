import { Card, cardLabel, createQuarantaDeck, isHighRank, isJoker, resetCard } from './cards';
import { MIN_RUN_SIZE, MeldKind, findSwappableJoker, resolveMeld, tryAddToMeld } from './melds';
import { PHASES, PhaseDefinition, isOpeningConditionMet, restrictsHighCardDiscards } from './openingConditions';
import { randomSeed, shuffle } from './random';
import { handPoints } from './scoring';

export const CARDS_PER_PLAYER = 13;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
/** A hand ends with no winner if the deck runs out more than this many times. */
export const MAX_RESHUFFLES_PER_HAND = 2;
/** The own-pace mode stops after this many hands even if nobody has finished all eight openings. */
export const MAX_PACED_HANDS = 20;
const MAX_LOG_ENTRIES = 40;

/**
 * - `classic`: everyone plays the same opening each hand, eight hands in a row.
 * - `paced`: each player works through the openings at their own pace. You move on to the next
 *   opening after a hand in which you opened, and the first to finish All Down wins.
 */
export type GameMode = 'classic' | 'paced';

export interface PlayerSetup {
  id?: string;
  name: string;
  isBot: boolean;
}

export interface GamePlayer {
  id: string;
  name: string;
  isBot: boolean;
  hand: Card[];
  isOpen: boolean;
  /** The opening this player is working on, as an index into `PHASES`. In classic mode it's the hand's opening for everyone. */
  phaseIndex: number;
}

export interface TableMeld {
  id: string;
  ownerId: string;
  kind: MeldKind;
  cards: Card[];
}

export interface RoundResult {
  /** Which hand this was (0-based). In classic mode this is also the opening everyone played. */
  phaseIndex: number;
  /** Null when the deck ran dry before anybody went out. */
  winnerId: string | null;
  points: Record<string, number>;
  /** Each player's opening this hand, by index into `PHASES`. */
  phases: Record<string, number>;
  /** Players who opened this hand, which is what moves them on in paced mode. */
  opened: string[];
}

/**
 * A discard that other players may buy. It opens when the current player draws from the deck
 * instead of taking the discard, and closes once the highest-priority player who wants the card
 * has bought it or everyone has passed.
 */
export interface BuyOffer {
  card: Card;
  /** Players who may buy, in priority order (turn order from the current player's left). */
  eligible: string[];
  responses: Record<string, 'buy' | 'pass'>;
}

export interface GameLogEntry {
  id: number;
  playerId: string | null;
  message: string;
}

export type GameStatus = 'playing' | 'roundOver' | 'gameOver';
export type TurnStage = 'draw' | 'play';

/**
 * The complete, JSON-serializable state of a game. Every action is a pure function from one
 * state to the next, so the state can be persisted (e.g. to Firestore) and restored at any point.
 */
export interface GameState {
  id: string;
  /** Incremented by every action, so a client can tell whether its view is stale. */
  version: number;
  mode: GameMode;
  players: GamePlayer[];
  /** Which hand is being played (0-based). In classic mode this is also the opening. */
  phaseIndex: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  turnStage: TurnStage;
  /** Players can't play more cards on the turn they open. */
  openedThisTurn: boolean;
  /** Top card of each pile is the last element. */
  deck: Card[];
  discardPile: Card[];
  /** The top discard was thrown by a player and hasn't yet been offered for buying. */
  discardBuyable: boolean;
  buyOffer: BuyOffer | null;
  /** How many times the discard pile has been turned into a new deck this hand. */
  reshuffles: number;
  melds: TableMeld[];
  results: RoundResult[];
  status: GameStatus;
  log: GameLogEntry[];
  rngState: number;
  meldCounter: number;
  logCounter: number;
}

export type GameAction =
  | { type: 'drawFromDeck'; playerId: string }
  | { type: 'drawFromDiscard'; playerId: string }
  | { type: 'open'; playerId: string; melds: string[][] }
  | { type: 'layMeld'; playerId: string; cardIds: string[] }
  | { type: 'addToMeld'; playerId: string; meldId: string; cardIds: string[] }
  | { type: 'swapJoker'; playerId: string; meldId: string; cardId: string }
  | { type: 'discard'; playerId: string; cardId: string }
  | { type: 'buy'; playerId: string }
  | { type: 'passBuy'; playerId: string }
  | { type: 'nextRound' };

/** Raised when an action breaks the rules. The message is suitable for showing to players. */
export class GameRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameRuleError';
  }
}

function fail(message: string): never {
  throw new GameRuleError(message);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** The opening a player has to make this hand. */
export function phaseOf(player: GamePlayer): PhaseDefinition {
  return PHASES[player.phaseIndex];
}

/** The opening the player whose turn it is has to make. */
export function currentPhase(state: GameState): PhaseDefinition {
  return phaseOf(currentPlayer(state));
}

export function currentPlayer(state: GameState): GamePlayer {
  return state.players[state.currentPlayerIndex];
}

export function topDiscard(state: GameState): Card | null {
  return state.discardPile[state.discardPile.length - 1] ?? null;
}

export function getPlayer(state: GameState, playerId: string): GamePlayer {
  return state.players.find((p) => p.id === playerId) ?? fail('Unknown player.');
}

/** The parts of a game that scoring needs, so it works on both full states and player views. */
export interface Scoreboard<P extends { id: string } = { id: string }> {
  mode: GameMode;
  players: P[];
  results: RoundResult[];
}

export function totalScores(state: Scoreboard): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(state.players.map((p) => [p.id, 0]));
  for (const result of state.results) {
    for (const [playerId, points] of Object.entries(result.points)) {
      totals[playerId] = (totals[playerId] ?? 0) + points;
    }
  }
  return totals;
}

/** How many hands the player opened in. In paced mode that's how many openings they've finished. */
export function openingsCompleted(state: Scoreboard, playerId: string): number {
  return state.results.filter((r) => r.opened?.includes(playerId)).length;
}

/**
 * The winners. In classic mode that's the fewest points. In paced mode it's whoever finished the
 * most openings, with the fewest points breaking ties. More than one player means a tie.
 */
export function leaders<P extends { id: string }>(state: Scoreboard<P>): P[] {
  const totals = totalScores(state);
  const progress = (p: P) => (state.mode === 'paced' ? openingsCompleted(state, p.id) : 0);
  const best = [...state.players].sort((a, b) => progress(b) - progress(a) || totals[a.id] - totals[b.id])[0];
  return state.players.filter((p) => progress(p) === progress(best) && totals[p.id] === totals[best.id]);
}

/** Why a card can't be discarded right now, ignoring the "nothing else is discardable" fallback. */
function discardBlockReason(state: GameState, player: GamePlayer, card: Card): string | null {
  if (isJoker(card)) return null;

  const condition = phaseOf(player).condition;
  if (restrictsHighCardDiscards(condition) && isHighRank(card.rank) && state.players.some((p) => !p.isOpen)) {
    return "High cards can't be discarded until everyone has opened.";
  }

  // A card that could be played on the table has to be played rather than thrown away.
  for (const meld of state.melds) {
    if (tryAddToMeld(meld, [card]) || findSwappableJoker(meld, card)) {
      return `${cardLabel(card)} plays on the table, so it can't be discarded.`;
    }
  }

  return null;
}

/** Ids of cards in the player's hand that may be discarded right now. */
export function discardableCardIds(state: GameState, playerId: string): string[] {
  const player = getPlayer(state, playerId);
  const hand = player.hand;
  const allowed = hand.filter((card) => discardBlockReason(state, player, card) === null);
  // If every card is blocked, any card may be discarded.
  return (allowed.length > 0 ? allowed : hand).map((c) => c.id);
}

export function canDiscard(state: GameState, playerId: string, cardId: string): boolean {
  return discardableCardIds(state, playerId).includes(cardId);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export interface CreateGameOptions {
  players: PlayerSetup[];
  id?: string;
  seed?: number;
  mode?: GameMode;
}

export function createGame({ players, id, seed = randomSeed(), mode = 'classic' }: CreateGameOptions): GameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    fail(`Quaranta needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players.`);
  }
  const ids = players.map((p, i) => p.id ?? `p${i + 1}`);
  if (new Set(ids).size !== ids.length) {
    fail('Every player needs a different id.');
  }

  const state: GameState = {
    id: id ?? `game-${seed.toString(36)}`,
    version: 0,
    mode,
    players: players.map((p, i) => ({
      id: ids[i],
      name: p.name,
      isBot: p.isBot,
      hand: [],
      isOpen: false,
      phaseIndex: 0,
    })),
    phaseIndex: 0,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    turnStage: 'draw',
    openedThisTurn: false,
    deck: [],
    discardPile: [],
    discardBuyable: false,
    buyOffer: null,
    reshuffles: 0,
    melds: [],
    results: [],
    status: 'playing',
    log: [],
    rngState: seed,
    meldCounter: 0,
    logCounter: 0,
  };

  return dealRound(state, 0, 0);
}

function addLog(state: GameState, message: string, playerId: string | null = null): GameState {
  const entry: GameLogEntry = { id: state.logCounter, playerId, message };
  return {
    ...state,
    logCounter: state.logCounter + 1,
    log: [...state.log, entry].slice(-MAX_LOG_ENTRIES),
  };
}

function dealRound(state: GameState, handIndex: number, dealerIndex: number): GameState {
  const [deck, rngState] = shuffle(createQuarantaDeck(), state.rngState);
  const playerCount = state.players.length;
  const hands: Card[][] = state.players.map(() => []);

  // Deal one card at a time, starting with the player to the dealer's left.
  for (let i = 0; i < playerCount * CARDS_PER_PLAYER; i++) {
    hands[(dealerIndex + 1 + i) % playerCount].push(deck.pop() as Card);
  }
  const firstDiscard = deck.pop() as Card;

  const dealt: GameState = {
    ...state,
    players: state.players.map((p, i) => ({
      ...p,
      hand: hands[i],
      isOpen: false,
      phaseIndex: state.mode === 'paced' ? p.phaseIndex : handIndex,
    })),
    phaseIndex: handIndex,
    dealerIndex,
    currentPlayerIndex: (dealerIndex + 1) % playerCount,
    turnStage: 'draw',
    openedThisTurn: false,
    deck,
    discardPile: [firstDiscard],
    discardBuyable: false,
    buyOffer: null,
    reshuffles: 0,
    melds: [],
    status: 'playing',
    rngState,
  };

  const dealer = state.players[dealerIndex].name;
  const message =
    state.mode === 'paced'
      ? `Hand ${handIndex + 1}. ${dealer} deals.`
      : `Hand ${handIndex + 1}: ${PHASES[handIndex].name}. ${dealer} deals.`;
  return addLog(dealt, message);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function updatePlayer(state: GameState, playerId: string, update: Partial<GamePlayer>): GameState {
  return { ...state, players: state.players.map((p) => (p.id === playerId ? { ...p, ...update } : p)) };
}

function takeFromHand(player: GamePlayer, cardIds: string[]): { cards: Card[]; remaining: Card[] } {
  if (new Set(cardIds).size !== cardIds.length) fail('A card can only be used once.');
  const cards = cardIds.map((id) => player.hand.find((c) => c.id === id) ?? fail("That card isn't in your hand."));
  const remaining = player.hand.filter((c) => !cardIds.includes(c.id));
  return { cards, remaining };
}

const LAST_PHASE = PHASES.length - 1;

function endRound(state: GameState, winnerId: string | null): GameState {
  const points = Object.fromEntries(state.players.map((p) => [p.id, handPoints(p.hand, phaseOf(p).condition)]));
  const phases = Object.fromEntries(state.players.map((p) => [p.id, p.phaseIndex]));
  const opened = state.players.filter((p) => p.isOpen).map((p) => p.id);
  const isFinished =
    state.mode === 'paced'
      ? state.players.some((p) => p.isOpen && p.phaseIndex === LAST_PHASE) || state.phaseIndex + 1 >= MAX_PACED_HANDS
      : state.phaseIndex === LAST_PHASE;

  const ended: GameState = {
    ...state,
    buyOffer: null,
    results: [...state.results, { phaseIndex: state.phaseIndex, winnerId, points, phases, opened }],
    status: isFinished ? 'gameOver' : 'roundOver',
  };

  const message = winnerId
    ? `${getPlayer(state, winnerId).name} went out!`
    : 'The deck ran out. Nobody went out this hand.';
  return addLog(ended, message, winnerId);
}

/** Ends the round if the player just emptied their hand. */
function checkWentOut(state: GameState, playerId: string): GameState {
  return getPlayer(state, playerId).hand.length === 0 ? endRound(state, playerId) : state;
}

function assertPlayStage(state: GameState, player: GamePlayer, { mustBeOpen }: { mustBeOpen: boolean }) {
  if (state.turnStage !== 'play') fail('Draw a card first.');
  if (mustBeOpen) {
    if (!player.isOpen) fail(`You need to open with ${currentPhase(state).name} first.`);
    if (state.openedThisTurn) fail("You can't play more cards on the turn you open.");
  }
}

function drawFromDeck(state: GameState, player: GamePlayer): GameState {
  if (state.turnStage !== 'draw') fail('You have already drawn this turn.');

  let next = state;
  if (next.deck.length === 0) {
    if (next.reshuffles >= MAX_RESHUFFLES_PER_HAND) {
      return endRound(next, null);
    }
    // Reshuffle everything but the top discard into a new deck.
    const top = next.discardPile[next.discardPile.length - 1];
    const rest = next.discardPile.slice(0, -1).map(resetCard);
    const [deck, rngState] = shuffle(rest, next.rngState);
    next = { ...next, deck, discardPile: top ? [top] : [], reshuffles: next.reshuffles + 1, rngState };
    if (deck.length > 0) next = addLog(next, 'The discard pile was shuffled into a new deck.');
  }
  if (next.deck.length === 0) {
    return endRound(next, null);
  }

  const card = next.deck[next.deck.length - 1];
  next = {
    ...updatePlayer(next, player.id, { hand: [...player.hand, card] }),
    deck: next.deck.slice(0, -1),
    turnStage: 'play',
    discardBuyable: false,
    buyOffer: state.discardBuyable ? openBuyOffer(next) : null,
  };
  return addLog(next, `${player.name} drew from the deck.`, player.id);
}

/** Other players may buy the top discard if the current player passed it up (never a joker). */
function openBuyOffer(state: GameState): BuyOffer | null {
  const card = topDiscard(state);
  if (!card || isJoker(card)) return null;

  const count = state.players.length;
  const discarderIndex = (state.currentPlayerIndex + count - 1) % count;
  const eligible: string[] = [];
  for (let step = 1; step < count; step++) {
    const index = (state.currentPlayerIndex + step) % count;
    const candidate = state.players[index];
    if (index !== discarderIndex) eligible.push(candidate.id);
  }
  return eligible.length > 0 ? { card, eligible, responses: {} } : null;
}

/** Ids of the players the game is waiting on: buyers who haven't answered, otherwise whoever's turn it is. */
export function actorsToMove(state: GameState): string[] {
  if (state.status !== 'playing') return [];
  if (state.buyOffer) {
    const { eligible, responses } = state.buyOffer;
    return eligible.filter((id) => !responses[id]);
  }
  return [currentPlayer(state).id];
}

/** Why a player can't answer the open buy offer, or null if they can. */
export function buyBlockReason(state: GameState, playerId: string): string | null {
  const offer = state.buyOffer;
  if (!offer) return 'There is nothing to buy right now.';
  if (!state.players.some((p) => p.id === playerId)) return 'Unknown player.';
  if (!offer.eligible.includes(playerId)) return "You can't buy this card.";
  if (offer.responses[playerId]) return 'You have already answered.';
  return null;
}

/** Settles the offer once the highest-priority buyer is known, or everyone has passed. */
function resolveBuyOffer(state: GameState): GameState {
  const offer = state.buyOffer;
  if (!offer) return state;

  for (const id of offer.eligible) {
    const response = offer.responses[id];
    if (!response) return state;
    if (response === 'buy') return completeBuy(state, id, offer.card);
  }
  return { ...state, buyOffer: null };
}

function completeBuy(state: GameState, buyerId: string, card: Card): GameState {
  const buyer = getPlayer(state, buyerId);
  const next: GameState = {
    ...updatePlayer(state, buyerId, { hand: [...buyer.hand, card] }),
    discardPile: state.discardPile.slice(0, -1),
    buyOffer: null,
  };
  return addLog(next, `${buyer.name} bought ${cardLabel(card)}.`, buyerId);
}

function respondToBuy(state: GameState, playerId: string, wantsToBuy: boolean): GameState {
  const reason = buyBlockReason(state, playerId);
  if (reason) fail(reason);
  const offer = state.buyOffer as BuyOffer;
  const answered: GameState = {
    ...state,
    buyOffer: { ...offer, responses: { ...offer.responses, [playerId]: wantsToBuy ? 'buy' : 'pass' } },
  };
  return resolveBuyOffer(answered);
}

function drawFromDiscard(state: GameState, player: GamePlayer): GameState {
  if (state.turnStage !== 'draw') fail('You have already drawn this turn.');
  const card = topDiscard(state) ?? fail('The discard pile is empty.');

  const next: GameState = {
    ...updatePlayer(state, player.id, { hand: [...player.hand, card] }),
    discardPile: state.discardPile.slice(0, -1),
    turnStage: 'play',
    discardBuyable: false,
  };
  return addLog(next, `${player.name} picked up ${cardLabel(card)} from the discard pile.`, player.id);
}

function placeMelds(state: GameState, ownerId: string, groups: Card[][]): GameState {
  let meldCounter = state.meldCounter;
  const placed: TableMeld[] = groups.map((cards) => {
    const resolved = resolveMeld(cards) ?? fail("Those cards don't form a valid run or set.");
    return { id: `m${++meldCounter}`, ownerId, kind: resolved.kind, cards: resolved.cards };
  });
  return { ...state, melds: [...state.melds, ...placed], meldCounter };
}

function open(state: GameState, player: GamePlayer, meldIds: string[][]): GameState {
  assertPlayStage(state, player, { mustBeOpen: false });
  if (player.isOpen) fail("You've already opened this hand.");
  if (meldIds.length === 0) fail('Choose the cards you want to open with.');

  const { remaining } = takeFromHand(player, meldIds.flat());
  const groups = meldIds.map((ids) => takeFromHand(player, ids).cards);
  const phase = currentPhase(state);
  if (!isOpeningConditionMet(phase.condition, groups, player.hand.length)) {
    fail(`Those cards don't meet the ${phase.name} requirement: ${phase.description}`);
  }

  let next = placeMelds(state, player.id, groups);
  next = { ...updatePlayer(next, player.id, { hand: remaining, isOpen: true }), openedThisTurn: true };
  next = addLog(next, `${player.name} opened with ${phase.name}.`, player.id);
  return checkWentOut(next, player.id);
}

function layMeld(state: GameState, player: GamePlayer, cardIds: string[]): GameState {
  assertPlayStage(state, player, { mustBeOpen: true });
  if (cardIds.length < MIN_RUN_SIZE) fail(`A new meld needs at least ${MIN_RUN_SIZE} cards.`);

  const { cards, remaining } = takeFromHand(player, cardIds);
  let next = placeMelds(state, player.id, [cards]);
  next = updatePlayer(next, player.id, { hand: remaining });
  next = addLog(next, `${player.name} laid down ${cards.length} cards.`, player.id);
  return checkWentOut(next, player.id);
}

function findMeld(state: GameState, meldId: string): TableMeld {
  return state.melds.find((m) => m.id === meldId) ?? fail("That meld isn't on the table.");
}

function replaceMeld(state: GameState, meld: TableMeld): GameState {
  return { ...state, melds: state.melds.map((m) => (m.id === meld.id ? meld : m)) };
}

function addToMeld(state: GameState, player: GamePlayer, meldId: string, cardIds: string[]): GameState {
  assertPlayStage(state, player, { mustBeOpen: true });
  const meld = findMeld(state, meldId);
  const { cards, remaining } = takeFromHand(player, cardIds);
  const resolved = tryAddToMeld(meld, cards) ?? fail("Those cards don't fit on that meld.");

  let next = replaceMeld(state, { ...meld, cards: resolved.cards });
  next = updatePlayer(next, player.id, { hand: remaining });
  next = addLog(next, `${player.name} played ${cards.map(cardLabel).join(', ')} on the table.`, player.id);
  return checkWentOut(next, player.id);
}

function swapJoker(state: GameState, player: GamePlayer, meldId: string, cardId: string): GameState {
  assertPlayStage(state, player, { mustBeOpen: true });
  const meld = findMeld(state, meldId);
  const { cards, remaining } = takeFromHand(player, [cardId]);
  const card = cards[0];
  const joker = findSwappableJoker(meld, card) ?? fail(`${cardLabel(card)} can't replace a joker in that meld.`);

  const swapped = meld.cards.map((c) => (c.id === joker.id ? card : c));
  const resolved = resolveMeld(swapped, meld.kind) ?? fail(`${cardLabel(card)} can't replace a joker in that meld.`);

  let next = replaceMeld(state, { ...meld, cards: resolved.cards });
  next = updatePlayer(next, player.id, { hand: [...remaining, resetCard(joker)] });
  return addLog(next, `${player.name} swapped ${cardLabel(card)} for a joker.`, player.id);
}

function discard(state: GameState, player: GamePlayer, cardId: string): GameState {
  if (state.turnStage !== 'play') fail('Draw a card first.');
  const { cards, remaining } = takeFromHand(player, [cardId]);
  const card = cards[0];

  if (!canDiscard(state, player.id, cardId)) {
    fail(discardBlockReason(state, player, card) ?? "That card can't be discarded right now.");
  }

  let next: GameState = {
    ...updatePlayer(state, player.id, { hand: remaining }),
    discardPile: [...state.discardPile, resetCard(card)],
    discardBuyable: !isJoker(card),
  };
  next = addLog(next, `${player.name} discarded ${cardLabel(card)}.`, player.id);

  if (remaining.length === 0) {
    return endRound(next, player.id);
  }

  return {
    ...next,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
    turnStage: 'draw',
    openedThisTurn: false,
  };
}

function nextRound(state: GameState): GameState {
  if (state.status !== 'roundOver') fail('The current hand is still being played.');
  const dealerIndex = (state.dealerIndex + 1) % state.players.length;
  // In paced mode, players who opened move on to their next opening; everyone else tries again.
  const advanced: GameState =
    state.mode === 'paced'
      ? {
          ...state,
          players: state.players.map((p) => ({ ...p, phaseIndex: p.isOpen ? Math.min(p.phaseIndex + 1, LAST_PHASE) : p.phaseIndex })),
        }
      : state;
  return dealRound(advanced, state.phaseIndex + 1, dealerIndex);
}

/** Applies an action to the game, returning the new state. Throws `GameRuleError` for illegal moves. */
export function applyAction(state: GameState, action: GameAction): GameState {
  const next = reduce(state, action);
  return { ...next, version: (state.version ?? 0) + 1 };
}

function reduce(state: GameState, action: GameAction): GameState {
  if (action.type === 'nextRound') return nextRound(state);

  if (state.status !== 'playing') fail('This hand is over.');
  if (action.type === 'buy' || action.type === 'passBuy') return respondToBuy(state, action.playerId, action.type === 'buy');

  const player = currentPlayer(state);
  if (player.id !== action.playerId) fail(`It's ${player.name}'s turn.`);
  if (state.buyOffer) fail(`Waiting to see whether anyone buys ${cardLabel(state.buyOffer.card)}.`);

  switch (action.type) {
    case 'drawFromDeck':
      return drawFromDeck(state, player);
    case 'drawFromDiscard':
      return drawFromDiscard(state, player);
    case 'open':
      return open(state, player, action.melds);
    case 'layMeld':
      return layMeld(state, player, action.cardIds);
    case 'addToMeld':
      return addToMeld(state, player, action.meldId, action.cardIds);
    case 'swapJoker':
      return swapJoker(state, player, action.meldId, action.cardId);
    case 'discard':
      return discard(state, player, action.cardId);
  }
}
