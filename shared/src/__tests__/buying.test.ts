import { chooseBotAction } from '../bot';
import { parseCards } from '../cards';
import {
  GameState,
  actorsToMove,
  applyAction,
  buyBlockReason,
  createGame,
  currentPlayer,
} from '../game';
import { getPlayerView } from '../playerView';

const fourPlayers = (seed = 9) =>
  createGame({ seed, players: ['A', 'B', 'C', 'D'].map((name) => ({ id: name, name, isBot: false })) });

/** Player A (index 0) is about to draw, and D (index 3) has just thrown the top discard. */
function readyToDraw(overrides: Partial<GameState> = {}): GameState {
  const base = fourPlayers();
  return {
    ...base,
    currentPlayerIndex: 0,
    discardPile: parseCards('4C 9H'),
    discardBuyable: true,
    ...overrides,
  };
}

const draw = (state: GameState) => applyAction(state, { type: 'drawFromDeck', playerId: currentPlayer(state).id });

describe('buying', () => {
  it('opens an offer when the current player draws from the deck past a thrown discard', () => {
    const state = draw(readyToDraw());
    expect(state.buyOffer?.card.id).toBe(state.discardPile[1].id);
    // Priority runs from the current player's left, and the player who threw the card can't buy it back.
    expect(state.buyOffer?.eligible).toEqual(['B', 'C']);
    expect(actorsToMove(state)).toEqual(['B', 'C']);
  });

  it('is not offered for the first card turned up, a joker, or a card the player took', () => {
    expect(draw(readyToDraw({ discardBuyable: false })).buyOffer).toBeNull();
    expect(draw(readyToDraw({ discardPile: parseCards('4C J*') })).buyOffer).toBeNull();
    const taken = applyAction(readyToDraw(), { type: 'drawFromDiscard', playerId: 'A' });
    expect(taken.buyOffer).toBeNull();
    expect(taken.discardBuyable).toBe(false);
  });

  it('marks a discard as buyable unless it is a joker', () => {
    const state = draw(readyToDraw({ discardBuyable: false }));
    const card = currentPlayer(state).hand[0];
    const next = applyAction(state, { type: 'discard', playerId: 'A', cardId: card.id });
    expect(next.discardBuyable).toBe(!card.joker);
  });

  it('gives the buyer just the discard and resumes the turn', () => {
    let state = draw(readyToDraw());
    const offered = state.buyOffer!.card;
    const deckAfterDraw = state.deck;
    state = applyAction(state, { type: 'buy', playerId: 'B' });

    const buyer = state.players[1];
    expect(buyer.hand).toHaveLength(14);
    expect(buyer.hand.map((c) => c.id)).toContain(offered.id);
    expect(state.deck).toEqual(deckAfterDraw);
    expect(state.discardPile.map((c) => c.id)).not.toContain(offered.id);
    expect(state.buyOffer).toBeNull();
    expect(state.log[state.log.length - 1].message).toMatch(/B bought/);
  });

  it('blocks the current player until the offer is settled', () => {
    const state = draw(readyToDraw());
    const cardId = currentPlayer(state).hand[0].id;
    expect(() => applyAction(state, { type: 'discard', playerId: 'A', cardId })).toThrow(/whether anyone buys/);
  });

  it('closes the offer when everyone passes', () => {
    let state = draw(readyToDraw());
    state = applyAction(state, { type: 'passBuy', playerId: 'C' });
    expect(state.buyOffer).not.toBeNull();
    state = applyAction(state, { type: 'passBuy', playerId: 'B' });
    expect(state.buyOffer).toBeNull();
    expect(state.players.map((p) => p.hand.length)).toEqual([14, 13, 13, 13]);
  });

  it('waits for a higher-priority player before honouring a later buyer', () => {
    let state = draw(readyToDraw());
    state = applyAction(state, { type: 'buy', playerId: 'C' });
    expect(state.buyOffer).not.toBeNull();
    expect(state.players[2].hand).toHaveLength(13);

    // B passes, so C's earlier answer now wins.
    state = applyAction(state, { type: 'passBuy', playerId: 'B' });
    expect(state.buyOffer).toBeNull();
    expect(state.players[2].hand).toHaveLength(14);
  });

  it('lets the higher-priority player win even if the lower one answered first', () => {
    let state = draw(readyToDraw());
    state = applyAction(state, { type: 'buy', playerId: 'C' });
    state = applyAction(state, { type: 'buy', playerId: 'B' });
    expect(state.players[1].hand).toHaveLength(14);
    expect(state.players[2].hand).toHaveLength(13);
  });

  it('rejects answers from the wrong player, twice, or with no offer', () => {
    const open = draw(readyToDraw());
    expect(() => applyAction(open, { type: 'buy', playerId: 'A' })).toThrow();
    expect(() => applyAction(open, { type: 'buy', playerId: 'D' })).toThrow();
    const answered = applyAction(open, { type: 'passBuy', playerId: 'C' });
    expect(() => applyAction(answered, { type: 'buy', playerId: 'C' })).toThrow(/already answered/);
    expect(() => applyAction(readyToDraw(), { type: 'buy', playerId: 'B' })).toThrow(/nothing to buy/);
  });

  it('has no limit on how many times a player can buy in a hand', () => {
    let state = readyToDraw();
    for (let i = 0; i < 4; i++) {
      state = draw({ ...state, currentPlayerIndex: 0, turnStage: 'draw', discardBuyable: true, discardPile: parseCards('4C 9H') });
      expect(state.buyOffer?.eligible).toEqual(['B', 'C']);
      state = applyAction(state, { type: 'buy', playerId: 'B' });
    }
    expect(state.players[1].hand).toHaveLength(17);
  });

  it('is never offered in a two-player game, where the only other player threw the card', () => {
    const base = createGame({ seed: 3, players: ['A', 'B'].map((name) => ({ id: name, name, isBot: false })) });
    const state = draw({ ...base, currentPlayerIndex: 0, discardBuyable: true });
    expect(state.buyOffer).toBeNull();
  });

  it('is part of the public view', () => {
    const state = draw(readyToDraw());
    expect(getPlayerView(state, 'C').buyOffer).toEqual(state.buyOffer);
  });

  it('lets bots settle offers on their own across whole games', () => {
    let buys = 0;
    for (const seed of [2, 5, 8]) {
      let state = createGame({ seed, players: ['A', 'B', 'C', 'D'].map((name) => ({ name, isBot: true })) });
      let actions = 0;
      while (state.status !== 'gameOver') {
        const before = state.log.filter((e) => / bought /.test(e.message)).length;
        state = state.status === 'roundOver' ? applyAction(state, { type: 'nextRound' }) : applyAction(state, chooseBotAction(state));
        buys += state.log.filter((e) => / bought /.test(e.message)).length > before ? 1 : 0;
        if (++actions > 30000) throw new Error('game did not finish');
      }
      const cards =
        state.deck.length +
        state.discardPile.length +
        state.melds.reduce((n, m) => n + m.cards.length, 0) +
        state.players.reduce((n, p) => n + p.hand.length, 0);
      expect(cards).toBe(108);
    }
    expect(buys).toBeGreaterThan(0);
  });
});
