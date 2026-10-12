import { chooseBotAction, chooseBotBuy } from '../bot';
import { parseCard, parseCards } from '../cards';
import { GameState, applyAction, buyableCard, canBuy, createGame, currentPlayer } from '../game';
import { PHASES } from '../openingConditions';

const threePlayers = () =>
  createGame({
    seed: 7,
    players: ['Ada', 'Bo', 'Cy'].map((name) => ({ name, isBot: true })),
  });

/** Player p1 to draw, with the given hands and a discard pile whose last card is on top. */
function scenario(hands: string[], discards = '9C 7H', overrides: Partial<GameState> = {}): GameState {
  const base = threePlayers();
  return {
    ...base,
    currentPlayerIndex: 0,
    turnStage: 'draw',
    discardPile: parseCards(discards),
    firstDiscardId: null,
    players: base.players.map((p, i) => ({ ...p, hand: parseCards(hands[i] ?? '') })),
    ...overrides,
  };
}

const draw = (state: GameState) => applyAction(state, { type: 'drawFromDeck', playerId: currentPlayer(state).id });
const buy = (state: GameState, playerId: string) => applyAction(state, { type: 'buy', playerId });
const discardFirst = (state: GameState) =>
  applyAction(state, { type: 'discard', playerId: currentPlayer(state).id, cardId: currentPlayer(state).hand[0].id });
const handIds = (state: GameState, index: number) => state.players[index].hand.map((c) => c.id);

describe('buy window', () => {
  it('opens on the top discard when the current player draws from the deck', () => {
    const state = scenario(['2C 3D', '4S', '5S']);
    expect(buyableCard(state)).toBeNull();
    const next = draw(state);
    expect(buyableCard(next)?.id).toBe(state.discardPile[1].id);
    expect(canBuy(next, 'p2')).toBe(true);
    expect(canBuy(next, 'p1')).toBe(false);
  });

  it("doesn't open when the current player takes the discard", () => {
    const state = scenario(['2C 3D', '4S', '5S']);
    const next = applyAction(state, { type: 'drawFromDiscard', playerId: 'p1' });
    expect(next.buyWindow).toBeNull();
    expect(() => buy(next, 'p2')).toThrow(/no card to buy/);
  });

  it("doesn't offer the card turned up at the deal", () => {
    const dealt = threePlayers();
    expect(dealt.firstDiscardId).toBe(dealt.discardPile[0].id);
    const next = draw(dealt);
    expect(next.buyWindow).toBeNull();
    // Once someone discards over it, the mark is gone, so it can be bought if it ever comes back up.
    expect(discardFirst(next).firstDiscardId).toBeNull();
  });

  it('protects the turned-up card in every hand, not just the first', () => {
    let state = discardFirst(scenario(['2C', '4S', '5S'], '9C 7H', { turnStage: 'play' }));
    expect(state.status).toBe('roundOver');
    state = applyAction(state, { type: 'nextRound' });
    expect(state.firstDiscardId).toBe(state.discardPile[0].id);
    expect(draw(state).buyWindow).toBeNull();
  });

  it("doesn't offer a joker", () => {
    const next = draw(scenario(['2C 3D', '4S', '5S'], '9C J*'));
    expect(next.buyWindow).toBeNull();
  });

  it("can't be used by the current player, or twice by the same player", () => {
    const next = buy(draw(scenario(['2C 3D', '4S', '5S'])), 'p2');
    expect(() => buy(next, 'p1')).toThrow(/own turn/);
    expect(() => buy(next, 'p2')).toThrow(/already asked/);
  });

  it('lets anyone buy, open or not', () => {
    const base = scenario(['2C 3D', '4S', '5S']);
    const state = { ...base, players: base.players.map((p, i) => ({ ...p, isOpen: i === 2 })) };
    expect(() => buy(buy(draw(state), 'p2'), 'p3')).not.toThrow();
  });
});

describe('settling a buy', () => {
  it('gives the card to the buyer when the current player discards', () => {
    let state = draw(scenario(['2C 3D', '4S', '5S']));
    const card = buyableCard(state)!;
    state = buy(state, 'p3');
    expect(handIds(state, 2)).not.toContain(card.id);

    state = discardFirst(state);
    expect(handIds(state, 2)).toContain(card.id);
    expect(state.players[2].hand).toHaveLength(2);
    // Only the bought card: no penalty draw.
    expect(state.discardPile.map((c) => c.id)).not.toContain(card.id);
    expect(state.discardPile).toHaveLength(2);
    expect(state.buyWindow).toBeNull();
    expect(state.log.map((e) => e.message)).toContain('Cy bought 7♥ for 10¢.');
  });

  it('gives priority by turn order, not by who asked first', () => {
    let state = draw(scenario(['2C 3D', '4S', '5S']));
    const card = buyableCard(state)!;
    state = buy(buy(state, 'p3'), 'p2');
    state = discardFirst(state);
    expect(handIds(state, 1)).toContain(card.id);
    expect(handIds(state, 2)).not.toContain(card.id);
  });

  it('counts turn order from the current player, wrapping around the table', () => {
    let state = draw(scenario(['4S', '5S', '2C 3D'], '9C 7H', { currentPlayerIndex: 2 }));
    const card = buyableCard(state)!;
    state = buy(buy(state, 'p2'), 'p1');
    state = discardFirst(state);
    expect(handIds(state, 0)).toContain(card.id);
  });

  it('closes with nothing changing hands when nobody asks', () => {
    let state = draw(scenario(['2C 3D', '4S', '5S']));
    state = discardFirst(state);
    expect(state.buyWindow).toBeNull();
    expect(state.players[1].hand).toHaveLength(1);
    expect(state.discardPile).toHaveLength(3);
  });

  it('leaves the buyer holding the card when the current player goes out', () => {
    let state = draw(scenario(['2C', '4S', '5S']));
    // p1 holds 2C plus the drawn card; make the drawn card the only one so the discard goes out.
    state = { ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, hand: [parseCard('2C')] } : p)) };
    state = buy(state, 'p2');
    state = discardFirst(state);
    expect(state.status).toBe('roundOver');
    // 4 in hand plus the bought 7.
    expect(state.results[0].points.p2).toBe(11);
  });

  it('may follow a reshuffle that empties the deck', () => {
    let state = scenario(['2C 3D', '4S', '5S'], '9C 7H', { deck: [] });
    state = draw(state);
    expect(state.reshuffles).toBe(1);
    expect(state.deck).toHaveLength(0);
    const card = buyableCard(state)!;
    expect(card.id).toBe(state.discardPile[0].id);

    state = discardFirst(buy(state, 'p2'));
    expect(handIds(state, 1)).toContain(card.id);
    expect(state.discardPile).toHaveLength(1);
  });
});

describe('bot buying', () => {
  it('buys a card that completes its opening', () => {
    const state = draw(scenario(['2C 3D', 'KS 4D 9C', '5S'], '9C KH'));
    expect(chooseBotBuy(state, 'p2')).toBe(true);
  });

  it("passes on a card that doesn't help", () => {
    const state = draw(scenario(['2C 3D', 'KS 4D 9C', '5S 6D'], '9C 8H'));
    expect(chooseBotBuy(state, 'p3')).toBe(false);
  });

  it('never buys on its own turn or with no window open', () => {
    const state = scenario(['2C 3D', 'KS 4D', '5S'], '9C KH');
    expect(chooseBotBuy(state, 'p2')).toBe(false);
    expect(chooseBotBuy(draw(state), 'p1')).toBe(false);
  });

  it('stops building toward its opening when an opponent is about to go out', () => {
    const base = scenario(['2C 3D', '4D 4S 9C', '5S'], '9C 4H');
    const state = draw({ ...base, phaseIndex: 2, players: base.players.map((p, i) => ({ ...p, phaseIndex: 2, isOpen: i === 2 })) });
    // 4H would make three of a kind, which still gets bought.
    expect(chooseBotBuy(state, 'p2')).toBe(true);

    const pairOnly = draw({ ...base, phaseIndex: 2, discardPile: parseCards('9C 9H'), players: base.players.map((p, i) => ({ ...p, phaseIndex: 2, isOpen: i === 2 })) });
    expect(chooseBotBuy(pairOnly, 'p2')).toBe(false);
  });

  it.each([3, 11, 99])('play full games with buying (seed %i)', (seed) => {
    let state = createGame({ seed, players: ['A', 'B', 'C', 'D'].map((name) => ({ name, isBot: true })) });
    let actions = 0;
    let buys = 0;

    while (state.status !== 'gameOver') {
      if (state.status === 'roundOver') {
        state = applyAction(state, { type: 'nextRound' });
        continue;
      }
      state = applyAction(state, chooseBotAction(state));
      for (const player of state.players) {
        if (chooseBotBuy(state, player.id)) {
          state = buy(state, player.id);
          buys++;
        }
      }
      if (++actions > 20000) throw new Error(`Game did not finish (phase ${state.phaseIndex})`);
    }

    expect(state.results).toHaveLength(PHASES.length);
    expect(buys).toBeGreaterThan(0);
    const cardCount =
      state.deck.length +
      state.discardPile.length +
      state.melds.reduce((n, m) => n + m.cards.length, 0) +
      state.players.reduce((n, p) => n + p.hand.length, 0);
    expect(cardCount).toBe(108);
  });
});
