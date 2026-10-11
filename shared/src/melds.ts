import { ACE, Card, CardValue, JokerCard, NaturalCard, Rank, SUITS, isJoker } from './cards';

// Source: https://en.wikipedia.org/wiki/Meld_(cards)
export type MeldKind = 'set' | 'run';

export interface ResolvedMeld {
  kind: MeldKind;
  /** Cards in display order, with every joker's `represents` filled in. */
  cards: Card[];
  /** For runs: whether an Ace in the run is played high (Q-K-A) rather than low (A-2-3). */
  aceHigh: boolean;
}

/** Largest set: one card of each suit. */
export const MAX_SET_SIZE = SUITS.length;
/** Largest run: Ace through King, with the Ace played either low or high (never wrapping). */
export const MAX_RUN_SIZE = 13;
export const MIN_RUN_SIZE = 3;
export const MIN_SET_SIZE = 2;

function splitCards(cards: Card[]): { naturals: NaturalCard[]; jokers: JokerCard[] } {
  const naturals: NaturalCard[] = [];
  const jokers: JokerCard[] = [];
  for (const card of cards) {
    if (isJoker(card)) jokers.push(card);
    else naturals.push(card);
  }
  return { naturals, jokers };
}

/**
 * A set is cards of a single rank with no repeated suit. Pairs count as sets so they can be
 * used for the High Pair, Two Pair and Full House openings.
 */
export function resolveSet(cards: Card[]): ResolvedMeld | null {
  const { naturals, jokers } = splitCards(cards);
  if (naturals.length === 0 || cards.length < MIN_SET_SIZE || cards.length > MAX_SET_SIZE) {
    return null;
  }

  const rank = naturals[0].rank;
  const suits = new Set(naturals.map((c) => c.suit));
  if (naturals.some((c) => c.rank !== rank) || suits.size !== naturals.length) {
    return null;
  }

  const missingSuits = SUITS.filter((s) => !suits.has(s));
  const orderedNaturals = [...naturals].sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit));
  const assignedJokers: Card[] = jokers.map((joker, i) => ({
    ...joker,
    represents: { suit: missingSuits[i], rank },
  }));

  return { kind: 'set', cards: [...orderedNaturals, ...assignedJokers], aceHigh: false };
}

/** Run positions run from 1 (low Ace) to 14 (high Ace). */
function positionToRank(position: number): Rank {
  return (position === 14 ? ACE : position) as Rank;
}

/**
 * A run is three or more consecutive cards of one suit. Aces may be low (A-2-3) or high
 * (Q-K-A) but runs never wrap around (K-A-2). Jokers fill gaps first, then extend the run
 * upward, then downward.
 */
export function resolveRun(cards: Card[]): ResolvedMeld | null {
  const { naturals, jokers } = splitCards(cards);
  const size = cards.length;
  if (naturals.length === 0 || size < MIN_RUN_SIZE || size > MAX_RUN_SIZE) {
    return null;
  }

  const suit = naturals[0].suit;
  const ranks = new Set(naturals.map((c) => c.rank));
  if (naturals.some((c) => c.suit !== suit) || ranks.size !== naturals.length) {
    return null;
  }

  const hasAce = ranks.has(ACE);
  for (const aceHigh of hasAce ? [false, true] : [false]) {
    const positionOf = (card: NaturalCard) => (card.rank === ACE && aceHigh ? 14 : card.rank);
    const positions = naturals.map(positionOf);
    const min = Math.min(...positions);
    const max = Math.max(...positions);
    const span = max - min + 1;
    if (span > size) continue;

    const extra = size - span;
    const above = Math.min(extra, 14 - max);
    const below = extra - above;
    const start = min - below;
    if (start < 1) continue;
    const end = max + above;
    // A window covering both 1 and 14 would need two Aces.
    if (start === 1 && end === 14) continue;

    const byPosition = new Map<number, NaturalCard>();
    naturals.forEach((card) => byPosition.set(positionOf(card), card));

    const ordered: Card[] = [];
    let jokerIndex = 0;
    for (let position = start; position <= end; position++) {
      const natural = byPosition.get(position);
      if (natural) {
        ordered.push(natural);
      } else {
        const joker = jokers[jokerIndex++];
        ordered.push({ ...joker, represents: { suit, rank: positionToRank(position) } });
      }
    }

    return { kind: 'run', cards: ordered, aceHigh: end === 14 };
  }

  return null;
}

/**
 * Resolves cards into a valid meld. When `kind` is given (e.g. adding to a meld already on the
 * table) only that kind is considered; otherwise a set is preferred over a run, which only
 * matters for ambiguous groups such as a single natural card with jokers.
 */
export function resolveMeld(cards: Card[], kind?: MeldKind): ResolvedMeld | null {
  if (kind === 'set') return resolveSet(cards);
  if (kind === 'run') return resolveRun(cards);
  return resolveSet(cards) ?? resolveRun(cards);
}

export function isSet(cards: Card[]): boolean {
  return resolveSet(cards) !== null;
}

export function isRun(cards: Card[]): boolean {
  return resolveRun(cards) !== null;
}

export function isSetOfSize(cards: Card[], size: number): boolean {
  return cards.length === size && isSet(cards);
}

export function isRunOfSize(cards: Card[], size: number): boolean {
  return cards.length === size && isRun(cards);
}

export function jokerCount(cards: Card[]): number {
  return cards.filter(isJoker).length;
}

export function hasJoker(cards: Card[]): boolean {
  return jokerCount(cards) > 0;
}

/** Point value of a meld for the Forty opening: Aces 11 (1 when played low), faces 10, others face value. */
export function meldPointValue(meld: ResolvedMeld): number {
  return meld.cards.reduce((total, card, index) => {
    const value: CardValue | null = isJoker(card) ? card.represents : card;
    if (!value) return total;
    if (value.rank === ACE) {
      const playedLow = meld.kind === 'run' && index === 0 && !meld.aceHigh;
      return total + (playedLow ? 1 : 11);
    }
    return total + Math.min(value.rank, 10);
  }, 0);
}

export interface MeldLike {
  kind: MeldKind;
  cards: Card[];
}

/** Returns the meld that results from adding `cards` to `meld`, or null if that isn't legal. */
export function tryAddToMeld(meld: MeldLike, cards: Card[]): ResolvedMeld | null {
  if (cards.length === 0) return null;
  return resolveMeld([...meld.cards, ...cards], meld.kind);
}

/**
 * Finds a joker in `meld` that `card` can replace. In a run the card must be exactly the one the
 * joker stands in for; in a set any card that keeps the set valid will do.
 */
export function findSwappableJoker(meld: MeldLike, card: Card): JokerCard | null {
  if (isJoker(card)) return null;

  for (const candidate of meld.cards) {
    if (!isJoker(candidate) || !candidate.represents) continue;

    if (meld.kind === 'run') {
      if (candidate.represents.rank === card.rank && candidate.represents.suit === card.suit) {
        return candidate;
      }
      continue;
    }

    const replaced = meld.cards.map((c) => (c.id === candidate.id ? card : c));
    if (resolveSet(replaced)) {
      return candidate;
    }
  }

  return null;
}
