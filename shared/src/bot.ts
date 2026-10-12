import { ACE, Card, NaturalCard, RANKS, SUITS, isHighRank, isJoker } from './cards';
import {
  GameAction,
  GamePlayer,
  GameState,
  buyableCard,
  canBuy,
  canDrawFromDeck,
  currentPlayer,
  discardableCardIds,
  getPlayer,
  phaseOf,
  topDiscard,
} from './game';
import {
  MAX_RUN_SIZE,
  MAX_SET_SIZE,
  MIN_RUN_SIZE,
  ResolvedMeld,
  findSwappableJoker,
  jokerCount,
  meldPointValue,
  resolveMeld,
  tryAddToMeld,
} from './melds';
import { OpeningCondition } from './openingConditions';
import { handPoints } from './scoring';

/** Subset search is exponential, so cap how many cards it looks at. Hands normally hold at most 14. */
const MAX_SEARCH_CARDS = 16;

interface MeldCandidate {
  mask: number;
  cards: Card[];
  resolved: ResolvedMeld;
  jokers: number;
}

function popcount(mask: number): number {
  let count = 0;
  for (let m = mask; m; m &= m - 1) count++;
  return count;
}

function lowestBit(mask: number): number {
  return 31 - Math.clz32(mask & -mask);
}

/**
 * Every valid run or set that can be made from the given cards (up to MAX_SEARCH_CARDS of them).
 * Jokers are interchangeable, so only the first few are ever used.
 */
function enumerateMelds(
  cards: Card[],
  { minSize = 2, maxJokers = Number.POSITIVE_INFINITY }: { minSize?: number; maxJokers?: number } = {},
): MeldCandidate[] {
  const indexed = cards.slice(0, MAX_SEARCH_CARDS).map((card, index) => ({ card, bit: 1 << index }));
  const jokers = indexed.filter((c) => isJoker(c.card));
  const naturals = indexed.filter((c) => !isJoker(c.card)) as { card: NaturalCard; bit: number }[];
  const jokerLimit = Math.min(jokers.length, maxJokers);
  const candidates = new Map<number, MeldCandidate>();

  const consider = (mask: number) => {
    if (candidates.has(mask) || popcount(mask) < minSize) return;
    const subset = indexed.filter((c) => mask & c.bit).map((c) => c.card);
    const resolved = resolveMeld(subset);
    if (resolved) candidates.set(mask, { mask, cards: subset, resolved, jokers: jokerCount(subset) });
  };
  const jokerMask = (count: number) => jokers.slice(0, count).reduce((m, j) => m | j.bit, 0);

  // Sets: naturals of one rank with distinct suits, topped up with jokers.
  for (const rank of RANKS) {
    const ofRank = naturals.filter((c) => c.card.rank === rank);
    const choose = (start: number, mask: number, suits: Set<string>) => {
      if (mask) {
        for (let j = 0; j <= jokerLimit && popcount(mask) + j <= MAX_SET_SIZE; j++) consider(mask | jokerMask(j));
      }
      for (let i = start; i < ofRank.length; i++) {
        if (suits.has(ofRank[i].card.suit)) continue;
        choose(i + 1, mask | ofRank[i].bit, new Set([...suits, ofRank[i].card.suit]));
      }
    };
    choose(0, 0, new Set());
  }

  // Runs: windows of consecutive positions (1 = low Ace ... 14 = high Ace) in one suit, gaps filled by jokers.
  for (const suit of SUITS) {
    const byPosition = new Map<number, number>();
    for (const { card, bit } of naturals) {
      if (card.suit !== suit || byPosition.has(card.rank)) continue;
      byPosition.set(card.rank, bit);
      if (card.rank === ACE) byPosition.set(14, bit);
    }
    if (byPosition.size === 0) continue;

    for (let start = 1; start <= 12; start++) {
      let mask = 0;
      let naturalCount = 0;
      let gaps = 0;
      for (let end = start; end <= 14 && end - start < MAX_RUN_SIZE; end++) {
        const bit = byPosition.get(end);
        if (bit !== undefined && !(mask & bit)) {
          mask |= bit;
          naturalCount++;
        } else {
          gaps++;
        }
        if (gaps > jokerLimit) break;
        if (end - start + 1 >= MIN_RUN_SIZE && naturalCount > 0) consider(mask | jokerMask(gaps));
      }
    }
  }

  return [...candidates.values()];
}

/**
 * Picks non-overlapping melds that maximize `value`. Cards outside `skippable` must be covered,
 * so passing every bit but one asks for an exact cover of the rest of the hand.
 */
function bestCover(
  cardCount: number,
  candidates: MeldCandidate[],
  value: (candidate: MeldCandidate) => number,
  skippable = (1 << cardCount) - 1,
): { chosen: MeldCandidate[]; value: number } | null {
  const full = (1 << cardCount) - 1;
  const byLowestBit: MeldCandidate[][] = Array.from({ length: cardCount }, () => []);
  candidates.forEach((c) => byLowestBit[lowestBit(c.mask)].push(c));

  const memo = new Map<number, { chosen: MeldCandidate[]; value: number } | null>();
  const solve = (decided: number): { chosen: MeldCandidate[]; value: number } | null => {
    if (decided === full) return { chosen: [], value: 0 };
    const cached = memo.get(decided);
    if (cached !== undefined) return cached;

    const i = lowestBit(~decided & full);
    let best: { chosen: MeldCandidate[]; value: number } | null = null;

    if (skippable & (1 << i)) {
      best = solve(decided | (1 << i));
    }
    for (const candidate of byLowestBit[i]) {
      if (candidate.mask & decided) continue;
      const rest = solve(decided | candidate.mask);
      if (!rest) continue;
      const total = rest.value + value(candidate);
      if (!best || total > best.value) {
        best = { chosen: [candidate, ...rest.chosen], value: total };
      }
    }

    memo.set(decided, best);
    return best;
  };

  return solve(0);
}

const ids = (cards: Card[]) => cards.map((c) => c.id);
const disjoint = (a: MeldCandidate, b: MeldCandidate) => (a.mask & b.mask) === 0;

/** Finds melds in `hand` that satisfy the opening condition, as groups of card ids. */
export function findOpeningMelds(hand: Card[], condition: OpeningCondition): string[][] | null {
  if (condition === 'allDown') return findAllDown(hand);

  const naturals = hand.filter((c) => !isJoker(c)).slice(0, MAX_SEARCH_CARDS);
  const candidates = enumerateMelds(naturals);
  const sets = (size: number) => candidates.filter((c) => c.resolved.kind === 'set' && c.cards.length === size);
  const isHighGroup = (c: MeldCandidate) => c.cards.every((card) => !isJoker(card) && isHighRank(card.rank));

  switch (condition) {
    case 'highPair': {
      const pair = sets(2).find(isHighGroup);
      return pair ? [ids(pair.cards)] : null;
    }
    case 'twoPair': {
      const pairs = sets(2);
      for (const high of pairs.filter(isHighGroup)) {
        const other = pairs.find((p) => p !== high && disjoint(p, high));
        if (other) return [ids(high.cards), ids(other.cards)];
      }
      return null;
    }
    case 'threeOfAKind': {
      const trip = sets(3)[0];
      return trip ? [ids(trip.cards)] : null;
    }
    case 'fullHouse': {
      for (const trip of sets(3)) {
        const pair = sets(2).find((p) => disjoint(p, trip));
        if (pair) return [ids(trip.cards), ids(pair.cards)];
      }
      return null;
    }
    case 'fourOfAKind': {
      const quad = sets(4)[0];
      return quad ? [ids(quad.cards)] : null;
    }
    case 'straightFlush': {
      const run = candidates.find((c) => c.resolved.kind === 'run' && c.cards.length === 5);
      return run ? [ids(run.cards)] : null;
    }
    case 'forty': {
      const big = candidates.filter((c) => c.cards.length >= MIN_RUN_SIZE);
      const cover = bestCover(naturals.length, big, (c) => meldPointValue(c.resolved));
      return cover && cover.value >= 40 ? cover.chosen.map((c) => ids(c.cards)) : null;
    }
  }
}

/** All Down: every card but one in runs or sets of 3+, with at most one joker each. */
function findAllDown(hand: Card[]): string[][] | null {
  if (hand.length < 14 || hand.length > MAX_SEARCH_CARDS) return null;
  const candidates = enumerateMelds(hand, { minSize: MIN_RUN_SIZE, maxJokers: 1 });

  // Try keeping the most expensive card as the discard last, since that's the one we'd rather unload.
  const discardOrder = hand
    .map((card, index) => ({ index, points: handPoints([card], 'highPair') }))
    .sort((a, b) => a.points - b.points);

  for (const { index } of discardOrder) {
    const cover = bestCover(hand.length, candidates, (c) => c.cards.length, 1 << index);
    if (cover && cover.value === hand.length - 1) {
      return cover.chosen.map((c) => ids(c.cards));
    }
  }
  return null;
}

/** Largest group of new melds that can be laid from the hand once open. */
function findMeldsToLay(hand: Card[]): Card[][] {
  const candidates = enumerateMelds(hand, { minSize: MIN_RUN_SIZE });
  if (candidates.length === 0) return [];
  const cover = bestCover(Math.min(hand.length, MAX_SEARCH_CARDS), candidates, (c) => c.cards.length * 10 - c.jokers);
  return cover ? cover.chosen.map((c) => c.cards) : [];
}

/** How much same-rank and same-suit neighbours are worth while working toward each opening. */
const OPENING_WEIGHTS: Record<OpeningCondition, { rank: number; suit: number }> = {
  highPair: { rank: 3, suit: 0.5 },
  twoPair: { rank: 3, suit: 0.5 },
  threeOfAKind: { rank: 3, suit: 0.5 },
  fullHouse: { rank: 3, suit: 0.5 },
  forty: { rank: 2, suit: 2 },
  fourOfAKind: { rank: 3, suit: 0.5 },
  straightFlush: { rank: 0.5, suit: 3 },
  allDown: { rank: 2, suit: 2 },
};
const OPEN_WEIGHTS = { rank: 2, suit: 2 };

/** How much a card helps the rest of the hand. Lower means a better discard. */
function keepScore(card: Card, hand: Card[], weights: { rank: number; suit: number }): number {
  if (isJoker(card)) return 1000;
  let score = 0;
  for (const other of hand) {
    if (other.id === card.id || isJoker(other)) continue;
    if (other.rank === card.rank && other.suit !== card.suit) score += weights.rank;
    if (other.suit === card.suit) {
      const distance = Math.abs(other.rank - card.rank);
      const aceDistance = card.rank === ACE || other.rank === ACE ? 14 - Math.max(card.rank, other.rank) : distance;
      if (Math.min(distance, aceDistance) > 0 && Math.min(distance, aceDistance) <= 2) score += weights.suit;
    }
  }
  // Prefer unloading expensive cards when they're equally useless.
  return score - handPoints([card], 'highPair') / 20;
}

function chooseDiscard(state: GameState, player: GamePlayer): string {
  const allowed = new Set(discardableCardIds(state, player.id));
  const options = player.hand.filter((c) => allowed.has(c.id));
  const weights = player.isOpen ? OPEN_WEIGHTS : OPENING_WEIGHTS[phaseOf(player).condition];
  options.sort((a, b) => keepScore(a, player.hand, weights) - keepScore(b, player.hand, weights));
  return options[0].id;
}

function formsNewMeld(card: Card, hand: Card[]): boolean {
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      if (resolveMeld([card, hand[i], hand[j]])) return true;
    }
  }
  return false;
}

function shouldTakeDiscard(state: GameState, player: GamePlayer): boolean {
  const card = topDiscard(state);
  if (!card) return false;

  if (player.isOpen) {
    if (isJoker(card)) return true;
    return state.melds.some((m) => tryAddToMeld(m, [card])) || formsNewMeld(card, player.hand);
  }

  const condition = phaseOf(player).condition;
  if (isJoker(card) && condition !== 'allDown') return false;
  return findOpeningMelds([...player.hand, card], condition) !== null;
}

/** Bots stop buying once their hand is this big; it also keeps the meld search bounded. */
const MAX_HAND_FOR_BUYING = 15;
/** An opponent this close to going out makes extra cards too risky to take on. */
const RISKY_HAND_SIZE = 3;
/** How well a card must fit the hand (see keepScore) before a bot buys it on spec. */
const BUY_FIT_THRESHOLD = 2.5;

/**
 * Whether a bot should ask to buy the card on offer. A bought card is one more card to get rid
 * of, so bots buy when it completes their opening or a new meld, and only buy cheap cards that
 * merely help when nobody is about to go out.
 */
export function chooseBotBuy(state: GameState, playerId: string): boolean {
  if (!canBuy(state, playerId)) return false;
  const card = buyableCard(state)!;
  const player = getPlayer(state, playerId);
  if (player.hand.length >= MAX_HAND_FOR_BUYING) return false;

  const danger = state.players.some((p) => p.id !== playerId && p.isOpen && p.hand.length <= RISKY_HAND_SIZE);
  if (player.isOpen) return !danger && formsNewMeld(card, player.hand);

  const condition = phaseOf(player).condition;
  if (findOpeningMelds(player.hand, condition) !== null) return false;
  const withCard = [...player.hand, card];
  if (findOpeningMelds(withCard, condition) !== null) return true;
  if (danger || condition === 'allDown') return false;
  return handPoints([card], condition) <= 10 && keepScore(card, withCard, OPENING_WEIGHTS[condition]) >= BUY_FIT_THRESHOLD;
}

/** Decides the next action for the bot whose turn it is. Call repeatedly until the turn passes. */
export function chooseBotAction(state: GameState): GameAction {
  const player = currentPlayer(state);
  const playerId = player.id;

  if (state.turnStage === 'draw') {
    const takeDiscard = shouldTakeDiscard(state, player) || !canDrawFromDeck(state);
    return takeDiscard ? { type: 'drawFromDiscard', playerId } : { type: 'drawFromDeck', playerId };
  }

  if (!player.isOpen) {
    const opening = findOpeningMelds(player.hand, phaseOf(player).condition);
    if (opening) return { type: 'open', playerId, melds: opening };
    return { type: 'discard', playerId, cardId: chooseDiscard(state, player) };
  }

  if (!state.openedThisTurn) {
    for (const card of player.hand) {
      const meld = state.melds.find((m) => findSwappableJoker(m, card));
      if (meld) return { type: 'swapJoker', playerId, meldId: meld.id, cardId: card.id };
    }

    const toLay = findMeldsToLay(player.hand);
    if (toLay.length > 0) return { type: 'layMeld', playerId, cardIds: ids(toLay[0]) };

    // Hold on to jokers unless playing them lets us go out.
    const playable = player.hand.filter((c) => !isJoker(c) || player.hand.length <= 2);
    for (const card of playable) {
      const meld = state.melds.find((m) => tryAddToMeld(m, [card]));
      if (meld) return { type: 'addToMeld', playerId, meldId: meld.id, cardIds: [card.id] };
    }
  }

  return { type: 'discard', playerId, cardId: chooseDiscard(state, player) };
}

/**
 * A move that's always legal for the player whose turn it is: draw (from the deck, or the discard
 * pile if the deck is empty) or throw away a card. For when a bot's usual choice is rejected or a
 * turn has to be ended on someone's behalf.
 */
export function safeBotAction(state: GameState, playerId: string): GameAction {
  if (state.turnStage === 'draw') {
    return { type: canDrawFromDeck(state) ? 'drawFromDeck' : 'drawFromDiscard', playerId };
  }
  return { type: 'discard', playerId, cardId: discardableCardIds(state, playerId)[0] };
}
