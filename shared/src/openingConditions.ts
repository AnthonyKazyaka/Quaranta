import { Card, isHighRank, isJoker } from './cards';
import {
  MIN_RUN_SIZE,
  hasJoker,
  isRunOfSize,
  isSetOfSize,
  jokerCount,
  meldPointValue,
  resolveMeld,
} from './melds';

export type OpeningCondition =
  | 'highPair'
  | 'twoPair'
  | 'threeOfAKind'
  | 'fullHouse'
  | 'forty'
  | 'fourOfAKind'
  | 'straightFlush'
  | 'allDown';

export interface PhaseDefinition {
  condition: OpeningCondition;
  name: string;
  description: string;
}

/** The eight hands of a Quaranta game, played in order. */
export const PHASES: readonly PhaseDefinition[] = [
  { condition: 'highPair', name: 'High Pair', description: 'A pair of Jacks or better (Aces count high). No jokers.' },
  { condition: 'twoPair', name: 'Two Pair', description: 'Two pairs, at least one of them Jacks or better. No jokers.' },
  { condition: 'threeOfAKind', name: 'Three of a Kind', description: 'Three cards of the same rank. No jokers.' },
  { condition: 'fullHouse', name: 'Full House', description: 'Three of a kind plus a pair. No jokers.' },
  { condition: 'forty', name: 'Forty', description: 'Runs or sets of 3+ cards worth at least 40 points. No jokers.' },
  { condition: 'fourOfAKind', name: 'Four of a Kind', description: 'Four cards of the same rank. No jokers.' },
  { condition: 'straightFlush', name: 'Straight Flush', description: 'A run of exactly five cards in one suit. No jokers.' },
  {
    condition: 'allDown',
    name: 'All Down',
    description: 'Meld your whole hand at once (except your discard) in runs or sets of 3+, at most one joker each.',
  },
];

const isHighCard = (card: Card) => !isJoker(card) && isHighRank(card.rank);
const isNaturalPair = (meld: Card[]) => !hasJoker(meld) && isSetOfSize(meld, 2);
const isNaturalSetOfSize = (meld: Card[], size: number) => !hasJoker(meld) && isSetOfSize(meld, size);

type OpeningCheck = (melds: Card[][], handSize: number) => boolean;

const OPENING_CHECKS: Record<OpeningCondition, OpeningCheck> = {
  highPair: (melds) => melds.length === 1 && isNaturalPair(melds[0]) && melds[0].some(isHighCard),

  twoPair: (melds) =>
    melds.length === 2 && melds.every(isNaturalPair) && melds.some((meld) => meld.every(isHighCard)),

  threeOfAKind: (melds) => melds.length === 1 && isNaturalSetOfSize(melds[0], 3),

  fullHouse: (melds) =>
    melds.length === 2 &&
    melds.filter((m) => isNaturalSetOfSize(m, 2)).length === 1 &&
    melds.filter((m) => isNaturalSetOfSize(m, 3)).length === 1,

  forty: (melds) => {
    if (melds.length === 0 || melds.some((m) => m.length < MIN_RUN_SIZE || hasJoker(m))) return false;
    let points = 0;
    for (const meld of melds) {
      const resolved = resolveMeld(meld);
      if (!resolved) return false;
      points += meldPointValue(resolved);
    }
    return points >= 40;
  },

  fourOfAKind: (melds) => melds.length === 1 && isNaturalSetOfSize(melds[0], 4),

  straightFlush: (melds) => melds.length === 1 && !hasJoker(melds[0]) && isRunOfSize(melds[0], 5),

  allDown: (melds, handSize) => {
    const cardCount = melds.reduce((sum, m) => sum + m.length, 0);
    // The melds must account for every card in hand except the one being discarded.
    if (cardCount < 13 || cardCount !== handSize - 1) return false;
    return melds.every((m) => m.length >= MIN_RUN_SIZE && jokerCount(m) < 2 && resolveMeld(m) !== null);
  },
};

/**
 * Whether `melds` satisfy the opening condition for the current hand.
 * `handSize` is the number of cards the player holds before playing them (used by All Down).
 */
export function isOpeningConditionMet(condition: OpeningCondition, melds: Card[][], handSize = 0): boolean {
  return OPENING_CHECKS[condition](melds, handSize);
}

/** During the first two hands nobody may discard a high card until every player has opened. */
export function restrictsHighCardDiscards(condition: OpeningCondition): boolean {
  return condition === 'highPair' || condition === 'twoPair';
}
