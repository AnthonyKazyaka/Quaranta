import { GameAction, PlayerView } from '@quaranta/shared';
import { create } from 'zustand';
import {
  ConnectionState,
  OnlineError,
  OnlineService,
  OnlineSnapshot,
  TableInfo,
  TableSettings,
  getOnlineService,
} from '@/services/online';
import { useAccountStore } from './accountStore';
import { TableUi, createTableSlice, reconcileSelection } from './tableSlice';
import { useToastStore } from './toastStore';

/** Lets the root layout say how to open a table, so the store doesn't depend on the router. */
export const onlineNavigator: { open: ((gameId: string) => void) | null } = { open: null };

interface OnlineStore extends TableUi {
  gameId: string | null;
  table: TableInfo | null;
  view: PlayerView | null;
  /** When the turn or buy window times out, in the server's clock. */
  deadline: number | null;
  /** Server time minus local time, so countdowns match the server. */
  clockOffset: number;
  connection: ConnectionState;
  /** Why the open table can't be shown any more (it was closed or removed). */
  failure: string | null;
  /** The player is looking at the table's screen, so there's no need to nudge them about their turn. */
  viewing: boolean;

  myTables: TableInfo[];
  lobbyBusy: boolean;
  lobbyError: string | null;

  createTable: (name: string, settings: TableSettings) => Promise<string | null>;
  joinTable: (code: string, name: string) => Promise<string | null>;
  /** Starts following a table. Does nothing if it's already the open one. */
  openTable: (gameId: string) => void;
  closeTable: () => void;
  startGame: () => Promise<void>;
  setSeat: (seatIndex: number, change: 'bot' | 'open') => Promise<void>;
  leaveTable: () => Promise<void>;
  resumeSeat: () => Promise<void>;
  refreshMyTables: () => Promise<void>;
  setViewing: (viewing: boolean) => void;
}

export function errorText(error: unknown): string {
  return error instanceof OnlineError ? error.message : 'Something went wrong. Please try again.';
}

/** Whether the game is waiting on this player right now. */
export function isWaitingOnMe(view: PlayerView | null): boolean {
  if (!view || view.status !== 'playing') return false;
  if (view.buyOffer) return view.buyOffer.eligible.includes(view.viewerId) && !view.buyOffer.responses[view.viewerId];
  return view.players[view.currentPlayerIndex].id === view.viewerId;
}

/** What a table's screen shows when no table is open. The player's hand sort order isn't reset. */
const idleState = {
  gameId: null,
  table: null,
  view: null,
  deadline: null,
  clockOffset: 0,
  connection: 'connecting' as ConnectionState,
  failure: null,
  selectedIds: [],
  stagedMelds: [],
  message: null,
  pending: false,
};

export const useOnlineStore = create<OnlineStore>()((set, get) => {
  let unsubscribe: (() => void) | null = null;
  const service = (): OnlineService => getOnlineService();

  const applySnapshot = (snapshot: OnlineSnapshot) => {
    const current = get();
    if (current.gameId !== snapshot.table.gameId) return;
    // Snapshots can arrive out of order; never go back to an older view of the game.
    if (current.view && snapshot.view && snapshot.view.version < current.view.version) return;

    const selection = snapshot.view ? reconcileSelection(current, current.view, snapshot.view) : {};
    set({
      table: snapshot.table,
      view: snapshot.view,
      deadline: snapshot.deadline,
      clockOffset: snapshot.serverTime - Date.now(),
      failure: snapshot.table.status === 'closed' ? 'The host closed this table.' : null,
      ...selection,
    });

    if (!current.viewing && !isWaitingOnMe(current.view) && isWaitingOnMe(snapshot.view)) {
      nudge(snapshot.table);
    }
  };

  const nudge = (table: TableInfo) => {
    if (!useAccountStore.getState().turnAlerts) return;
    useToastStore.getState().show({
      text: `It's your turn at table ${table.inviteCode}.`,
      actionLabel: 'Open',
      onAction: () => onlineNavigator.open?.(table.gameId),
    });
  };

  const follow = (gameId: string, initial?: OnlineSnapshot) => {
    unsubscribe?.();
    set({
      ...idleState,
      gameId,
      table: initial?.table ?? null,
      view: initial?.view ?? null,
      deadline: initial?.deadline ?? null,
      clockOffset: initial ? initial.serverTime - Date.now() : 0,
    });
    unsubscribe = service().subscribe(gameId, {
      onSnapshot: applySnapshot,
      onConnection: (connection) => set({ connection }),
      onError: (error) => set({ failure: error.message }),
    });
  };

  /** Runs a lobby request, tracking that it's busy and reporting what went wrong. */
  const lobby = async <T>(work: () => Promise<T>): Promise<T | null> => {
    set({ lobbyBusy: true, lobbyError: null });
    try {
      return await work();
    } catch (error) {
      set({ lobbyError: errorText(error) });
      return null;
    } finally {
      set({ lobbyBusy: false });
    }
  };

  const table = createTableSlice(
    (partial) => set(partial),
    () => get(),
    {
      getView: () => get().view,
      send: async (action: GameAction) => {
        const { gameId, view } = get();
        if (!gameId || !view) return false;
        try {
          applySnapshot(await service().submitAction(gameId, action, view.version));
          set({ message: null });
          return true;
        } catch (error) {
          set({ message: { text: errorText(error), tone: 'error' } });
          return false;
        }
      },
    },
  );

  return {
    ...table,
    ...idleState,
    viewing: false,
    myTables: [],
    lobbyBusy: false,
    lobbyError: null,

    createTable: async (name, settings) => {
      const snapshot = await lobby(() => service().createTable({ name, settings }));
      if (!snapshot) return null;
      follow(snapshot.table.gameId, snapshot);
      return snapshot.table.gameId;
    },

    joinTable: async (code, name) => {
      const snapshot = await lobby(() => service().joinTable({ code, name }));
      if (!snapshot) return null;
      follow(snapshot.table.gameId, snapshot);
      return snapshot.table.gameId;
    },

    openTable: (gameId) => {
      if (get().gameId !== gameId) follow(gameId);
    },

    closeTable: () => {
      unsubscribe?.();
      unsubscribe = null;
      set({ ...idleState, lobbyError: null });
    },

    startGame: async () => {
      const { gameId } = get();
      if (gameId) await lobby(() => service().startGame(gameId));
    },

    setSeat: async (seatIndex, change) => {
      const { gameId } = get();
      if (gameId) await lobby(() => service().setSeat(gameId, seatIndex, change));
    },

    leaveTable: async () => {
      const { gameId } = get();
      if (!gameId) return;
      await lobby(() => service().leaveTable(gameId));
      get().closeTable();
    },

    resumeSeat: async () => {
      const { gameId } = get();
      if (gameId) await lobby(() => service().resumeSeat(gameId));
    },

    refreshMyTables: async () => {
      try {
        set({ myTables: await service().listMyTables() });
      } catch {
        // Offline: keep showing what we had.
      }
    },

    setViewing: (viewing) => set({ viewing }),
  };
});
