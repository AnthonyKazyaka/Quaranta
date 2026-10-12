import { actorsToMove, applyAction, createGame, currentPlayer, discardableCardIds, getPlayer } from '@quaranta/shared';
import { saveGame } from '@/services/gameRepository';
import { useGameStore } from '@/stores/gameStore';

jest.mock('@/services/gameRepository', () => ({
  saveGame: jest.fn(() => Promise.resolve(false)),
  listRecentGames: jest.fn(() => Promise.resolve([])),
}));

const store = () => useGameStore.getState();

describe('gameStore', () => {
  beforeEach(() => {
    store().quitGame();
    jest.mocked(saveGame).mockClear();
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
    // Keep going until the game is waiting on the human, who may first be asked about buying a discard.
    while (steps++ < 500) {
      const game = store().game!;
      if (!actorsToMove(game).some((id) => getPlayer(game, id).isBot)) break;
      store().runBotStep();
    }
    const game = store().game!;
    expect(actorsToMove(game)).toEqual(['human']);
    if (game.buyOffer) {
      store().passBuy();
      expect(store().game!.buyOffer).toBeNull();
    }
    expect(currentPlayer(store().game!).isBot).toBe(game.buyOffer ? true : false);
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
    expect(store().game!.buyOffer).toBeNull();

    store().drawFromDeck();
    const human = store().game!.players.find((p) => p.id === 'human')!;
    expect(human.hand).toHaveLength(14);

    const lowCard = human.hand.find((c) => !c.joker && c.rank >= 2 && c.rank <= 10)!;
    store().toggleCard(lowCard.id);
    store().discardSelection();
    expect(store().game!.players.find((p) => p.id === 'human')!.hand).toHaveLength(13);
    expect(store().selectedIds).toEqual([]);
  });

  it('saves to the cloud once per human turn, not after every bot move', () => {
    store().startGame('Ada', 3);
    let humanTurns = 0;
    let actions = 0;

    while (humanTurns < 12 && store().game!.status === 'playing') {
      const game = store().game!;
      if (actorsToMove(game).some((id) => getPlayer(game, id).isBot)) {
        store().runBotStep();
      } else if (game.buyOffer) {
        store().passBuy();
      } else {
        // Drawing may open a buy offer, which the bots settle before the human can discard.
        if (game.turnStage === 'draw') store().drawFromDeck();
        if (!store().game!.buyOffer) {
          humanTurns++;
          const cardId = discardableCardIds(store().game!, 'human')[0];
          store().toggleCard(cardId);
          store().discardSelection();
        }
      }
      actions++;
    }

    const saves = jest.mocked(saveGame).mock.calls.length;
    // One save when the game starts, then one each time play comes back to the human.
    expect(saves).toBeGreaterThanOrEqual(humanTurns);
    expect(saves).toBeLessThanOrEqual(humanTurns + 2);
    expect(actions).toBeGreaterThan(saves * 3);
  });

  it('records the human answer to a buy offer and lets the bots settle it', () => {
    // Bot 1 is about to draw past a discard that bot 3 threw, so bot 2 and then the human may buy it.
    const base = createGame({
      seed: 5,
      players: [
        { id: 'bot1', name: 'Bianca', isBot: true },
        { id: 'bot2', name: 'Marco', isBot: true },
        { id: 'human', name: 'Ada', isBot: false },
        { id: 'bot3', name: 'Giulia', isBot: true },
      ],
    });
    const game = applyAction(
      { ...base, currentPlayerIndex: 0, discardBuyable: true },
      { type: 'drawFromDeck', playerId: 'bot1' },
    );
    useGameStore.setState({ game, humanId: 'human' });
    expect(actorsToMove(game)).toEqual(['bot2', 'human']);

    store().buy();
    const answered = store().game!.buyOffer;
    expect(answered?.responses.human).toBe('buy');

    for (let steps = 0; steps < 5 && store().game!.buyOffer; steps++) store().runBotStep();
    const settled = store().game!;
    expect(settled.buyOffer).toBeNull();
    // Bot 2 is ahead of the human in line. Either it bought the card or passed and the human's buy went through.
    const hands = Object.fromEntries(settled.players.map((p) => [p.id, p.hand.length]));
    expect(hands.bot2 + hands.human).toBe(27);
    expect([hands.bot2, hands.human]).toContainEqual(14);
  });

  it('starts games in the chosen mode', () => {
    store().startGame('Ada', 2, 'paced');
    expect(store().game!.mode).toBe('paced');
  });
});
