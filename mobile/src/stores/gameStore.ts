import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameAction,
  GameMode,
  GameRuleError,
  GameState,
  PlayerView,
  applyAction,
  canBuy,
  chooseBotAction,
  chooseBotBuy,
  createGame,
  currentPlayer,
  getPlayerView,
  safeBotAction,
} from '@quaranta/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BOT_NAMES } from '@/botNames';
import { saveGame } from '@/services/gameRepository';
import { TableUi, createTableSlice, reconcileSelection } from './tableSlice';

export type { SortOrder, StoreMessage } from './tableSlice';

/** Safety valve: a bot that somehow keeps acting is made to discard. */
const MAX_BOT_ACTIONS_PER_TURN = 40;

interface GameStore extends TableUi {
  game: GameState | null;
  humanId: string | null;
  createdAt: number | null;
  playerName: string;
  botActionsThisTurn: number;

  startGame: (playerName: string, botCount: number, mode?: GameMode) => void;
  quitGame: () => void;
  runBotStep: () => void;
}

/** The game as the human player sees it, which is what the table screen draws. */
export function localView(game: GameState | null, humanId: string | null): PlayerView | null {
  return game && humanId ? getPlayerView(game, humanId) : null;
}

/** When a buy window opens, every bot that isn't playing decides whether to ask for the card. */
function runBotBuys(previous: GameState, next: GameState): GameState {
  const window = next.buyWindow;
  if (!window || previous.buyWindow?.cardId === window.cardId) return next;
  let state = next;
  for (const player of state.players) {
    if (player.isBot && canBuy(state, player.id) && chooseBotBuy(state, player.id)) {
      state = applyAction(state, { type: 'buy', playerId: player.id });
    }
  }
  return state;
}

/**
 * Cloud saves happen when a hand starts or ends and when play comes back around to the human,
 * rather than after every move: about 70 writes a game instead of 280. The device keeps the
 * latest state either way.
 */
function shouldSaveToCloud(previous: GameState, next: GameState, humanId: string | null): boolean {
  if (next.status !== previous.status) return true;
  const turnPassed = next.currentPlayerIndex !== previous.currentPlayerIndex;
  return turnPassed && next.status === 'playing' && currentPlayer(next).id === humanId;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      /** Applies an action, keeping UI state in sync. Returns false if the move was illegal. */
      const dispatch = (action: GameAction): boolean => {
        const { game, createdAt, humanId } = get();
        if (!game) return false;

        let next: GameState;
        try {
          next = runBotBuys(game, applyAction(game, action));
        } catch (error) {
          if (error instanceof GameRuleError) {
            set({ message: { text: error.message, tone: 'error' } });
            return false;
          }
          throw error;
        }

        const turnPassed = next.currentPlayerIndex !== game.currentPlayerIndex || next.status !== game.status;
        const previousView = localView(game, humanId);
        const nextView = localView(next, humanId);
        set({
          game: next,
          ...(nextView ? reconcileSelection(get(), previousView, nextView) : {}),
          message: null,
          botActionsThisTurn: turnPassed ? 0 : get().botActionsThisTurn,
        });

        if (shouldSaveToCloud(game, next, humanId)) {
          void saveGame(next, createdAt ?? Date.now());
        }
        return true;
      };

      const table = createTableSlice(
        (partial) => set(partial),
        () => get(),
        {
          getView: () => localView(get().game, get().humanId),
          send: dispatch,
        },
      );

      return {
        ...table,
        game: null,
        humanId: null,
        createdAt: null,
        playerName: '',
        botActionsThisTurn: 0,

        startGame: (playerName, botCount, mode = 'classic') => {
          const name = playerName.trim() || 'You';
          const game = createGame({
            id: `game-${Date.now().toString(36)}`,
            mode,
            players: [
              { id: 'human', name, isBot: false },
              ...BOT_NAMES.slice(0, botCount).map((botName, i) => ({ id: `bot${i + 1}`, name: botName, isBot: true })),
            ],
          });
          const createdAt = Date.now();
          set({
            game,
            humanId: 'human',
            createdAt,
            playerName: name,
            selectedIds: [],
            stagedMelds: [],
            message: null,
            buyPassedKey: null,
            botActionsThisTurn: 0,
          });
          void saveGame(game, createdAt);
        },

        quitGame: () =>
          set({ game: null, humanId: null, createdAt: null, selectedIds: [], stagedMelds: [], message: null, buyPassedKey: null }),

        runBotStep: () => {
          const { game, botActionsThisTurn } = get();
          if (!game || game.status !== 'playing') return;
          const bot = currentPlayer(game);
          if (!bot.isBot) return;

          // A bot that keeps acting without ending its turn is made to discard.
          const stuck = botActionsThisTurn >= MAX_BOT_ACTIONS_PER_TURN && game.turnStage === 'play';
          const action = stuck ? safeBotAction(game, bot.id) : chooseBotAction(game);
          set({ botActionsThisTurn: botActionsThisTurn + 1 });
          // If the bot chose an illegal move, fall back to something always legal.
          if (!dispatch(action)) dispatch(safeBotAction(game, bot.id));
        },
      };
    },
    {
      name: 'quaranta-game',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persisted, fromVersion) => {
        const state = persisted as { game: GameState | null };
        if (state.game) state.game = migrateGame(state.game, fromVersion);
        return state as GameStore;
      },
      partialize: (state) => ({
        game: state.game,
        humanId: state.humanId,
        createdAt: state.createdAt,
        sortBy: state.sortBy,
        playerName: state.playerName,
      }),
    },
  ),
);

/** Brings a game saved by an older version of the app up to the current state shape. */
export function migrateGame(saved: GameState, fromVersion: number): GameState {
  let game = saved;
  // v0 games predate GameState.version and GameState.reshuffles.
  if (fromVersion < 1) {
    game = { ...game, version: game.version ?? 0, reshuffles: game.reshuffles ?? 0 };
  }
  // v1 games predate buying and stakes.
  if (fromVersion < 2) {
    game = {
      ...game,
      buyWindow: game.buyWindow ?? null,
      firstDiscardId: game.firstDiscardId ?? null,
      pot: game.pot ?? 0,
      purses: game.purses ?? Object.fromEntries(game.players.map((p) => [p.id, 0])),
      results: game.results.map((r) => ({ ...r, pot: r.pot ?? 0 })),
    };
  }
  // v2 games predate the own-pace mode and per-player openings.
  if (fromVersion < 3) {
    game = {
      ...game,
      mode: game.mode ?? 'classic',
      players: game.players.map((p) => ({ ...p, phaseIndex: p.phaseIndex ?? game.phaseIndex })),
      results: game.results.map((r) => ({
        ...r,
        phases: r.phases ?? Object.fromEntries(game.players.map((p) => [p.id, r.phaseIndex])),
        opened: r.opened ?? [],
      })),
    };
  }
  return game;
}
