import { applyAction, createGame, currentPlayer } from '@quaranta/shared';
import { migrateGame } from '@/stores/gameStore';

jest.mock('@/services/gameRepository', () => ({
  saveGame: jest.fn(() => Promise.resolve(false)),
  listRecentGames: jest.fn(() => Promise.resolve([])),
}));

/** A game as version 1 of the app saved it: before buying, own-pace mode and per-player openings. */
function savedByV1() {
  let game = createGame({
    seed: 12,
    players: [
      { id: 'human', name: 'Ada', isBot: false },
      { id: 'bot1', name: 'Bianca', isBot: true },
    ],
  });
  game = applyAction(game, { type: 'drawFromDeck', playerId: currentPlayer(game).id });
  const {
    mode: _mode,
    discardBuyable: _discardBuyable,
    buyOffer: _buyOffer,
    ...rest
  } = JSON.parse(JSON.stringify(game)) as Record<string, unknown> & { players: Record<string, unknown>[]; results: unknown[] };
  void _mode;
  void _discardBuyable;
  void _buyOffer;
  return {
    ...rest,
    players: rest.players.map(({ phaseIndex: _p, ...player }) => player),
    results: [{ phaseIndex: 0, winnerId: 'human', points: { human: 0, bot1: 20 } }],
  } as never;
}

describe('migrateGame', () => {
  it('fills in everything buying and own-pace mode need', () => {
    const migrated = migrateGame(savedByV1(), 1);
    expect(migrated.mode).toBe('classic');
    expect(migrated.buyOffer).toBeNull();
    expect(migrated.discardBuyable).toBe(false);
    expect(migrated.players.every((p) => p.phaseIndex === migrated.phaseIndex)).toBe(true);
    expect(migrated.results[0]).toMatchObject({ phases: { human: 0, bot1: 0 }, opened: [] });
  });

  it('gives a migrated game a version and reshuffle count when it predates both', () => {
    const old = savedByV1() as unknown as Record<string, unknown>;
    delete old.version;
    delete old.reshuffles;
    const migrated = migrateGame(old as never, 0);
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
    const game = createGame({ seed: 3, players: [{ name: 'A', isBot: false }, { name: 'B', isBot: true }] });
    expect(migrateGame(game, 2)).toEqual(game);
  });
});
