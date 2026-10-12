import { MockOnlineService, setOnlineService } from '@/services/online';
import { useAccountStore } from '../accountStore';
import { isWaitingOnMe, useOnlineStore } from '../onlineStore';
import { useToastStore } from '../toastStore';

const LATENCY = 100;
const store = () => useOnlineStore.getState();
const advance = (ms: number) => jest.advanceTimersByTimeAsync(ms);

let service: MockOnlineService;

beforeEach(() => {
  jest.useFakeTimers();
  let seed = 11;
  service = new MockOnlineService({
    latencyMs: LATENCY,
    botDelayMs: 300,
    thinkMs: [500, 500],
    friendJoinMs: [1000],
    hostStartMs: 2000,
    random: () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    },
  });
  setOnlineService(service);
  store().closeTable();
  useToastStore.setState({ toasts: [] });
  useAccountStore.setState({ turnAlerts: true });
});

afterEach(() => {
  store().closeTable();
  setOnlineService(null);
  jest.useRealTimers();
});

/** Creates a two-seat table, starts it, and waits for the first deal to reach the store. */
async function startTwoSeatGame() {
  const created = store().createTable('Ada', { seatCount: 2, mode: 'classic', turnSeconds: 60, fillWithBots: true });
  await advance(LATENCY);
  const gameId = (await created)!;
  const started = store().startGame();
  await advance(LATENCY * 2);
  await started;
  await advance(LATENCY * 2);
  return gameId;
}

async function untilMyTurn() {
  for (let i = 0; i < 300 && !isWaitingOnMe(store().view); i++) await advance(100);
  expect(isWaitingOnMe(store().view)).toBe(true);
}

describe('onlineStore', () => {
  it('creates a table and follows it', async () => {
    const created = store().createTable('Ada', { seatCount: 3, mode: 'paced', turnSeconds: 30, fillWithBots: true });
    await advance(LATENCY);
    const gameId = await created;

    expect(gameId).not.toBeNull();
    expect(store().gameId).toBe(gameId);
    expect(store().table?.status).toBe('lobby');
    expect(store().table?.settings).toMatchObject({ mode: 'paced', seatCount: 3 });
    expect(store().view).toBeNull();
  });

  it('reports why a join failed', async () => {
    const joined = store().joinTable('nope', 'Ada');
    await advance(LATENCY);
    expect(await joined).toBeNull();
    expect(store().lobbyError).toMatch(/No table with that code/);
    expect(store().gameId).toBeNull();
  });

  it('moves from the lobby to the game when the host starts', async () => {
    await startTwoSeatGame();
    expect(store().table?.status).toBe('playing');
    expect(store().view?.hand).toHaveLength(13);
    expect(store().connection).toBe('online');
  });

  it('sends moves to the server and marks them pending until they are confirmed', async () => {
    await startTwoSeatGame();
    await untilMyTurn();
    const handBefore = store().view!.hand.length;

    store().drawFromDeck();
    expect(store().pending).toBe(true);
    await advance(LATENCY * 2);
    expect(store().pending).toBe(false);
    expect(store().view!.hand).toHaveLength(handBefore + 1);
  });

  it('shows the server’s reason when a move is rejected', async () => {
    await startTwoSeatGame();
    await untilMyTurn();

    store().toggleCard(store().view!.hand[0].id);
    store().discardSelection();
    await advance(LATENCY * 2);
    expect(store().message).toEqual({ text: 'Draw a card first.', tone: 'error' });
    expect(store().pending).toBe(false);
  });

  it('drops a selection once the cards leave the hand', async () => {
    await startTwoSeatGame();
    await untilMyTurn();
    store().drawFromDeck();
    await advance(LATENCY * 2);

    const card = store().view!.hand.find((c) => !c.joker)!;
    store().toggleCard(card.id);
    expect(store().selectedIds).toEqual([card.id]);
    store().discardSelection();
    await advance(LATENCY * 2);
    expect(store().selectedIds).toEqual([]);
  });

  it('tracks the connection and recovers when it returns', async () => {
    await startTwoSeatGame();
    service.debug.setOnline(false);
    expect(store().connection).toBe('offline');
    service.debug.setOnline(true);
    expect(store().connection).toBe('online');
  });

  it('nudges the player when it becomes their turn and they are looking elsewhere', async () => {
    await startTwoSeatGame();
    store().setViewing(false);
    // The bot moves first; wait for the turn to come around to us.
    await untilMyTurn();
    expect(useToastStore.getState().toasts.some((t) => /your turn/i.test(t.text))).toBe(true);
  });

  it('stays quiet when the player is watching the table, or has turned alerts off', async () => {
    await startTwoSeatGame();
    store().setViewing(true);
    await untilMyTurn();
    expect(useToastStore.getState().toasts).toHaveLength(0);

    useAccountStore.setState({ turnAlerts: false });
    store().setViewing(false);
    store().drawFromDeck();
    await advance(LATENCY * 2);
    store().toggleCard(store().view!.hand.find((c) => !c.joker)!.id);
    store().discardSelection();
    await advance(LATENCY * 2);
    await untilMyTurn();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('fails the screen when the table is closed', async () => {
    const created = store().createTable('Ada', { seatCount: 2, mode: 'classic', turnSeconds: 60, fillWithBots: true });
    await advance(LATENCY);
    await created;
    const leaving = service.leaveTable(store().gameId!);
    await advance(LATENCY * 2);
    await leaving;
    await advance(LATENCY);
    expect(store().failure).toMatch(/closed/);
  });

  it('lists the player’s tables', async () => {
    const created = store().createTable('Ada', { seatCount: 2, mode: 'classic', turnSeconds: 60, fillWithBots: true });
    await advance(LATENCY);
    await created;
    const listing = store().refreshMyTables();
    await advance(LATENCY);
    await listing;
    expect(store().myTables.map((t) => t.gameId)).toEqual([store().gameId]);
  });
});
