import {
  GameAction,
  GameRuleError,
  GameState,
  applyAction,
  canBuy,
  chooseBotAction,
  chooseBotBuy,
  createGame,
  currentPlayer,
  getPlayerView,
  safeBotAction,
} from '@quaranta/shared';
import { BOT_NAMES } from '@/botNames';
import {
  MAX_TABLE_SEATS,
  MIN_TABLE_SEATS,
  OnlineError,
  OnlineService,
  OnlineSnapshot,
  TIMEOUTS_BEFORE_TAKEOVER,
  TableInfo,
  TableSeat,
  TableSettings,
  TableSubscription,
} from './types';

const FRIEND_NAMES = ['Elena', 'Nico', 'Priya', 'Tom', 'Aiko', 'Sam'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Longest a server-side turn can run, as a guard against a bot that never ends its turn. */
const MAX_ACTIONS_PER_AUTOPLAYED_TURN = 80;

export interface MockOptions {
  /** The signed-in player's id. */
  uid?: string;
  /** Simulated network round trip, in ms. */
  latencyMs?: number;
  /** Pause before a computer player moves. */
  botDelayMs?: number;
  /** How long simulated friends take over each move, [min, max] in ms. */
  thinkMs?: [number, number];
  /** When simulated friends join a table you create, in ms after it opens. */
  friendJoinMs?: number[];
  /** How long a simulated host waits after you join before starting the game. */
  hostStartMs?: number;
  /** Adds tables to join: DEMO (joins a game), FULL and DONE (the error cases). */
  seedDemoRooms?: boolean;
  now?: () => number;
  random?: () => number;
}

/** A seat plus what only the server knows. */
interface SeatState extends TableSeat {
  /** A simulated friend on another device. */
  sim: boolean;
  /** The simulated friend has stopped responding. */
  idle: boolean;
  timeouts: number;
}

interface Room {
  id: string;
  code: string;
  hostUid: string;
  status: TableInfo['status'];
  settings: TableSettings;
  seats: SeatState[];
  game: GameState | null;
  /** The simulated host starts the game on its own after you join. */
  simHost: boolean;
  deadline: number | null;
  deadlineKey: string | null;
  deadlineTimer?: ReturnType<typeof setTimeout>;
  botTimer?: ReturnType<typeof setTimeout>;
  simTimer?: ReturnType<typeof setTimeout>;
  timers: Set<ReturnType<typeof setTimeout>>;
}

/** Controls for the demo panel; not part of the real service. */
export interface MockDebugControls {
  isOnline: () => boolean;
  setOnline: (online: boolean) => void;
  /** Makes a simulated friend stop responding (or start again). */
  setIdle: (gameId: string, seatIndex: number, idle: boolean) => void;
  /** The simulated friends at a table, for the demo panel. */
  friends: (gameId: string) => { seatIndex: number; name: string; idle: boolean }[];
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const openSeat = (): SeatState => ({
  uid: null,
  name: '',
  isBot: false,
  connected: false,
  autoplay: false,
  left: false,
  sim: false,
  idle: false,
  timeouts: 0,
});

/**
 * An in-memory stand-in for the multiplayer backend. It runs the same engine the real server will
 * (`applyAction`, `getPlayerView`) and simulates the parts the app has to cope with: network
 * latency, other people joining and playing, turn timers and bot takeover, and dropped connections.
 */
export class MockOnlineService implements OnlineService {
  readonly isMock = true;
  readonly uid: string;
  readonly debug: MockDebugControls;

  private readonly options: Required<MockOptions>;
  private readonly rooms = new Map<string, Room>();
  private readonly subscribers = new Map<string, Set<TableSubscription>>();
  private online = true;
  private nextRoomNumber = 1;

  constructor(options: MockOptions = {}) {
    this.options = {
      uid: 'you',
      latencyMs: 250,
      botDelayMs: 700,
      thinkMs: [1200, 2800],
      friendJoinMs: [2000, 4500],
      hostStartMs: 6000,
      seedDemoRooms: true,
      now: Date.now,
      random: Math.random,
      ...options,
    };
    this.uid = this.options.uid;
    this.debug = {
      isOnline: () => this.online,
      setOnline: (online) => this.setOnline(online),
      setIdle: (gameId, seatIndex, idle) => this.setIdle(gameId, seatIndex, idle),
      friends: (gameId) =>
        (this.rooms.get(gameId)?.seats ?? []).flatMap((seat, seatIndex) =>
          seat.sim && !seat.left ? [{ seatIndex, name: seat.name, idle: seat.idle }] : [],
        ),
    };
    if (this.options.seedDemoRooms) this.seedRooms();
  }

  // -------------------------------------------------------------------------
  // OnlineService
  // -------------------------------------------------------------------------

  createTable({ name, settings }: { name: string; settings: TableSettings }): Promise<OnlineSnapshot> {
    return this.roundTrip(() => {
      if (settings.seatCount < MIN_TABLE_SEATS || settings.seatCount > MAX_TABLE_SEATS) {
        throw new OnlineError('invalid', `A table seats ${MIN_TABLE_SEATS} to ${MAX_TABLE_SEATS} players.`);
      }
      const room = this.newRoom(this.uid, settings);
      room.seats[0] = this.humanSeat(this.uid, cleanName(name));
      this.options.friendJoinMs.forEach((delay, i) => this.later(room, delay, () => this.friendJoins(room, i)));
      return this.snapshot(room);
    });
  }

  joinTable({ code, name }: { code: string; name: string }): Promise<OnlineSnapshot> {
    return this.roundTrip(() => {
      const room = this.findByCode(code);
      if (!room || room.status === 'closed') throw new OnlineError('not_found', 'No table with that code. Check it and try again.');
      if (room.seats.some((s) => s.uid === this.uid && !s.left)) return this.snapshot(room);
      if (room.status !== 'lobby') throw new OnlineError('started', 'That game has already started.');

      const seat = room.seats.findIndex((s) => s.uid === null);
      if (seat < 0) throw new OnlineError('full', 'That table is full.');
      room.seats[seat] = this.humanSeat(this.uid, cleanName(name));
      this.broadcast(room);
      if (room.simHost) {
        // The friend hosting this table starts the game once you've had a moment to look around.
        this.later(room, this.options.hostStartMs, () => {
          if (room.seats.some((s) => s.uid === this.uid && !s.left)) this.start(room);
        });
      }
      return this.snapshot(room);
    });
  }

  startGame(gameId: string): Promise<void> {
    return this.roundTrip(() => {
      const room = this.requireRoom(gameId);
      this.requireSeat(room);
      if (room.hostUid !== this.uid) throw new OnlineError('forbidden', 'Only the host can start the game.');
      this.start(room);
    });
  }

  setSeat(gameId: string, seatIndex: number, change: 'bot' | 'open'): Promise<void> {
    return this.roundTrip(() => {
      const room = this.requireRoom(gameId);
      if (room.hostUid !== this.uid) throw new OnlineError('forbidden', 'Only the host can change the seats.');
      if (room.status !== 'lobby') throw new OnlineError('invalid', 'The game has already started.');
      const seat = room.seats[seatIndex];
      if (!seat || seat.uid === this.uid) throw new OnlineError('invalid', "You can't change that seat.");

      if (change === 'bot') {
        if (seat.uid) throw new OnlineError('invalid', 'That seat is taken.');
        room.seats[seatIndex] = this.botSeat(room, seatIndex);
      } else {
        room.seats[seatIndex] = openSeat();
      }
      this.broadcast(room);
    });
  }

  submitAction(gameId: string, action: GameAction, expectedVersion: number): Promise<OnlineSnapshot> {
    return this.roundTrip(() => {
      const room = this.requireRoom(gameId);
      const seat = this.requireSeat(room);
      const game = room.game;

      // Starting the next hand needs no player id; any seated player can ask for it.
      if (action.type === 'nextRound') {
        if (game?.status === 'playing') return this.snapshot(room);
      } else if (action.playerId !== this.uid) {
        throw new OnlineError('forbidden', "You can only move for yourself.");
      }
      if (!game) throw new OnlineError('invalid', "The game hasn't started yet.");

      // Buy requests come from players who are not on the move, so they cannot be checked against the
      // turn's version; only the current player's moves are checked for staleness.
      const concurrent = action.type === 'buy' || action.type === 'nextRound';
      if (!concurrent && expectedVersion !== game.version) {
        throw new OnlineError('stale', 'The table moved on while you were playing. Look again and retry.');
      }

      this.apply(room, action);
      seat.timeouts = 0;
      seat.autoplay = false;
      this.afterChange(room);
      return this.snapshot(room);
    });
  }

  leaveTable(gameId: string): Promise<void> {
    return this.roundTrip(() => {
      const room = this.rooms.get(gameId);
      const seatIndex = room?.seats.findIndex((s) => s.uid === this.uid) ?? -1;
      if (!room || seatIndex < 0) return;

      if (room.status === 'lobby') {
        if (room.hostUid === this.uid) this.close(room);
        else room.seats[seatIndex] = openSeat();
      } else {
        const seat = room.seats[seatIndex];
        seat.left = true;
        seat.autoplay = true;
        seat.connected = false;
        // With nobody left to play against, the table is done.
        if (!room.seats.some((s) => s.uid && !s.isBot && !s.left)) this.close(room);
      }
      this.afterChange(room);
    });
  }

  resumeSeat(gameId: string): Promise<void> {
    return this.roundTrip(() => {
      const room = this.requireRoom(gameId);
      const seat = this.requireSeat(room);
      seat.autoplay = false;
      seat.timeouts = 0;
      this.afterChange(room);
    });
  }

  listMyTables(): Promise<TableInfo[]> {
    return this.roundTrip(() =>
      [...this.rooms.values()]
        .filter((r) => r.status !== 'closed' && r.seats.some((s) => s.uid === this.uid && !s.left))
        .map((r) => this.tableInfo(r)),
    );
  }

  subscribe(gameId: string, handlers: TableSubscription): () => void {
    const set = this.subscribers.get(gameId) ?? new Set();
    this.subscribers.set(gameId, set);
    set.add(handlers);

    let active = true;
    void sleep(this.options.latencyMs).then(() => {
      if (!active) return;
      const room = this.rooms.get(gameId);
      if (!room || !room.seats.some((s) => s.uid === this.uid && !s.left)) {
        handlers.onError(new OnlineError('not_found', 'That table is no longer available.'));
        return;
      }
      handlers.onConnection(this.online ? 'online' : 'offline');
      if (this.online) handlers.onSnapshot(this.snapshot(room));
    });
    if (!this.online) handlers.onConnection('offline');

    return () => {
      active = false;
      set.delete(handlers);
    };
  }

  // -------------------------------------------------------------------------
  // The pretend server
  // -------------------------------------------------------------------------

  private async roundTrip<T>(work: () => T): Promise<T> {
    await sleep(this.options.latencyMs / 2);
    if (!this.online) throw new OnlineError('offline', "You're offline. Check your connection and try again.");
    let result: T;
    try {
      result = work();
    } catch (error) {
      if (error instanceof GameRuleError) throw new OnlineError('rule', error.message);
      throw error;
    }
    await sleep(this.options.latencyMs / 2);
    return result;
  }

  private newRoom(hostUid: string, settings: TableSettings, status: Room['status'] = 'lobby'): Room {
    const room: Room = {
      id: `table-${this.nextRoomNumber++}`,
      code: this.newCode(),
      hostUid,
      status,
      settings,
      seats: Array.from({ length: settings.seatCount }, openSeat),
      game: null,
      simHost: false,
      deadline: null,
      deadlineKey: null,
      timers: new Set(),
    };
    this.rooms.set(room.id, room);
    return room;
  }

  private newCode(): string {
    for (;;) {
      const code = Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(this.options.random() * CODE_ALPHABET.length)]).join('');
      if (!this.findByCode(code)) return code;
    }
  }

  private findByCode(code: string): Room | undefined {
    const wanted = code.trim().toUpperCase();
    return [...this.rooms.values()].find((r) => r.code === wanted);
  }

  private requireRoom(gameId: string): Room {
    const room = this.rooms.get(gameId);
    if (!room || room.status === 'closed') throw new OnlineError('not_found', 'That table is no longer available.');
    return room;
  }

  private requireSeat(room: Room): SeatState {
    const seat = room.seats.find((s) => s.uid === this.uid && !s.left);
    if (!seat) throw new OnlineError('forbidden', "You're not seated at that table.");
    return seat;
  }

  private seatOf(room: Room, uid: string): SeatState | undefined {
    return room.seats.find((s) => s.uid === uid);
  }

  private humanSeat(uid: string, name: string, sim = false): SeatState {
    return { ...openSeat(), uid, name, connected: true, sim };
  }

  /** A computer player for the seat at `index`, with a name nobody else at the table has. */
  private botSeat(room: Room, index: number): SeatState {
    const used = new Set(room.seats.map((s) => s.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Computer ${index + 1}`;
    return { ...openSeat(), uid: `bot-${index + 1}`, name, isBot: true, connected: true };
  }

  private friendName(room: Room): string {
    const used = new Set(room.seats.map((s) => s.name));
    return FRIEND_NAMES.find((n) => !used.has(n)) ?? `Friend ${room.seats.length}`;
  }

  /** A simulated friend sits down in the first open seat. */
  private friendJoins(room: Room, index: number) {
    const seat = room.seats.findIndex((s) => s.uid === null);
    if (room.status !== 'lobby' || seat < 0) return;
    room.seats[seat] = this.humanSeat(`friend-${room.id}-${index + 1}`, this.friendName(room), true);
    this.broadcast(room);
  }

  /** Runs `work` after `delay` unless the table has closed. */
  private later(room: Room, delay: number, work: () => void) {
    const timer = setTimeout(() => {
      room.timers.delete(timer);
      if (room.status !== 'closed') work();
    }, delay);
    room.timers.add(timer);
  }

  private start(room: Room) {
    if (room.status !== 'lobby') return;
    if (room.seats.some((s) => s.uid === null) && !room.settings.fillWithBots) {
      throw new OnlineError('invalid', 'Every seat needs a player before the game can start.');
    }
    room.seats.forEach((seat, index) => {
      if (seat.uid === null) room.seats[index] = this.botSeat(room, index);
    });

    room.game = createGame({
      id: room.id,
      mode: room.settings.mode,
      seed: Math.floor(this.options.random() * 2 ** 31),
      players: room.seats.map((s) => ({ id: s.uid as string, name: s.name, isBot: s.isBot })),
    });
    room.status = 'playing';
    this.afterChange(room);
  }

  private close(room: Room) {
    room.status = 'closed';
    this.clearTimers(room);
    room.deadline = null;
  }

  private clearTimers(room: Room) {
    for (const timer of [room.deadlineTimer, room.botTimer, room.simTimer, ...room.timers]) clearTimeout(timer);
    room.deadlineTimer = room.botTimer = room.simTimer = undefined;
    room.timers.clear();
    room.deadlineKey = null;
  }

  private apply(room: Room, action: GameAction) {
    const previous = room.game;
    if (!previous) return;
    room.game = this.runComputerBuys(room, previous, applyAction(previous, action));
  }

  /** When a buy window opens, every computer player (and active friend) decides whether to ask for the card. */
  private runComputerBuys(room: Room, previous: GameState, next: GameState): GameState {
    const window = next.buyWindow;
    if (!window || previous.buyWindow?.cardId === window.cardId) return next;
    let state = next;
    for (const player of state.players) {
      const seat = this.seatOf(room, player.id);
      const decides = !!seat && (seat.isBot || seat.autoplay || seat.left || (seat.sim && !seat.idle));
      if (decides && canBuy(state, player.id) && chooseBotBuy(state, player.id)) {
        state = applyAction(state, { type: 'buy', playerId: player.id });
      }
    }
    return state;
  }

  /** Bookkeeping after anything changed: finish the table if the game ended, tell watchers, schedule what's next. */
  private afterChange(room: Room) {
    if (room.game?.status === 'gameOver' && room.status === 'playing') room.status = 'finished';
    this.schedule(room);
    this.broadcast(room);
  }

  /** Lines up whatever has to happen next: computer moves, friends moving, and the turn clock. */
  private schedule(room: Room) {
    clearTimeout(room.botTimer);
    clearTimeout(room.simTimer);
    room.botTimer = room.simTimer = undefined;

    const game = room.game;
    if (room.status !== 'playing' || !game) {
      clearTimeout(room.deadlineTimer);
      room.deadlineTimer = undefined;
      room.deadline = null;
      room.deadlineKey = null;
      return;
    }

    if (game.status === 'roundOver') {
      // The player in front of the screen deals the next hand. If they left, the server does.
      const humanPresent = room.seats.some((s) => s.uid === this.uid && !s.left && !s.autoplay);
      if (!humanPresent) this.later(room, this.options.botDelayMs * 4, () => this.dealNext(room));
      return;
    }

    // Only the player whose turn it is can be waited on; buying happens out of turn.
    const mover = currentPlayer(game);
    const seat = this.seatOf(room, mover.id);
    const serverControlled = !seat || seat.isBot || seat.autoplay || seat.left;
    const friendMoves = !!seat && !serverControlled && seat.sim && !seat.idle;

    if (serverControlled) {
      room.botTimer = setTimeout(() => this.moveFor(room, mover.id), this.options.botDelayMs);
    } else if (friendMoves) {
      const [min, max] = this.options.thinkMs;
      room.simTimer = setTimeout(() => this.moveFor(room, mover.id), min + this.options.random() * (max - min));
    }

    if (serverControlled) {
      clearTimeout(room.deadlineTimer);
      room.deadlineTimer = undefined;
      room.deadline = null;
      room.deadlineKey = null;
      return;
    }
    // One clock per turn, however many moves are made inside it.
    const key = `${game.phaseIndex}:${game.currentPlayerIndex}`;
    if (key !== room.deadlineKey || room.deadline === null) {
      const seconds = room.settings.turnSeconds;
      room.deadlineKey = key;
      room.deadline = this.options.now() + seconds * 1000;
      clearTimeout(room.deadlineTimer);
      room.deadlineTimer = setTimeout(() => this.onDeadline(room), seconds * 1000);
    }
  }

  private dealNext(room: Room) {
    if (room.game?.status !== 'roundOver') return;
    this.apply(room, { type: 'nextRound' });
    this.afterChange(room);
  }

  /** A computer player or friend makes one move. */
  private moveFor(room: Room, playerId: string) {
    const game = room.game;
    if (!game || game.status !== 'playing' || currentPlayer(game).id !== playerId) return;
    try {
      this.apply(room, chooseBotAction(game));
    } catch {
      this.apply(room, safeBotAction(game, playerId));
    }
    const seat = this.seatOf(room, playerId);
    if (seat && !seat.isBot && !seat.autoplay) seat.timeouts = 0;
    this.afterChange(room);
  }

  /** The clock ran out: a bot plays the turn, and repeat offenders get replaced. */
  private onDeadline(room: Room) {
    room.deadlineTimer = undefined;
    const game = room.game;
    if (!game || game.status !== 'playing') return;

    const seat = this.seatOf(room, currentPlayer(game).id);
    if (seat && !(seat.isBot || seat.autoplay || seat.left)) {
      this.autoplayTurn(room, seat.uid as string);
      seat.timeouts++;
      if (seat.timeouts >= TIMEOUTS_BEFORE_TAKEOVER) seat.autoplay = true;
    }
    room.deadlineKey = null;
    this.afterChange(room);
  }

  /** Plays the player's turn for them. */
  private autoplayTurn(room: Room, playerId: string) {
    for (let i = 0; i < MAX_ACTIONS_PER_AUTOPLAYED_TURN; i++) {
      const game = room.game;
      if (!game || game.status !== 'playing' || currentPlayer(game).id !== playerId) return;
      try {
        this.apply(room, chooseBotAction(game));
      } catch {
        this.apply(room, safeBotAction(game, playerId));
      }
    }
    const game = room.game;
    if (game && game.status === 'playing' && currentPlayer(game).id === playerId) {
      this.apply(room, safeBotAction(game, playerId));
    }
  }

  // -------------------------------------------------------------------------
  // What clients see
  // -------------------------------------------------------------------------

  private tableInfo(room: Room): TableInfo {
    return {
      gameId: room.id,
      inviteCode: room.code,
      hostUid: room.hostUid,
      status: room.status,
      settings: room.settings,
      seats: room.seats.map(({ uid, name, isBot, connected, autoplay, left }) => ({ uid, name, isBot, connected, autoplay, left })),
    };
  }

  private snapshot(room: Room): OnlineSnapshot {
    const seated = room.game?.players.some((p) => p.id === this.uid);
    return {
      table: this.tableInfo(room),
      view: room.game && seated ? getPlayerView(room.game, this.uid) : null,
      deadline: room.deadline,
      serverTime: this.options.now(),
    };
  }

  /** Pushes the table's new state to anyone watching, after a network delay. */
  private broadcast(room: Room) {
    const watchers = this.subscribers.get(room.id);
    if (!watchers || watchers.size === 0 || !this.online) return;
    const snapshot = this.snapshot(room);
    setTimeout(() => {
      if (!this.online) return;
      for (const watcher of [...watchers]) watcher.onSnapshot(snapshot);
    }, this.options.latencyMs / 2);
  }

  // -------------------------------------------------------------------------
  // Demo controls
  // -------------------------------------------------------------------------

  private setOnline(online: boolean) {
    if (this.online === online) return;
    this.online = online;
    for (const [gameId, watchers] of this.subscribers) {
      const room = this.rooms.get(gameId);
      if (room) {
        const seat = room.seats.find((s) => s.uid === this.uid);
        if (seat) seat.connected = online;
      }
      for (const watcher of [...watchers]) {
        watcher.onConnection(online ? 'online' : 'offline');
        // On reconnecting, the client catches up with everything it missed in one snapshot.
        if (online && room) watcher.onSnapshot(this.snapshot(room));
      }
    }
  }

  private setIdle(gameId: string, seatIndex: number, idle: boolean) {
    const room = this.rooms.get(gameId);
    const seat = room?.seats[seatIndex];
    if (!room || !seat?.sim) return;
    seat.idle = idle;
    seat.connected = !idle;
    if (!idle) {
      seat.autoplay = false;
      seat.timeouts = 0;
    }
    this.afterChange(room);
  }

  private seedRooms() {
    // DEMO: a friend is hosting and starts the game soon after you join.
    const demo = this.newRoom('friend-demo-1', { seatCount: 4, mode: 'classic', turnSeconds: 60, fillWithBots: true });
    demo.code = 'DEMO';
    demo.simHost = true;
    demo.seats[0] = this.humanSeat('friend-demo-1', 'Elena', true);
    demo.seats[1] = this.humanSeat('friend-demo-2', 'Nico', true);

    // FULL: every seat taken. DONE: the game is already under way.
    const full = this.newRoom('friend-full-1', { seatCount: 2, mode: 'classic', turnSeconds: 60, fillWithBots: true });
    full.code = 'FULL';
    full.seats = ['Priya', 'Tom'].map((name, i) => this.humanSeat(`friend-full-${i + 1}`, name, true));
    const done = this.newRoom('friend-done-1', { seatCount: 2, mode: 'paced', turnSeconds: 60, fillWithBots: true }, 'playing');
    done.code = 'DONE';
    done.seats = ['Aiko', 'Sam'].map((name, i) => this.humanSeat(`friend-done-${i + 1}`, name, true));
  }
}

function cleanName(name: string): string {
  return name.trim().slice(0, 20) || 'Player';
}
