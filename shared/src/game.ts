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
const MAX_LOG_ENTRIES = 40;

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
}

export interface TableMeld {
  id: string;
  ownerId: string;
  kind: MeldKind;
  cards: Card[];
}

export interface RoundResult {
  phaseIndex: number;
  /** Null when the deck ran dry before anybody went out. */
  winnerId: string | null;
  points: Record<string, number>;
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
  players: GamePlayer[];
  phaseIndex: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  turnStage: TurnStage;
  /** Players can't play more cards on the turn they open. */
  openedThisTurn: boolean;
  /** Top card of each pile is the last element. */
  deck: Card[];
  discardPile: Card[];
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

export function currentPhase(state: GameState): PhaseDefinition {
  return PHASES[state.phaseIndex];
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

export function totalScores(state: GameState): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(state.players.map((p) => [p.id, 0]));
  for (const result of state.results) {
    for (const [playerId, points] of Object.entries(result.points)) {
      totals[playerId] = (totals[playerId] ?? 0) + points;
    }
  }
  return totals;
}

/** Players with the fewest points. More than one means a tie. */
export function leaders(state: GameState): GamePlayer[] {
  const totals = totalScores(state);
  const best = Math.min(...state.players.map((p) => totals[p.id]));
  return state.players.filter((p) => totals[p.id] === best);
}

/** Why a card can't be discarded right now, ignoring the "nothing else is discardable" fallback. */
function discardBlockReason(state: GameState, card: Card): string | null {
  if (isJoker(card)) return null;

  const condition = currentPhase(state).condition;
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
  const hand = getPlayer(state, playerId).hand;
  const allowed = hand.filter((card) => discardBlockReason(state, card) === null);
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
}

export function createGame({ players, id, seed = randomSeed() }: CreateGameOptions): GameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    fail(`Quaranta needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players.`);
  }

  const state: GameState = {
    id: id ?? `game-${seed.toString(36)}`,
    players: players.map((p, i) => ({
      id: p.id ?? `p${i + 1}`,
      name: p.name,
      isBot: p.isBot,
      hand: [],
      isOpen: false,
    })),
    phaseIndex: 0,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    turnStage: 'draw',
    openedThisTurn: false,
    deck: [],
    discardPile: [],
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

function dealRound(state: GameState, phaseIndex: number, dealerIndex: number): GameState {
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
    players: state.players.map((p, i) => ({ ...p, hand: hands[i], isOpen: false })),
    phaseIndex,
    dealerIndex,
    currentPlayerIndex: (dealerIndex + 1) % playerCount,
    turnStage: 'draw',
    openedThisTurn: false,
    deck,
    discardPile: [firstDiscard],
    reshuffles: 0,
    melds: [],
    status: 'playing',
    rngState,
  };

  const phase = PHASES[phaseIndex];
  return addLog(dealt, `Hand ${phaseIndex + 1}: ${phase.name}. ${state.players[dealerIndex].name} deals.`);
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

function endRound(state: GameState, winnerId: string | null): GameState {
  const condition = currentPhase(state).condition;
  const points = Object.fromEntries(state.players.map((p) => [p.id, handPoints(p.hand, condition)]));
  const isLastPhase = state.phaseIndex === PHASES.length - 1;

  const ended: GameState = {
    ...state,
    results: [...state.results, { phaseIndex: state.phaseIndex, winnerId, points }],
    status: isLastPhase ? 'gameOver' : 'roundOver',
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
  };
  return addLog(next, `${player.name} drew from the deck.`, player.id);
}

function drawFromDiscard(state: GameState, player: GamePlayer): GameState {
  if (state.turnStage !== 'draw') fail('You have already drawn this turn.');
  const card = topDiscard(state) ?? fail('The discard pile is empty.');

  const next: GameState = {
    ...updatePlayer(state, player.id, { hand: [...player.hand, card] }),
    discardPile: state.discardPile.slice(0, -1),
    turnStage: 'play',
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
    fail(discardBlockReason(state, card) ?? "That card can't be discarded right now.");
  }

  let next: GameState = {
    ...updatePlayer(state, player.id, { hand: remaining }),
    discardPile: [...state.discardPile, resetCard(card)],
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
  return dealRound(state, state.phaseIndex + 1, dealerIndex);
}

/** Applies an action to the game, returning the new state. Throws `GameRuleError` for illegal moves. */
export function applyAction(state: GameState, action: GameAction): GameState {
  if (action.type === 'nextRound') return nextRound(state);

  if (state.status !== 'playing') fail('This hand is over.');
  const player = currentPlayer(state);
  if (player.id !== action.playerId) fail(`It's ${player.name}'s turn.`);

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
