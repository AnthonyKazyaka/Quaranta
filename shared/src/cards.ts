export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export const ACE: Rank = 1;
export const TEN: Rank = 10;

export interface CardValue {
  suit: Suit;
  rank: Rank;
}

export interface NaturalCard extends CardValue {
  id: string;
  joker: false;
}

/** A joker takes on the value of the card it stands in for once it is part of a meld. */
export interface JokerCard {
  id: string;
  joker: true;
  represents: CardValue | null;
}

export type Card = NaturalCard | JokerCard;

const RANK_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
const SUIT_LETTERS: Record<Suit, string> = { hearts: 'H', diamonds: 'D', clubs: 'C', spades: 'S' };
export const SUIT_SYMBOLS: Record<Suit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

export function isJoker(card: Card): card is JokerCard {
  return card.joker;
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

/** High cards are Aces and face cards. They matter for High Pair / Two Pair. */
export function isHighRank(rank: Rank): boolean {
  return rank === ACE || rank > TEN;
}

export function rankLabel(rank: Rank): string {
  return RANK_LABELS[rank] ?? String(rank);
}

/** The value a card currently plays as: its own for naturals, the represented value for jokers. */
export function effectiveValue(card: Card): CardValue | null {
  return card.joker ? card.represents : { suit: card.suit, rank: card.rank };
}

/** Human-readable label such as "K♣" or "Joker", used in game log messages. */
export function cardLabel(card: Card): string {
  if (card.joker) {
    return 'Joker';
  }
  return `${rankLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}`;
}

/** Compact notation such as "KC", the same format `parseCard` reads. */
export function valueLabel(value: CardValue): string {
  return `${rankLabel(value.rank)}${SUIT_LETTERS[value.suit]}`;
}

/**
 * Parses notation such as "AH", "10D", "QS" or "J*" (joker). Mirrors the original
 * C# `IPlayingCard.FromString`. Ids are generated so parsed cards are distinct.
 */
let parsedCardCounter = 0;
export function parseCard(notation: string, id?: string): Card {
  const value = notation.trim().toUpperCase();
  const cardId = id ?? `parsed-${parsedCardCounter++}`;

  if (value === 'J' || value === 'J*') {
    return { id: cardId, joker: true, represents: null };
  }

  if (value.length < 2 || value.length > 3) {
    throw new Error(`Invalid card value: ${notation}`);
  }

  const suitLetter = value[value.length - 1];
  const suit = SUITS.find((s) => SUIT_LETTERS[s] === suitLetter);
  if (!suit) {
    throw new Error(`Invalid suit in card value: ${notation}`);
  }

  const rankText = value.slice(0, -1);
  const namedRank = Object.entries(RANK_LABELS).find(([, label]) => label === rankText);
  const rank = namedRank ? Number(namedRank[0]) : Number(rankText);
  if (!Number.isInteger(rank) || rank < 1 || rank > 13) {
    throw new Error(`Invalid rank in card value: ${notation}`);
  }

  return { id: cardId, joker: false, suit, rank: rank as Rank };
}

export function parseCards(notation: string): Card[] {
  return notation
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((n) => parseCard(n));
}

/**
 * A standard 52 card deck plus 2 jokers. `copy` keeps ids unique when several decks are combined.
 */
export function createExtendedDeck(copy = 0): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: `${rankLabel(rank)}${SUIT_LETTERS[suit]}-${copy}`, joker: false, suit, rank });
    }
  }
  cards.push({ id: `JK-${copy * 2}`, joker: true, represents: null });
  cards.push({ id: `JK-${copy * 2 + 1}`, joker: true, represents: null });
  return cards;
}

/** The Quaranta deck: two extended decks, 108 cards including 4 jokers. */
export function createQuarantaDeck(): Card[] {
  return [...createExtendedDeck(0), ...createExtendedDeck(1)];
}

/** Clears any value a joker picked up on the table. */
export function resetCard(card: Card): Card {
  return card.joker ? { ...card, represents: null } : card;
}

export function sortCards(cards: Card[], by: 'suit' | 'rank' = 'suit'): Card[] {
  const suitOrder = (card: Card) => (card.joker ? SUITS.length : SUITS.indexOf(card.suit));
  const rankOrder = (card: Card) => (card.joker ? 99 : card.rank === ACE ? 14 : card.rank);
  return [...cards].sort((a, b) => {
    const primary = by === 'suit' ? suitOrder(a) - suitOrder(b) : rankOrder(a) - rankOrder(b);
    if (primary !== 0) return primary;
    const secondary = by === 'suit' ? rankOrder(a) - rankOrder(b) : suitOrder(a) - suitOrder(b);
    return secondary !== 0 ? secondary : a.id.localeCompare(b.id);
  });
}
