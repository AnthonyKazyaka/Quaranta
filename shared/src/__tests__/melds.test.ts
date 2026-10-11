import { JokerCard, createQuarantaDeck, effectiveValue, parseCards, valueLabel } from '../cards';
import { findSwappableJoker, isRun, isSet, resolveMeld, tryAddToMeld } from '../melds';

const labels = (notation: string) => {
  const resolved = resolveMeld(parseCards(notation));
  return resolved?.cards.map((c) => valueLabel(effectiveValue(c)!));
};

describe('deck', () => {
  it('has 108 uniquely identified cards including 4 jokers', () => {
    const deck = createQuarantaDeck();
    expect(deck).toHaveLength(108);
    expect(new Set(deck.map((c) => c.id)).size).toBe(108);
    expect(deck.filter((c) => c.joker)).toHaveLength(4);
  });
});

describe('runs', () => {
  it.each(['2H 3H 4H', 'AS 2S 3S', 'QD KD AD', '10C JC QC KC AC', '7S 5S 6S'])('accepts %s', (notation) => {
    expect(isRun(parseCards(notation))).toBe(true);
  });

  it.each(['KH AH 2H', '2H 3D 4H', '2H 3H', '2H 3H 3H 4H', '2H 4H 6H'])('rejects %s', (notation) => {
    expect(isRun(parseCards(notation))).toBe(false);
  });

  it('fills gaps with jokers', () => {
    expect(labels('5H J* 7H')).toEqual(['5H', '6H', '7H']);
  });

  it('extends upward with jokers, then downward', () => {
    expect(labels('5H 6H J*')).toEqual(['5H', '6H', '7H']);
    expect(labels('QH KH J* J*')).toEqual(['JH', 'QH', 'KH', 'AH']);
  });

  it('plays the Ace high when needed', () => {
    expect(labels('AC KC QC')).toEqual(['QC', 'KC', 'AC']);
  });
});

describe('sets', () => {
  it.each(['5H 5D 5C', 'KH KS', 'AH AD AC AS'])('accepts %s', (notation) => {
    expect(isSet(parseCards(notation))).toBe(true);
  });

  it.each(['5H 5H 5C', '5H 6H 7D', '5H 5D 5C 5S 5H'])('rejects %s', (notation) => {
    expect(isSet(parseCards(notation))).toBe(false);
  });

  it('assigns jokers to missing suits', () => {
    expect(labels('9H 9C J*')).toEqual(['9H', '9C', '9D']);
  });
});

describe('table play', () => {
  it('adds cards to the end of a run', () => {
    const meld = resolveMeld(parseCards('5H 6H 7H'))!;
    expect(tryAddToMeld(meld, parseCards('8H'))).not.toBeNull();
    expect(tryAddToMeld(meld, parseCards('4H'))).not.toBeNull();
    expect(tryAddToMeld(meld, parseCards('9H'))).toBeNull();
  });

  it('keeps sets as sets', () => {
    const pair = resolveMeld(parseCards('KH KS'))!;
    expect(tryAddToMeld(pair, parseCards('KD'))?.kind).toBe('set');
    expect(tryAddToMeld(pair, parseCards('QH'))).toBeNull();
  });

  it('finds the joker a natural card can replace in a run', () => {
    const meld = resolveMeld(parseCards('5H J* 7H'))!;
    const joker = meld.cards[1] as JokerCard;
    expect(findSwappableJoker(meld, parseCards('6H')[0])?.id).toBe(joker.id);
    expect(findSwappableJoker(meld, parseCards('6D')[0])).toBeNull();
  });

  it('lets any missing suit replace a joker in a set', () => {
    const meld = resolveMeld(parseCards('9H 9C J*'))!;
    expect(findSwappableJoker(meld, parseCards('9S')[0])).not.toBeNull();
    expect(findSwappableJoker(meld, parseCards('9H')[0])).toBeNull();
  });
});
