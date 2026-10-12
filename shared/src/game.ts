import { Card, cardLabel, createQuarantaDeck, isHighRank, isJoker, resetCard } from './cards';
import { MIN_RUN_SIZE, MeldKind, findSwappableJoker, resolveMeld, tryAddToMeld } from './melds';
import { PHASES, PhaseDefinition, isOpeningConditionMet, restrictsHighCardDiscards } from './openingConditions';
import { randomSeed, shuffle } from './random';
import { handPoints } from './scoring';

export const CARDS_PER_PLAYER = 13;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
/** The own-pace mode stops after this many hands even if nobody has finished all eight openings. */
export const MAX_PACED_HANDS = 20;
const MAX_LOG_ENTRIES = 40;

/**
 * - `classic`: everyone plays the same opening each hand, eight hands in a row.
 * - `paced`: each player works through the openings at their own pace. You move on to the next
 *   opening after a hand in which you opened, and the first to finish All Down wins.
 */
export type GameMode = 'classic' | 'paced';

/**
 * Table stakes, in cents. Everyone antes into the pot each hand and buying a card adds to it;
 * whoever goes out takes the pot, and the game's winner collects from everyone else.
 */
export const STAKES = { ante: 25, buy: 10, gameWin: 50 } as const;

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
  /** Who went out. Null only in games saved before every hand had to end that way. */
  winnerId: string | null;
  points: Record<string, number>;
  /** Cents the winner took from the pot. */
  pot: number;
  /** Each player's opening this hand, by index into `PHASES`. */
  phases: Record<string, number>;
  /** Players who opened this hand, which is what moves them on in paced mode. */
  opened: string[];
}

export interface GameLogEntry {
  id: number;
  playerId: string | null;
  message: string;
}

/**
 * Buying: once the current player draws from the deck, anyone else may ask to buy the top
 * discard they passed over. The window stays open until that player ends their turn; then the
 * first requester in turn order after them gets the card. Buyers take only that card, so the
 * cost is holding more points if someone goes out.
 */
export interface BuyWindow {
  cardId: string;
  /** Players who asked to buy the card, in the order they asked. */
  requests: string[];
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
  /** How many times the discard pile has been turned into a new deck this hand. */
  reshuffles: number;
  /** The open buy window, if the current player drew from the deck this turn. */
  buyWindow: BuyWindow | null;
  /** The card turned up when the hand was dealt, until someone discards over it. It's the one card (besides jokers) that can't be bought. */
  firstDiscardId: string | null;
  /** Cents in the pot this hand. */
  pot: number;
  /** Each player's net winnings in cents. Negative while they're down. */
  purses: Record<string, number>;
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
  /** Out of turn: ask to buy the top discard while a buy window is open. */
  | { type: 'buy'; playerId: string }
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

/** Moves cents from a player's purse into the pot. */
function payIntoPot(state: GameState, playerId: string, cents: number): GameState {
  const purses = state.purses ?? {};
  return { ...state, pot: (state.pot ?? 0) + cents, purses: { ...purses, [playerId]: (purses[playerId] ?? 0) - cents } };
}

function credit(state: GameState, playerId: string, cents: number): GameState {
  const purses = state.purses ?? {};
  return { ...state, purses: { ...purses, [playerId]: (purses[playerId] ?? 0) + cents } };
}

/** Formats cents as "25¢" or "$1.25". */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return abs < 100 ? `${sign}${abs}¢` : `${sign}$${(abs / 100).toFixed(2)}`;
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

/** The card on offer in the open buy window, if there is one. */
export function buyableCard(state: GameState): Card | null {
  const window = state.buyWindow;
  const top = topDiscard(state);
  return window && top?.id === window.cardId ? top : null;
}

/** Whether the deck has a card to draw, counting a reshuffle of the discard pile under its top card. */
export function canDrawFromDeck(state: GameState): boolean {
  return state.deck.length > 0 || state.discardPile.length > 1;
}

/** Whether a player may ask to buy the top discard right now. */
export function canBuy(state: GameState, playerId: string): boolean {
  return (
    state.status === 'playing' &&
    buyableCard(state) !== null &&
    currentPlayer(state).id !== playerId &&
    !state.buyWindow!.requests.includes(playerId)
  );
}

/** Why a card can't be discarded right now, ignoring the "nothing else is discardable" fallback. */
function discardBlockReason(state: GameState, player: GamePlayer, card: Card): string | null {
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
    reshuffles: 0,
    buyWindow: null,
    firstDiscardId: null,
    pot: 0,
    purses: Object.fromEntries(ids.map((playerId) => [playerId, 0])),
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
    reshuffles: 0,
    buyWindow: null,
    firstDiscardId: firstDiscard.id,
    melds: [],
    status: 'playing',
    rngState,
  };

  const anted = dealt.players.reduce((next, p) => payIntoPot(next, p.id, STAKES.ante), dealt);
  const hand = state.mode === 'paced' ? `Hand ${handIndex + 1}` : `Hand ${handIndex + 1}: ${PHASES[handIndex].name}`;
  return addLog(anted, `${hand}. ${state.players[dealerIndex].name} deals. The pot is ${formatCents(anted.pot)}.`);
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

function endRound(ending: GameState, winnerId: string): GameState {
  // A pending buy goes through before scoring: the buyer is left holding the card.
  const state = settleBuy(ending);
  const points = Object.fromEntries(state.players.map((p) => [p.id, handPoints(p.hand, phaseOf(p).condition)]));
  const phases = Object.fromEntries(state.players.map((p) => [p.id, p.phaseIndex]));
  const opened = state.players.filter((p) => p.isOpen).map((p) => p.id);
  const lastPhase = PHASES.length - 1;
  const isFinished =
    state.mode === 'paced'
      ? state.players.some((p) => p.isOpen && p.phaseIndex === lastPhase) || state.phaseIndex + 1 >= MAX_PACED_HANDS
      : state.phaseIndex === lastPhase;

  // Whoever went out takes the pot.
  const pot = state.pot ?? 0;
  let ended: GameState = {
    ...credit(state, winnerId, pot),
    pot: 0,
    results: [...state.results, { phaseIndex: state.phaseIndex, winnerId, points, pot, phases, opened }],
    status: isFinished ? 'gameOver' : 'roundOver',
  };
  ended = addLog(ended, `${getPlayer(state, winnerId).name} went out and takes the ${formatCents(pot)} pot!`, winnerId);
  return isFinished ? payGameWinners(ended) : ended;
}

/** The game's winner collects from everyone else. Players tied for first split the payments. */
function payGameWinners(state: GameState): GameState {
  const winners = leaders(state);
  const winnerIds = new Set(winners.map((w) => w.id));
  let next = state;
  let collected = 0;
  for (const player of state.players) {
    if (winnerIds.has(player.id)) continue;
    next = credit(next, player.id, -STAKES.gameWin);
    collected += STAKES.gameWin;
  }

  // Split evenly; any odd cents go to the first winner at the table.
  const share = Math.floor(collected / winners.length);
  winners.forEach((winner, i) => {
    next = credit(next, winner.id, share + (i === 0 ? collected - share * winners.length : 0));
  });
  const names = winners.map((w) => w.name).join(' & ');
  return addLog(next, `${names} ${winners.length > 1 ? 'split' : 'collects'} ${formatCents(collected)} for winning the game.`);
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
    // Reshuffle everything but the top discard into a new deck, as often as it takes: a hand
    // only ends when someone goes out.
    const top = next.discardPile[next.discardPile.length - 1];
    const rest = next.discardPile.slice(0, -1).map(resetCard);
    const [deck, rngState] = shuffle(rest, next.rngState);
    next = { ...next, deck, discardPile: top ? [top] : [], reshuffles: next.reshuffles + 1, rngState };
    if (deck.length > 0) next = addLog(next, 'The discard pile was shuffled into a new deck.');
  }
  if (next.deck.length === 0) fail('The deck is empty. Take the top discard.');

  const card = next.deck[next.deck.length - 1];
  // Passing over the top discard puts it up for sale, except the card turned up at the deal and jokers.
  const passed = topDiscard(next);
  const buyable = passed && !isJoker(passed) && passed.id !== next.firstDiscardId ? passed : null;
  next = {
    ...updatePlayer(next, player.id, { hand: [...player.hand, card] }),
    deck: next.deck.slice(0, -1),
    turnStage: 'play',
    buyWindow: buyable ? { cardId: buyable.id, requests: [] } : null,
  };
  return addLog(next, `${player.name} drew from the deck.`, player.id);
}

function requestBuy(state: GameState, buyer: GamePlayer): GameState {
  const card = buyableCard(state) ?? fail("There's no card to buy right now.");
  if (currentPlayer(state).id === buyer.id) fail("You can't buy on your own turn.");
  if (state.buyWindow!.requests.includes(buyer.id)) fail(`You've already asked to buy ${cardLabel(card)}.`);

  const next = { ...state, buyWindow: { ...state.buyWindow!, requests: [...state.buyWindow!.requests, buyer.id] } };
  return addLog(next, `${buyer.name} put in to buy ${cardLabel(card)}.`, buyer.id);
}

/** Closes the buy window, giving the card to the first requester in turn order after the current player. */
function settleBuy(state: GameState): GameState {
  const window = state.buyWindow;
  const card = buyableCard(state);
  const closed: GameState = { ...state, buyWindow: null };
  if (!window || !card || window.requests.length === 0) return closed;

  const count = state.players.length;
  const buyer = Array.from({ length: count - 1 }, (_, i) => state.players[(state.currentPlayerIndex + 1 + i) % count]).find(
    (p) => window.requests.includes(p.id),
  );
  if (!buyer) return closed;

  const next: GameState = {
    ...payIntoPot(updatePlayer(closed, buyer.id, { hand: [...buyer.hand, card] }), buyer.id, STAKES.buy),
    discardPile: state.discardPile.slice(0, -1),
  };
  return addLog(next, `${buyer.name} bought ${cardLabel(card)} for ${formatCents(STAKES.buy)}.`, buyer.id);
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
    fail(discardBlockReason(state, player, card) ?? "That card can't be discarded right now.");
  }

  // Ending the turn closes the buy window before this discard covers the card on offer.
  const settled = settleBuy(state);
  let next: GameState = {
    ...updatePlayer(settled, player.id, { hand: remaining }),
    discardPile: [...settled.discardPile, resetCard(card)],
    // The dealt card has been covered; if it ever comes back up, it's a discard like any other.
    firstDiscardId: null,
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
  const lastPhase = PHASES.length - 1;
  const advanced: GameState =
    state.mode === 'paced'
      ? { ...state, players: state.players.map((p) => ({ ...p, phaseIndex: p.isOpen ? Math.min(p.phaseIndex + 1, lastPhase) : p.phaseIndex })) }
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
  if (action.type === 'buy') return requestBuy(state, getPlayer(state, action.playerId));
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
