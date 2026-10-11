import { Card, parseCards } from '../cards';
import { OpeningCondition, isOpeningConditionMet } from '../openingConditions';

// Fixtures ported from the original xUnit OpeningConditionTests.
const melds = (...groups: string[]): Card[][] => groups.map(parseCards);

const LOW_PAIRS = [
  melds('2C 2H'),
  melds('3D 3H'),
  melds('4C 4S'),
  melds('5S 5D'),
  melds('6S 6D'),
  melds('7C 7H'),
  melds('8D 8H'),
  melds('9C 9S'),
  melds('10S 10D'),
];
const HIGH_PAIRS = [melds('JC JH'), melds('QD QH'), melds('KC KS'), melds('AS AD')];
const TWO_PAIRS = [melds('JC JH', '2C 2H'), melds('QD QS', '4C 4D'), melds('KC KH', '6S 6H'), melds('AC AH', '8C 8H')];
const TWO_LOW_PAIRS = [
  melds('2C 2H', '2C 2H'),
  melds('9D 9S', '4C 4D'),
  melds('7C 7H', '6S 6H'),
  melds('5C 5H', '8C 8H'),
  melds('3C 3H', '10C 10H'),
];
const THREE_OF_A_KINDS = [
  melds('2C 2H 2D'),
  melds('3D 3H 3S'),
  melds('4C 4S 4H'),
  melds('5S 5D 5C'),
  melds('6S 6D 6H'),
  melds('7C 7H 7D'),
  melds('8D 8H 8C'),
  melds('9C 9S 9H'),
  melds('10C 10D 10H'),
  melds('JS JC JH'),
  melds('QS QD QC'),
  melds('KC KD KH'),
  melds('AS AC AH'),
];
const FULL_HOUSES = [
  melds('JC JH JD', '2C 2H'),
  melds('QD QS', 'QD QS QC'),
  melds('4C 4D 4S', '6S 6H'),
  melds('AS AH AD', '8C 8H'),
];
const FORTIES = [
  melds('JC JH JD', '4C 4H 4D'),
  melds('AD AS AC', 'QD QS QC'),
  melds('7D 7S 7C', '8D 8S 8C'),
  melds('4C 4D 4S 4H', '6S 6D 6C 6H'),
  melds('2S 2H 2D 2C', '4C 4D 4S 4H', '4C 4D 4S 4H'),
];
const FOUR_OF_A_KINDS = [
  melds('JC JH JD JS'),
  melds('AD AS AC AH'),
  melds('7D 7S 7C 7H'),
  melds('4C 4D 4S 4H'),
  melds('2S 2H 2D 2C'),
];
const STRAIGHT_FLUSHES = [
  melds('10C JC QC KC AC'),
  melds('2H 3H 4H 5H 6H'),
  melds('7S 8S 9S 10S JS'),
  melds('4D 5D 6D 7D 8D'),
];
const ALL_DOWNS = [
  melds('10C JC QC KC AC', '2H 3H 4H', 'JC JH JD', '4C 4H 4D'),
  melds('4D 5D 6D 7D 8D', '2S 3S 4S', '4C 4H 4D', '4C 4H 4D'),
  melds('4D 4C 4S 4H', '2S 3S 4S', '4C 4H 4D', '4C 4H 4D'),
];

/** Hand size for All Down: every melded card plus one to discard. */
const handSizeFor = (groups: Card[][]) => groups.reduce((sum, g) => sum + g.length, 0) + 1;

const cases: Record<OpeningCondition, { valid: Card[][][]; invalid: Card[][][] }> = {
  highPair: {
    valid: HIGH_PAIRS,
    invalid: [...LOW_PAIRS, ...TWO_LOW_PAIRS, ...TWO_PAIRS, ...THREE_OF_A_KINDS, ...FULL_HOUSES, ...FORTIES, ...STRAIGHT_FLUSHES],
  },
  twoPair: {
    valid: TWO_PAIRS,
    invalid: [...LOW_PAIRS, ...TWO_LOW_PAIRS, ...HIGH_PAIRS, ...THREE_OF_A_KINDS, ...FULL_HOUSES, ...FORTIES, ...STRAIGHT_FLUSHES],
  },
  threeOfAKind: {
    valid: THREE_OF_A_KINDS,
    invalid: [...LOW_PAIRS, ...HIGH_PAIRS, ...TWO_LOW_PAIRS, ...TWO_PAIRS, ...FULL_HOUSES, ...FORTIES, ...STRAIGHT_FLUSHES],
  },
  fullHouse: {
    valid: FULL_HOUSES,
    invalid: [...LOW_PAIRS, ...HIGH_PAIRS, ...TWO_PAIRS, ...TWO_LOW_PAIRS, ...THREE_OF_A_KINDS, ...FORTIES, ...STRAIGHT_FLUSHES],
  },
  forty: {
    valid: FORTIES,
    // 10-J-Q-K-A is worth 51 points, so straight flushes aren't listed as invalid Forties.
    invalid: [...LOW_PAIRS, ...HIGH_PAIRS, ...TWO_PAIRS, ...TWO_LOW_PAIRS, ...THREE_OF_A_KINDS, ...FULL_HOUSES],
  },
  fourOfAKind: {
    valid: FOUR_OF_A_KINDS,
    invalid: [
      ...LOW_PAIRS,
      ...HIGH_PAIRS,
      ...TWO_PAIRS,
      ...TWO_LOW_PAIRS,
      ...THREE_OF_A_KINDS,
      ...FULL_HOUSES,
      ...STRAIGHT_FLUSHES,
      ...ALL_DOWNS,
    ],
  },
  straightFlush: {
    valid: STRAIGHT_FLUSHES,
    invalid: [...LOW_PAIRS, ...HIGH_PAIRS, ...TWO_PAIRS, ...TWO_LOW_PAIRS, ...THREE_OF_A_KINDS, ...FULL_HOUSES, ...ALL_DOWNS],
  },
  allDown: {
    valid: ALL_DOWNS,
    invalid: [
      ...LOW_PAIRS,
      ...HIGH_PAIRS,
      ...TWO_PAIRS,
      ...TWO_LOW_PAIRS,
      ...THREE_OF_A_KINDS,
      ...FULL_HOUSES,
      ...FORTIES,
      ...STRAIGHT_FLUSHES,
    ],
  },
};

describe.each(Object.entries(cases))('%s', (condition, { valid, invalid }) => {
  it.each(valid.map((m, i) => [i, m]))('accepts valid case %i', (_, groups) => {
    expect(isOpeningConditionMet(condition as OpeningCondition, groups, handSizeFor(groups))).toBe(true);
  });

  it.each(invalid.map((m, i) => [i, m]))('rejects invalid case %i', (_, groups) => {
    expect(isOpeningConditionMet(condition as OpeningCondition, groups, handSizeFor(groups))).toBe(false);
  });
});

describe('joker restrictions', () => {
  it('rejects jokers in a High Pair', () => {
    expect(isOpeningConditionMet('highPair', melds('KC J*'))).toBe(false);
  });

  it('rejects jokers in a Forty', () => {
    expect(isOpeningConditionMet('forty', melds('KC KD J*', 'QC QD QH'))).toBe(false);
  });

  it('allows one joker per meld in All Down', () => {
    const groups = melds('10C J* QC KC AC', '2H 3H 4H', 'JC JH JD', '4C 4H J*');
    expect(isOpeningConditionMet('allDown', groups, handSizeFor(groups))).toBe(true);
  });

  it('rejects two jokers in one All Down meld', () => {
    const groups = melds('10C J* J* KC AC', '2H 3H 4H', 'JC JH JD', '4C 4H 4D');
    expect(isOpeningConditionMet('allDown', groups, handSizeFor(groups))).toBe(false);
  });

  it('requires All Down melds to cover the whole hand but the discard', () => {
    const groups = ALL_DOWNS[0];
    expect(isOpeningConditionMet('allDown', groups, handSizeFor(groups) + 1)).toBe(false);
  });
});

describe('forty', () => {
  it('counts tens as ten points', () => {
    // 10+10+10 + 4+4+4 = 42
    expect(isOpeningConditionMet('forty', melds('10C 10D 10H', '4C 4D 4H'))).toBe(true);
  });

  it('counts a low Ace as one point', () => {
    // A-2-3 (6) + K-K-K (30) = 36
    expect(isOpeningConditionMet('forty', melds('AS 2S 3S', 'KC KD KH'))).toBe(false);
  });

  it('rejects groups that are not runs or sets', () => {
    expect(isOpeningConditionMet('forty', melds('KC QD JH', 'KS QS JS'))).toBe(false);
  });
});
