import { chooseBotAction, chooseBotBuy } from '../bot';
import { parseCards } from '../cards';
import { GameState, STAKES, applyAction, createGame, currentPlayer, formatCents, leaders } from '../game';

const threePlayers = () => createGame({ seed: 5, players: ['Ada', 'Bo', 'Cy'].map((name) => ({ name, isBot: true })) });
const sum = (purses: Record<string, number>) => Object.values(purses).reduce((a, b) => a + b, 0);

/** p1 to play with the given hands; p1 goes out by discarding their only card. */
function goingOut(state: GameState, hands = ['2C', '9H', '5S']): GameState {
  return {
    ...state,
    currentPlayerIndex: 0,
    turnStage: 'play',
    players: state.players.map((p, i) => ({ ...p, hand: parseCards(hands[i]) })),
  };
}
const discardFirst = (state: GameState) =>
  applyAction(state, { type: 'discard', playerId: currentPlayer(state).id, cardId: currentPlayer(state).hand[0].id });

describe('stakes', () => {
  it('antes everyone into the pot when a hand is dealt', () => {
    const state = threePlayers();
    expect(state.pot).toBe(3 * STAKES.ante);
    expect(state.purses).toEqual({ p1: -25, p2: -25, p3: -25 });
  });

  it('pays the pot to whoever goes out', () => {
    const state = discardFirst(goingOut(threePlayers()));
    expect(state.status).toBe('roundOver');
    expect(state.results[0].pot).toBe(75);
    expect(state.pot).toBe(0);
    expect(state.purses).toEqual({ p1: 50, p2: -25, p3: -25 });
  });

  it('starts each hand with a fresh ante', () => {
    let state = discardFirst(goingOut(threePlayers()));
    state = applyAction(state, { type: 'nextRound' });
    expect(state.pot).toBe(75);
    expect(state.purses).toEqual({ p1: 25, p2: -50, p3: -50 });
  });

  it('charges only the buyer who gets the card', () => {
    let state: GameState = {
      ...threePlayers(),
      currentPlayerIndex: 0,
      turnStage: 'draw',
      discardPile: parseCards('9C 7H'),
      firstDiscardId: null,
    };
    state = { ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, hand: parseCards('2C 3D') } : p)) };
    state = applyAction(state, { type: 'drawFromDeck', playerId: 'p1' });
    state = applyAction(state, { type: 'buy', playerId: 'p3' });
    state = applyAction(state, { type: 'buy', playerId: 'p2' });
    state = discardFirst(state);
    expect(state.purses).toEqual({ p1: -25, p2: -35, p3: -25 });
    expect(state.pot).toBe(85);
  });

  it('pays the game winner from everyone else, and tied winners split it', () => {
    const lastHand = (scores: number[]): GameState => ({
      ...goingOut(threePlayers()),
      phaseIndex: 7,
      players: goingOut(threePlayers()).players.map((p) => ({ ...p, phaseIndex: 7 })),
      results: [
        { phaseIndex: 6, winnerId: 'p1', points: { p1: scores[0], p2: scores[1], p3: scores[2] }, pot: 0, phases: {}, opened: [] },
      ],
    });

    const solo = discardFirst(lastHand([10, 40, 60]));
    expect(solo.status).toBe('gameOver');
    // p1 wins the 75 pot, then 50 from each of the other two.
    expect(solo.purses).toEqual({ p1: 150, p2: -75, p3: -75 });

    // The last hand is All Down, so cards left in hand cost 100: p1 goes out on 130, tying p2's 30 + 100.
    const tied = discardFirst(lastHand([130, 30, 60]));
    expect(leaders(tied).map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(tied.purses).toEqual({ p1: 75, p2: 0, p3: -75 });
  });

  it('formats cents', () => {
    expect(formatCents(25)).toBe('25¢');
    expect(formatCents(150)).toBe('$1.50');
    expect(formatCents(-75)).toBe('-75¢');
  });

  it.each([2, 8])('never creates or loses money over a whole game (seed %i)', (seed) => {
    let state = createGame({ seed, players: ['A', 'B', 'C', 'D'].map((name) => ({ name, isBot: true })) });
    while (state.status !== 'gameOver') {
      if (state.status === 'roundOver') {
        state = applyAction(state, { type: 'nextRound' });
        continue;
      }
      state = applyAction(state, chooseBotAction(state));
      for (const p of state.players) {
        if (chooseBotBuy(state, p.id)) state = applyAction(state, { type: 'buy', playerId: p.id });
      }
      expect(sum(state.purses) + state.pot).toBe(0);
    }
    expect(state.pot).toBe(0);
    expect(sum(state.purses)).toBe(0);
  });
});
