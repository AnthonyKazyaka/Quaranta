import { ACE, Card, TEN, isJoker } from './cards';
import { OpeningCondition } from './openingConditions';

export const JOKER_POINTS = 25;
export const MAX_POINTS_PER_HAND = 100;

/**
 * Points left in a hand when somebody goes out:
 * - 2 through 10 are worth their face value
 * - Jacks, Queens and Kings are worth 10
 * - Aces are worth 1 if there's only one in the hand, otherwise 11 each
 * - Jokers are worth 25
 * A player can't take more than 100 points in a single hand.
 */
export function standardHandPoints(cards: Card[]): number {
  let points = 0;
  let aces = 0;

  for (const card of cards) {
    if (isJoker(card)) {
      points += JOKER_POINTS;
    } else if (card.rank === ACE) {
      aces++;
    } else {
      points += card.rank > TEN ? 10 : card.rank;
    }
  }

  points += aces * (aces > 1 ? 11 : 1);
  return Math.min(points, MAX_POINTS_PER_HAND);
}

/** In All Down, anyone still holding cards takes the full 100 points. */
export function allDownHandPoints(cards: Card[]): number {
  return cards.length === 0 ? 0 : MAX_POINTS_PER_HAND;
}

export function handPoints(cards: Card[], condition: OpeningCondition): number {
  return condition === 'allDown' ? allDownHandPoints(cards) : standardHandPoints(cards);
}
