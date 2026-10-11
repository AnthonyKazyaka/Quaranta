import { Card, parseCards } from '../cards';
import { chooseBotAction } from '../bot';
import { GameState, applyAction, canDiscard, createGame, currentPlayer, totalScores } from '../game';
import { PHASES } from '../openingConditions';

const twoPlayers = () =>
  createGame({
    seed: 42,
    players: [
      { name: 'Ada', isBot: false },
      { name: 'Bo', isBot: true },
    ],
  });

/** Replaces hands (and optionally other fields) to set up a specific scenario. */
function withHands(state: GameState, hands: string[], overrides: Partial<GameState> = {}): GameState {
  return {
    ...state,
    ...overrides,
    players: state.players.map((p, i) => ({ ...p, hand: parseCards(hands[i] ?? '') })),
  };
}

const ids = (cards: Card[]) => cards.map((c) => c.id);

describe('createGame', () => {
  it('deals 13 cards each and turns up one discard', () => {
    const state = createGame({ seed: 1, players: ['A', 'B', 'C', 'D'].map((name) => ({ name, isBot: true })) });
    expect(state.players.every((p) => p.hand.length === 13)).toBe(true);
    expect(state.discardPile).toHaveLength(1);
    expect(state.deck).toHaveLength(108 - 52 - 1);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.phaseIndex).toBe(0);
  });

  it('is deterministic for a given seed and survives a JSON round trip', () => {
    const a = twoPlayers();
    expect(twoPlayers()).toEqual(a);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });

  it('rejects too few players', () => {
    expect(() => createGame({ players: [{ name: 'Solo', isBot: false }] })).toThrow();
  });
});

describe('turns', () => {
  it('only lets the current player act', () => {
    const state = twoPlayers();
    const other = state.players.find((p) => p.id !== currentPlayer(state).id)!;
    expect(() => applyAction(state, { type: 'drawFromDeck', playerId: other.id })).toThrow(/turn/);
  });

  it('draws, discards and passes the turn', () => {
    let state = twoPlayers();
    const player = currentPlayer(state);
    state = applyAction(state, { type: 'drawFromDeck', playerId: player.id });
    expect(currentPlayer(state).hand).toHaveLength(14);
    expect(() => applyAction(state, { type: 'drawFromDeck', playerId: player.id })).toThrow();

    state = withHands(state, state.players.map(() => '2H 3D'));
    state = applyAction(state, { type: 'discard', playerId: player.id, cardId: currentPlayer(state).hand[0].id });
    expect(currentPlayer(state).id).not.toBe(player.id);
    expect(state.turnStage).toBe('draw');
  });

  it('takes the top discard', () => {
    let state = twoPlayers();
    const top = state.discardPile[0];
    state = applyAction(state, { type: 'drawFromDiscard', playerId: currentPlayer(state).id });
    expect(currentPlayer(state).hand.map((c) => c.id)).toContain(top.id);
    expect(state.discardPile).toHaveLength(0);
  });
});

describe('opening and table play', () => {
  const playStage = (hands: string[]) => {
    const base = twoPlayers();
    return withHands(base, hands, { currentPlayerIndex: 0, turnStage: 'play' });
  };

  it('opens with a high pair, then blocks further plays that turn', () => {
    let state = playStage(['KH KS 4C 5C 6C 9D', '2H']);
    const hand = state.players[0].hand;
    state = applyAction(state, { type: 'open', playerId: 'p1', melds: [ids(hand.slice(0, 2))] });
    expect(state.players[0].isOpen).toBe(true);
    expect(state.melds).toHaveLength(1);
    expect(() => applyAction(state, { type: 'layMeld', playerId: 'p1', cardIds: ids(hand.slice(2, 5)) })).toThrow(
      /turn you open/,
    );
  });

  it('rejects an opening that misses the requirement', () => {
    const state = playStage(['4H 4S 9D', '2H']);
    const hand = state.players[0].hand;
    expect(() => applyAction(state, { type: 'open', playerId: 'p1', melds: [ids(hand.slice(0, 2))] })).toThrow(
      /High Pair/,
    );
  });

  it("doesn't allow discarding high cards in High Pair until everyone has opened", () => {
    const state = playStage(['KH 4C', '2H']);
    const [king, four] = state.players[0].hand;
    expect(canDiscard(state, 'p1', king.id)).toBe(false);
    expect(canDiscard(state, 'p1', four.id)).toBe(true);
  });

  it('allows any discard when every card is blocked', () => {
    const state = playStage(['KH AS', '2H']);
    expect(canDiscard(state, 'p1', state.players[0].hand[0].id)).toBe(true);
  });

  it("doesn't allow discarding a card that plays on the table", () => {
    let state = playStage(['8H 2C', '2H']);
    state = {
      ...state,
      phaseIndex: 2,
      melds: [{ id: 'm1', ownerId: 'p2', kind: 'run', cards: parseCards('5H 6H 7H') }],
    };
    const [eight, two] = state.players[0].hand;
    expect(canDiscard(state, 'p1', eight.id)).toBe(false);
    expect(canDiscard(state, 'p1', two.id)).toBe(true);
  });

  it('adds to a meld, swaps a joker, and goes out', () => {
    const tableRun = parseCards('5H J* 7H');
    tableRun[1] = { ...tableRun[1], joker: true, represents: { suit: 'hearts', rank: 6 } } as Card;
    let state = playStage(['8H 6H', '2H']);
    state = {
      ...state,
      phaseIndex: 2,
      players: state.players.map((p, i) => (i === 0 ? { ...p, isOpen: true } : p)),
      melds: [{ id: 'm1', ownerId: 'p2', kind: 'run', cards: tableRun }],
    };
    const [eight, six] = state.players[0].hand;

    state = applyAction(state, { type: 'swapJoker', playerId: 'p1', meldId: 'm1', cardId: six.id });
    expect(state.players[0].hand.some((c) => c.joker)).toBe(true);

    state = applyAction(state, { type: 'addToMeld', playerId: 'p1', meldId: 'm1', cardIds: [eight.id] });
    const joker = state.players[0].hand[0];
    state = applyAction(state, { type: 'addToMeld', playerId: 'p1', meldId: 'm1', cardIds: [joker.id] });

    expect(state.status).toBe('roundOver');
    expect(state.results[0]).toEqual({ phaseIndex: 2, winnerId: 'p1', points: { p1: 0, p2: 2 } });
  });

  it('rotates the dealer and advances the phase for the next hand', () => {
    let state = playStage(['2C', '9H KD']);
    state = applyAction(state, { type: 'discard', playerId: 'p1', cardId: state.players[0].hand[0].id });
    expect(state.status).toBe('roundOver');
    expect(totalScores(state)).toEqual({ p1: 0, p2: 19 });

    state = applyAction(state, { type: 'nextRound' });
    expect(state.phaseIndex).toBe(1);
    expect(state.dealerIndex).toBe(1);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.players.every((p) => p.hand.length === 13 && !p.isOpen)).toBe(true);
  });
});

describe('running out of cards', () => {
  it('shuffles the discard pile into a new deck', () => {
    const base = twoPlayers();
    const state = { ...base, deck: [], discardPile: parseCards('2H 3H 4H') };
    const next = applyAction(state, { type: 'drawFromDeck', playerId: currentPlayer(state).id });
    expect(next.reshuffles).toBe(1);
    expect(next.discardPile.map((c) => c.id)).toEqual([state.discardPile[2].id]);
    expect(next.deck).toHaveLength(1);
  });

  it('ends the hand with no winner once the reshuffle limit is reached', () => {
    const base = twoPlayers();
    const state = { ...base, deck: [], reshuffles: 2 };
    const next = applyAction(state, { type: 'drawFromDeck', playerId: currentPlayer(state).id });
    expect(next.status).toBe('roundOver');
    expect(next.results[0].winnerId).toBeNull();
  });
});

describe('bots', () => {
  it.each([1, 7, 2024])('play a full four-player game to the end (seed %i)', (seed) => {
    let state = createGame({ seed, players: ['A', 'B', 'C', 'D'].map((name) => ({ name, isBot: true })) });
    let actions = 0;

    while (state.status !== 'gameOver') {
      state = state.status === 'roundOver' ? applyAction(state, { type: 'nextRound' }) : applyAction(state, chooseBotAction(state));
      if (++actions > 20000) throw new Error(`Game did not finish (phase ${state.phaseIndex})`);
    }

    expect(state.results).toHaveLength(PHASES.length);
    const cardCount =
      state.deck.length +
      state.discardPile.length +
      state.melds.reduce((n, m) => n + m.cards.length, 0) +
      state.players.reduce((n, p) => n + p.hand.length, 0);
    expect(cardCount).toBe(108);
  });
});
