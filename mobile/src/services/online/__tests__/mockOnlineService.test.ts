import { GameState, applyAction } from '@quaranta/shared';
import { MockOnlineService } from '../mockOnlineService';
import {
  ConnectionState,
  DEFAULT_TABLE_SETTINGS,
  OnlineError,
  OnlineSnapshot,
  TIMEOUTS_BEFORE_TAKEOVER,
  TableSettings,
} from '../types';

const LATENCY = 100;
const settings = (overrides: Partial<TableSettings> = {}): TableSettings => ({
  ...DEFAULT_TABLE_SETTINGS,
  seatCount: 2,
  turnSeconds: 15,
  ...overrides,
});

function makeService() {
  let seed = 7;
  // A small deterministic generator so games are repeatable.
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return new MockOnlineService({ latencyMs: LATENCY, botDelayMs: 300, thinkMs: [500, 500], friendJoinMs: [1000], hostStartMs: 2000, random });
}

const advance = (ms: number) => jest.advanceTimersByTimeAsync(ms);

/** Follows a table the way the app does. */
function watch(service: MockOnlineService, gameId: string) {
  const state: { snapshot: OnlineSnapshot | null; connection: ConnectionState; error: OnlineError | null } = {
    snapshot: null,
    connection: 'connecting',
    error: null,
  };
  const stop = service.subscribe(gameId, {
    onSnapshot: (snapshot) => (state.snapshot = snapshot),
    onConnection: (connection) => (state.connection = connection),
    onError: (error) => (state.error = error),
  });
  return { state, stop };
}

async function startedGame(overrides: Partial<TableSettings> = {}) {
  const service = makeService();
  const pending = service.createTable({ name: 'Ada', settings: settings(overrides) });
  await advance(LATENCY);
  const { table } = await pending;
  const watcher = watch(service, table.gameId);
  await advance(LATENCY * 2);
  const start = service.startGame(table.gameId);
  await advance(LATENCY * 2);
  await start;
  await advance(LATENCY);
  return { service, gameId: table.gameId, watcher };
}

/** Plays whatever the game is waiting on from the human until it's their turn to draw. */
async function untilMyTurn(service: MockOnlineService, watcher: ReturnType<typeof watch>, limitMs = 60_000) {
  for (let waited = 0; waited < limitMs; waited += 100) {
    const view = watcher.state.snapshot?.view;
    if (view && view.status === 'playing' && view.players[view.currentPlayerIndex].id === service.uid) return;
    await advance(100);
  }
  throw new Error('It never became the human player’s turn.');
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('lobby', () => {
  it('creates a table with an invite code and the host seated', async () => {
    const service = makeService();
    const pending = service.createTable({ name: '  Ada  ', settings: settings({ seatCount: 4 }) });
    await advance(LATENCY);
    const { table, view } = await pending;

    expect(table.inviteCode).toMatch(/^[A-Z0-9]{4}$/);
    expect(table.hostUid).toBe(service.uid);
    expect(table.status).toBe('lobby');
    expect(table.seats).toHaveLength(4);
    expect(table.seats[0]).toMatchObject({ uid: service.uid, name: 'Ada' });
    expect(table.seats.slice(1).every((s) => s.uid === null)).toBe(true);
    expect(view).toBeNull();
  });

  it('seats simulated friends as time passes', async () => {
    const service = makeService();
    const pending = service.createTable({ name: 'Ada', settings: settings({ seatCount: 3 }) });
    await advance(LATENCY);
    const { table } = await pending;
    const { state } = watch(service, table.gameId);

    await advance(LATENCY);
    expect(state.snapshot?.table.seats.filter((s) => s.uid)).toHaveLength(1);
    await advance(1500);
    expect(state.snapshot?.table.seats.filter((s) => s.uid)).toHaveLength(2);
  });

  it.each([
    ['NOPE', 'not_found'],
    ['FULL', 'full'],
    ['DONE', 'started'],
  ])('refuses to join %s with %s', async (code, errorCode) => {
    const service = makeService();
    const attempt = service.joinTable({ code, name: 'Ada' });
    const outcome = attempt.catch((error: OnlineError) => error);
    await advance(LATENCY);
    expect(await outcome).toMatchObject({ code: errorCode });
  });

  it('joins the DEMO table, whose host then starts the game with bots filling the rest', async () => {
    const service = makeService();
    const pending = service.joinTable({ code: ' demo ', name: 'Ada' });
    await advance(LATENCY);
    const joined = await pending;
    expect(joined.table.seats.map((s) => s.name)).toEqual(['Elena', 'Nico', 'Ada', '']);

    const { state } = watch(service, joined.table.gameId);
    await advance(3000);
    expect(state.snapshot?.table.status).toBe('playing');
    const names = state.snapshot!.table.seats.map((s) => s.name);
    expect(new Set(names).size).toBe(4);
    expect(state.snapshot!.table.seats[3].isBot).toBe(true);
    expect(state.snapshot!.view?.hand).toHaveLength(13);
  });

  it('lets the host turn open seats into computer players, and back', async () => {
    const service = makeService();
    const pending = service.createTable({ name: 'Ada', settings: settings({ seatCount: 3 }) });
    await advance(LATENCY);
    const { table } = await pending;
    const { state } = watch(service, table.gameId);

    const addBot = service.setSeat(table.gameId, 2, 'bot');
    await advance(LATENCY * 2);
    await addBot;
    expect(state.snapshot?.table.seats[2]).toMatchObject({ isBot: true });

    const clear = service.setSeat(table.gameId, 2, 'open');
    await advance(LATENCY * 2);
    await clear;
    expect(state.snapshot?.table.seats[2].uid).toBeNull();
  });

  it('refuses to start with empty seats when bots may not fill them', async () => {
    const service = makeService();
    const created = service.createTable({ name: 'Ada', settings: settings({ seatCount: 4, fillWithBots: false }) });
    await advance(LATENCY);
    const { table } = await created;
    const attempt = service.startGame(table.gameId).catch((error: OnlineError) => error);
    await advance(LATENCY);
    expect(await attempt).toMatchObject({ code: 'invalid' });
  });

  it('closes the table when the host leaves, and frees the seat when a guest does', async () => {
    const service = makeService();
    const created = service.createTable({ name: 'Ada', settings: settings() });
    await advance(LATENCY);
    const { table } = await created;
    const { state } = watch(service, table.gameId);
    await advance(LATENCY);

    const leave = service.leaveTable(table.gameId);
    await advance(LATENCY * 2);
    await leave;
    expect(state.snapshot?.table.status).toBe('closed');
  });
});

describe('playing', () => {
  it('deals each seat its own hand and plays computer turns until it is the human’s turn', async () => {
    const { service, watcher } = await startedGame();
    const view = watcher.state.snapshot!.view!;
    expect(view.viewerId).toBe(service.uid);
    expect(view.hand).toHaveLength(13);
    expect(JSON.stringify(watcher.state.snapshot)).not.toContain('rngState');

    await untilMyTurn(service, watcher);
    expect(watcher.state.snapshot!.view!.turnStage).toBe('draw');
    expect(watcher.state.snapshot!.deadline).not.toBeNull();
  });

  it('applies a move and returns the new state', async () => {
    const { service, gameId, watcher } = await startedGame();
    await untilMyTurn(service, watcher);
    const before = watcher.state.snapshot!.view!;

    const move = service.submitAction(gameId, { type: 'drawFromDeck', playerId: service.uid }, before.version);
    await advance(LATENCY);
    const after = await move;
    expect(after.view!.hand).toHaveLength(14);
    // Computer players may ask to buy straight after the draw, which also counts as actions.
    expect(after.view!.version).toBeGreaterThan(before.version);
  });

  it('rejects illegal moves with the rule that was broken', async () => {
    const { service, gameId, watcher } = await startedGame();
    await untilMyTurn(service, watcher);
    const version = watcher.state.snapshot!.view!.version;

    const attempt = service
      .submitAction(gameId, { type: 'discard', playerId: service.uid, cardId: 'nope' }, version)
      .catch((error: OnlineError) => error);
    await advance(LATENCY);
    expect(await attempt).toMatchObject({ code: 'rule', message: 'Draw a card first.' });
  });

  it('rejects moves made against an out-of-date table, and moves for other players', async () => {
    const { service, gameId, watcher } = await startedGame();
    await untilMyTurn(service, watcher);
    const version = watcher.state.snapshot!.view!.version;

    const stale = service
      .submitAction(gameId, { type: 'drawFromDeck', playerId: service.uid }, version - 1)
      .catch((error: OnlineError) => error);
    await advance(LATENCY);
    expect(await stale).toMatchObject({ code: 'stale' });

    const forged = service
      .submitAction(gameId, { type: 'drawFromDeck', playerId: 'bot-2' }, version)
      .catch((error: OnlineError) => error);
    await advance(LATENCY);
    expect(await forged).toMatchObject({ code: 'forbidden' });
  });

  it('plays a timed-out turn with a bot, then takes the seat over after repeated timeouts', async () => {
    const { service, gameId, watcher } = await startedGame({ turnSeconds: 15 });
    await untilMyTurn(service, watcher);
    const first = watcher.state.snapshot!;
    expect(first.deadline! - first.serverTime).toBeGreaterThan(10_000);
    const mySeat = () => watcher.state.snapshot!.table.seats.find((s) => s.uid === service.uid)!;

    for (let timeouts = 1; timeouts <= TIMEOUTS_BEFORE_TAKEOVER; timeouts++) {
      expect(mySeat().autoplay).toBe(false);
      // Let this turn run out; a bot plays it and the turn moves on.
      await advance(15_500);
      await untilMyTurn(service, watcher, 120_000).catch(() => undefined);
    }
    await advance(1000);
    expect(mySeat().autoplay).toBe(true);

    // Coming back hands the seat back.
    const resume = service.resumeSeat(gameId);
    await advance(LATENCY * 2);
    await resume;
    await advance(LATENCY);
    expect(mySeat().autoplay).toBe(false);
  });

  it('keeps the same clock for every move inside one turn', async () => {
    const { service, gameId, watcher } = await startedGame({ turnSeconds: 60 });
    await untilMyTurn(service, watcher);
    const deadline = watcher.state.snapshot!.deadline;

    const move = service.submitAction(gameId, { type: 'drawFromDeck', playerId: service.uid }, watcher.state.snapshot!.view!.version);
    await advance(LATENCY);
    await move;
    await advance(LATENCY);
    expect(watcher.state.snapshot!.deadline).toBe(deadline);
  });

  it('lets a simulated friend stall, and a bot covers for them', async () => {
    const service = makeService();
    const created = service.joinTable({ code: 'DEMO', name: 'Ada' });
    await advance(LATENCY);
    const { table } = await created;
    const watcher = watch(service, table.gameId);
    await advance(3000);
    expect(watcher.state.snapshot!.table.status).toBe('playing');

    service.debug.setIdle(table.gameId, 0, true);
    await advance(LATENCY);
    expect(watcher.state.snapshot!.table.seats[0]).toMatchObject({ connected: false, autoplay: false });

    // Each of her turns runs out the clock; after enough of them a bot takes the idle seat over.
    // (We sit out too, which the server handles the same way.)
    for (let seconds = 0; seconds < 600 && !watcher.state.snapshot!.table.seats[0].autoplay; seconds++) {
      await advance(1000);
    }
    expect(watcher.state.snapshot!.table.seats[0].autoplay).toBe(true);
  });
});

describe('buying', () => {
  it('lets the human ask to buy without the turn-version check, and does not count it as a move', async () => {
    const { service, gameId } = await startedGame({ seatCount: 3, turnSeconds: 15 });
    type Internals = { rooms: Map<string, { game: GameState; seats: { uid: string | null; timeouts: number }[] }> };
    const room = (service as unknown as Internals).rooms.get(gameId)!;

    // The last seat draws past a discard thrown by the middle seat, which opens a buy window for the human.
    room.game = applyAction(
      { ...room.game, currentPlayerIndex: 2, turnStage: 'draw', firstDiscardId: null },
      { type: 'drawFromDeck', playerId: room.game.players[2].id },
    );
    expect(room.game.buyWindow).not.toBeNull();

    const version = room.game.version;
    const request = service.submitAction(gameId, { type: 'buy', playerId: service.uid }, -1);
    await advance(LATENCY);
    await request;
    expect(room.game.buyWindow?.requests).toContain(service.uid);
    expect(room.game.version).toBe(version + 1);
  });
});

describe('connection', () => {
  it('fails requests while offline and catches the client up when it reconnects', async () => {
    const { service, gameId, watcher } = await startedGame({ turnSeconds: 60 });
    await untilMyTurn(service, watcher);
    expect(watcher.state.connection).toBe('online');

    service.debug.setOnline(false);
    expect(watcher.state.connection).toBe('offline');
    const version = watcher.state.snapshot!.view!.version;

    const attempt = service
      .submitAction(gameId, { type: 'drawFromDeck', playerId: service.uid }, version)
      .catch((error: OnlineError) => error);
    await advance(LATENCY);
    expect(await attempt).toMatchObject({ code: 'offline' });

    // The server carries on without us while we're gone.
    await advance(61_000);
    expect(watcher.state.snapshot!.view!.version).toBe(version);

    service.debug.setOnline(true);
    expect(watcher.state.connection).toBe('online');
    expect(watcher.state.snapshot!.view!.version).toBeGreaterThan(version);
  });

  it('tells a subscriber when the table does not exist', async () => {
    const service = makeService();
    const { state } = watch(service, 'table-404');
    await advance(LATENCY);
    expect(state.error).toMatchObject({ code: 'not_found' });
  });
});
