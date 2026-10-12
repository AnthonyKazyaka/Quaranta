import { chooseBotAction } from '../bot';
import { GameState, applyAction, createGame } from '../game';
import { getPlayerView, getPublicView } from '../playerView';

const newGame = (seed: number) =>
  createGame({ seed, players: ['uid-a', 'uid-b', 'uid-c', 'uid-d'].map((id) => ({ id, name: id, isBot: true })) });

/** Card ids the viewer must not be able to see: the deck and everyone else's hand. */
function hiddenCardIds(state: GameState, viewerId: string): string[] {
  return [...state.deck, ...state.players.filter((p) => p.id !== viewerId).flatMap((p) => p.hand)].map((c) => c.id);
}

describe('getPlayerView', () => {
  it("includes the viewer's hand and only counts for everyone else", () => {
    const state = newGame(3);
    const view = getPlayerView(state, 'uid-b');
    expect(view.hand).toEqual(state.players[1].hand);
    expect(view.players.map((p) => p.handCount)).toEqual([13, 13, 13, 13]);
    expect(view.deckCount).toBe(state.deck.length);
    expect(view.topDiscard).toEqual(state.discardPile[0]);
  });

  it('never exposes hidden cards or the RNG state over a whole game', () => {
    let state = newGame(11);
    let checks = 0;
    while (state.status !== 'gameOver') {
      state = state.status === 'roundOver' ? applyAction(state, { type: 'nextRound' }) : applyAction(state, chooseBotAction(state));
      for (const viewer of state.players) {
        const json = JSON.stringify(getPlayerView(state, viewer.id));
        expect(json).not.toContain('rngState');
        for (const id of hiddenCardIds(state, viewer.id)) {
          if (json.includes(`"${id}"`)) throw new Error(`${viewer.id} can see hidden card ${id} at version ${state.version}`);
        }
        checks++;
      }
    }
    expect(checks).toBeGreaterThan(1000);
  });

  it('gives every player the same public view', () => {
    const state = newGame(5);
    const { viewerId: _a, hand: _b, ...fromA } = getPlayerView(state, 'uid-a');
    expect(fromA).toEqual(getPublicView(state));
  });

  it('rejects viewers who are not seated', () => {
    expect(() => getPlayerView(newGame(1), 'someone-else')).toThrow();
  });
});
