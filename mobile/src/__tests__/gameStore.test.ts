import { currentPlayer } from '@quaranta/shared';
import { useGameStore } from '@/stores/gameStore';

jest.mock('@/services/gameRepository', () => ({
  saveGame: jest.fn(() => Promise.resolve(false)),
  listRecentGames: jest.fn(() => Promise.resolve([])),
}));

const store = () => useGameStore.getState();

describe('gameStore', () => {
  beforeEach(() => {
    store().quitGame();
  });

  it('starts a game against the requested number of bots', () => {
    store().startGame('  Ada  ', 2);
    const game = store().game!;
    expect(game.players.map((p) => p.name)).toEqual(['Ada', 'Bianca', 'Marco']);
    expect(game.players.filter((p) => p.isBot)).toHaveLength(2);
    expect(store().humanId).toBe('human');
  });

  it('plays bot turns until it is the human player\'s turn', () => {
    store().startGame('Ada', 3);
    let steps = 0;
    while (currentPlayer(store().game!).isBot && steps++ < 500) {
      store().runBotStep();
    }
    expect(currentPlayer(store().game!).id).toBe('human');
    expect(store().game!.turnStage).toBe('draw');
  });

  it('reports illegal moves as a message instead of throwing', () => {
    store().startGame('Ada', 1);
    // The bot moves first, so the human can't draw yet.
    store().drawFromDeck();
    expect(store().message?.tone).toBe('error');
  });

  it('lets the human draw and discard', () => {
    store().startGame('Ada', 1);
    while (currentPlayer(store().game!).isBot) store().runBotStep();

    store().drawFromDeck();
    const human = store().game!.players.find((p) => p.id === 'human')!;
    expect(human.hand).toHaveLength(14);

    const lowCard = human.hand.find((c) => !c.joker && c.rank >= 2 && c.rank <= 10)!;
    store().toggleCard(lowCard.id);
    store().discardSelection();
    expect(store().game!.players.find((p) => p.id === 'human')!.hand).toHaveLength(13);
    expect(store().selectedIds).toEqual([]);
  });
});
