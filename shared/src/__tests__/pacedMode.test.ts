import { chooseBotAction } from '../bot';
import { parseCards } from '../cards';
import {
  GameState,
  MAX_PACED_HANDS,
  applyAction,
  createGame,
  leaders,
  openingsCompleted,
  phaseOf,
  totalScores,
} from '../game';
import { PHASES } from '../openingConditions';
import { getPublicView } from '../playerView';

const paced = (seed = 4) =>
  createGame({ seed, mode: 'paced', players: ['A', 'B', 'C'].map((name) => ({ id: name, name, isBot: true })) });

/** Ends the hand with `winner` going out on a discard; `opened` players keep their open flag. */
function endHand(state: GameState, winner: string, opened: string[]): GameState {
  const ready: GameState = {
    ...state,
    currentPlayerIndex: state.players.findIndex((p) => p.id === winner),
    turnStage: 'play',
    players: state.players.map((p) => ({
      ...p,
      isOpen: opened.includes(p.id),
      hand: p.id === winner ? parseCards('2C') : parseCards('9H KD'),
    })),
  };
  return applyAction(ready, { type: 'discard', playerId: winner, cardId: ready.players.find((p) => p.id === winner)!.hand[0].id });
}

describe('paced mode', () => {
  it('starts everyone on the first opening', () => {
    const state = paced();
    expect(state.mode).toBe('paced');
    expect(state.players.every((p) => p.phaseIndex === 0)).toBe(true);
    expect(getPublicView(state).players.map((p) => p.phaseIndex)).toEqual([0, 0, 0]);
  });

  it('moves players who opened on to the next opening and keeps the rest where they are', () => {
    let state = endHand(paced(), 'A', ['A', 'B']);
    expect(state.status).toBe('roundOver');
    expect(state.results[0].opened).toEqual(['A', 'B']);

    state = applyAction(state, { type: 'nextRound' });
    expect(state.players.map((p) => p.phaseIndex)).toEqual([1, 1, 0]);
    expect(state.phaseIndex).toBe(1);
    expect(phaseOf(state.players[0]).name).toBe(PHASES[1].name);
    expect(phaseOf(state.players[2]).name).toBe(PHASES[0].name);
    expect(getPublicView(state).players.map((p) => p.phaseIndex)).toEqual([1, 1, 0]);
  });

  it("scores each hand against the player's own opening", () => {
    let state = endHand(paced(), 'A', ['A']);
    state = applyAction(state, { type: 'nextRound' });
    // A is on Two Pair now; B and C are still on High Pair. Make A hold cards in All Down for contrast.
    state = { ...state, players: state.players.map((p) => (p.id === 'A' ? { ...p, phaseIndex: 7 } : p)) };
    const ready: GameState = {
      ...state,
      currentPlayerIndex: 1,
      turnStage: 'play',
      players: state.players.map((p) => ({ ...p, hand: p.id === 'B' ? parseCards('2C') : parseCards('9H KD') })),
    };
    const done = applyAction(ready, { type: 'discard', playerId: 'B', cardId: ready.players[1].hand[0].id });
    expect(done.results[1].points).toEqual({ A: 100, B: 0, C: 19 });
    expect(done.results[1].phases).toEqual({ A: 7, B: 0, C: 0 });
  });

  it('ends the game when someone finishes the last opening', () => {
    let state = paced();
    state = { ...state, players: state.players.map((p) => (p.id === 'B' ? { ...p, phaseIndex: 7 } : p)) };
    state = endHand(state, 'B', ['B']);
    expect(state.status).toBe('gameOver');
  });

  it('stops at the hand limit', () => {
    const state = endHand({ ...paced(), phaseIndex: MAX_PACED_HANDS - 1 }, 'A', []);
    expect(state.status).toBe('gameOver');
  });

  it('ranks by openings completed, then by points', () => {
    let state = paced();
    state = endHand(state, 'A', ['A', 'B']);
    state = applyAction(state, { type: 'nextRound' });
    state = endHand(state, 'B', ['B']);

    expect(openingsCompleted(state, 'A')).toBe(1);
    expect(openingsCompleted(state, 'B')).toBe(2);
    // Points are level, so openings completed decide it: B finished two, A only one.
    expect(totalScores(state).B).toBe(totalScores(state).A);
    expect(leaders(state).map((p) => p.id)).toEqual(['B']);
  });

  it('plays whole bot games to the end', () => {
    for (const seed of [1, 6, 33]) {
      let state = paced(seed);
      let actions = 0;
      while (state.status !== 'gameOver') {
        state = state.status === 'roundOver' ? applyAction(state, { type: 'nextRound' }) : applyAction(state, chooseBotAction(state));
        if (++actions > 60000) throw new Error('game did not finish');
      }
      expect(state.results.length).toBeLessThanOrEqual(MAX_PACED_HANDS);
      expect(leaders(state).length).toBeGreaterThan(0);
    }
  });

  it('leaves classic games alone', () => {
    const classic = createGame({ seed: 1, players: ['A', 'B'].map((name) => ({ name, isBot: true })) });
    expect(classic.mode).toBe('classic');
    const done = endHand(classic, 'p1', []);
    expect(applyAction(done, { type: 'nextRound' }).players.map((p) => p.phaseIndex)).toEqual([1, 1]);
  });
});
