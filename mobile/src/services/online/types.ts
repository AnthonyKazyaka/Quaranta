import { GameAction, GameMode, PlayerView } from '@quaranta/shared';

/**
 * The contract between the app and whatever runs online tables. Today that's `MockOnlineService`,
 * which simulates the server and the other players on this device. The real implementation
 * (Cloud Functions + Firestore, see docs/MULTIPLAYER.md) will implement the same interface, so
 * the screens and stores don't change.
 */

export const MIN_TABLE_SEATS = 2;
export const MAX_TABLE_SEATS = 4;
/** Seconds a player gets for a turn before a bot plays it for them. */
export const TURN_SECONDS_OPTIONS = [15, 30, 60, 120] as const;
/** After this many timed-out turns in a row, a bot takes over the seat until the player returns. */
export const TIMEOUTS_BEFORE_TAKEOVER = 2;
/** Buying is quick, so its window is capped no matter how long turns are. */
export const BUY_WINDOW_SECONDS = 15;

export interface TableSettings {
  seatCount: number;
  mode: GameMode;
  turnSeconds: number;
  /** Empty seats become computer players when the host starts the game. */
  fillWithBots: boolean;
}

export const DEFAULT_TABLE_SETTINGS: TableSettings = {
  seatCount: 4,
  mode: 'classic',
  turnSeconds: 60,
  fillWithBots: true,
};

export interface TableSeat {
  /** The player's id in the game. Null for an open seat. */
  uid: string | null;
  name: string;
  isBot: boolean;
  connected: boolean;
  /** A bot is playing this seat because the player timed out or left. */
  autoplay: boolean;
  /** The player left the table for good. */
  left: boolean;
}

export type TableStatus = 'lobby' | 'playing' | 'finished' | 'closed';

/** The public description of a table, visible to everyone seated at it. */
export interface TableInfo {
  gameId: string;
  inviteCode: string;
  hostUid: string;
  status: TableStatus;
  settings: TableSettings;
  seats: TableSeat[];
}

/** Everything one player needs to draw an online table. */
export interface OnlineSnapshot {
  table: TableInfo;
  /** The player's view of the game; null until the host starts it. */
  view: PlayerView | null;
  /** When the current turn (or buy window) times out, in server time. Null when nobody is on the clock. */
  deadline: number | null;
  serverTime: number;
}

export type ConnectionState = 'connecting' | 'online' | 'offline';

export type OnlineErrorCode =
  | 'not_found'
  | 'full'
  | 'started'
  | 'offline'
  | 'stale'
  | 'forbidden'
  | 'invalid'
  | 'rule';

export class OnlineError extends Error {
  constructor(
    readonly code: OnlineErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OnlineError';
  }
}

export interface TableSubscription {
  onSnapshot: (snapshot: OnlineSnapshot) => void;
  onConnection: (state: ConnectionState) => void;
  /** The table can't be loaded (it was deleted, or the player isn't seated at it). */
  onError: (error: OnlineError) => void;
}

export interface OnlineService {
  /** True for the in-device simulation, so the UI can say so. */
  readonly isMock: boolean;
  /** The signed-in player's id, which is also their id inside the game. */
  readonly uid: string;

  createTable(input: { name: string; settings: TableSettings }): Promise<OnlineSnapshot>;
  joinTable(input: { code: string; name: string }): Promise<OnlineSnapshot>;
  /** Host only. Fills empty seats with computer players, if the table allows it, and deals. */
  startGame(gameId: string): Promise<void>;
  /** Host only, in the lobby. Gives an open seat to a computer player, or empties a seat. */
  setSeat(gameId: string, seatIndex: number, change: 'bot' | 'open'): Promise<void>;
  submitAction(gameId: string, action: GameAction, expectedVersion: number): Promise<OnlineSnapshot>;
  /** Leaves the table. In a running game a bot takes the seat. */
  leaveTable(gameId: string): Promise<void>;
  /** Hands the seat back to the player after a bot took over. */
  resumeSeat(gameId: string): Promise<void>;
  listMyTables(): Promise<TableInfo[]>;
  subscribe(gameId: string, handlers: TableSubscription): () => void;
}
