import { parseCards } from '../cards';
import { allDownHandPoints, standardHandPoints } from '../scoring';

describe('standardHandPoints', () => {
  it.each([
    ['2H 9C', 11],
    ['10D', 10],
    ['JH QS KC', 30],
    ['AH 5C', 6],
    ['AH AC', 22],
    ['J* 3D', 28],
    ['J* J* J* J* KH', 100],
    ['', 0],
  ])('%s scores %i', (notation, points) => {
    expect(standardHandPoints(parseCards(notation))).toBe(points);
  });
});

describe('allDownHandPoints', () => {
  it('is 100 for any cards left and 0 for none', () => {
    expect(allDownHandPoints(parseCards('2H'))).toBe(100);
    expect(allDownHandPoints([])).toBe(0);
  });
});
