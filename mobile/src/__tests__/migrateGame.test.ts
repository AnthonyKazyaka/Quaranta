import { GameState, applyAction, createGame, currentPlayer } from '@quaranta/shared';
import { migrateGame } from '@/stores/gameStore';

jest.mock('@/services/gameRepository', () => ({
  saveGame: jest.fn(() => Promise.resolve(false)),
  listRecentGames: jest.fn(() => Promise.resolve([])),
}));

type Loose = Record<string, unknown> & { players: Record<string, unknown>[]; results: Record<string, unknown>[] };

/** A current game, round-tripped through JSON like a saved one. */
function currentGame(): GameState {
  let game = createGame({
    seed: 12,
    players: [
      { id: 'human', name: 'Ada', isBot: false },
      { id: 'bot1', name: 'Bianca', isBot: true },
    ],
  });
  game = applyAction(game, { type: 'drawFromDeck', playerId: currentPlayer(game).id });
  return JSON.parse(JSON.stringify(game)) as GameState;
}

/** The same game as the app saved it before own-pace mode (version 2): no mode, per-player openings or hand details. */
function savedByV2(): GameState {
  const game = currentGame() as unknown as Loose;
  delete game.mode;
  game.players = game.players.map((player) => {
    const { phaseIndex: _phaseIndex, ...rest } = player;
    void _phaseIndex;
    return rest;
  });
  game.results = [{ phaseIndex: 0, winnerId: 'human', points: { human: 0, bot1: 20 }, pot: 50 }];
  return game as unknown as GameState;
}

/** And before buying and stakes (version 1). */
function savedByV1(): GameState {
  const game = savedByV2() as unknown as Loose;
  for (const key of ['buyWindow', 'firstDiscardId', 'pot', 'purses']) delete game[key];
  game.results = [{ phaseIndex: 0, winnerId: 'human', points: { human: 0, bot1: 20 } }];
  return game as unknown as GameState;
}

describe('migrateGame', () => {
  it('adds own-pace mode and per-player openings to a version 2 game', () => {
    const migrated = migrateGame(savedByV2(), 2);
    expect(migrated.mode).toBe('classic');
    expect(migrated.players.every((p) => p.phaseIndex === migrated.phaseIndex)).toBe(true);
    expect(migrated.results[0]).toMatchObject({ phases: { human: 0, bot1: 0 }, opened: [], pot: 50 });
  });

  it('adds buying and stakes too when the game is older still', () => {
    const migrated = migrateGame(savedByV1(), 1);
    expect(migrated.buyWindow).toBeNull();
    expect(migrated.pot).toBe(0);
    expect(migrated.purses).toEqual({ human: 0, bot1: 0 });
    expect(migrated.mode).toBe('classic');
    expect(migrated.results[0]).toMatchObject({ pot: 0, phases: { human: 0, bot1: 0 } });
  });

  it('gives a migrated game a version and reshuffle count when it predates both', () => {
    const old = savedByV1() as unknown as Record<string, unknown>;
    delete old.version;
    delete old.reshuffles;
    const migrated = migrateGame(old as unknown as GameState, 0);
    expect(migrated.version).toBe(0);
    expect(migrated.reshuffles).toBe(0);
    expect(migrated.mode).toBe('classic');
  });

  it('lets the migrated game carry on being played', () => {
    const migrated = migrateGame(savedByV1(), 1);
    const player = currentPlayer(migrated);
    const hand = player.hand;
    const next = applyAction(migrated, { type: 'discard', playerId: player.id, cardId: hand[hand.length - 1].id });
    expect(next.version).toBe(migrated.version + 1);
  });

  it('leaves a current game untouched', () => {
    const game = currentGame();
    expect(migrateGame(game, 3)).toEqual(game);
  });
});
