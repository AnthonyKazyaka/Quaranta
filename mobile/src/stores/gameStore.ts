import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameAction,
  GameMode,
  GameRuleError,
  GameState,
  PlayerView,
  actorsToMove,
  applyAction,
  chooseBotAction,
  createGame,
  currentPlayer,
  getPlayer,
  getPlayerView,
  safeBotAction,
} from '@quaranta/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { saveGame } from '@/services/gameRepository';
import { BOT_NAMES } from '@/botNames';
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
          next = applyAction(game, action);
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
            botActionsThisTurn: 0,
          });
          void saveGame(game, createdAt);
        },

        quitGame: () => set({ game: null, humanId: null, createdAt: null, selectedIds: [], stagedMelds: [], message: null }),

        runBotStep: () => {
          const { game, botActionsThisTurn } = get();
          if (!game || game.status !== 'playing') return;
          // Several bots can be deciding whether to buy at once; the human may be one of the players being waited on.
          const botId = actorsToMove(game).find((id) => getPlayer(game, id).isBot);
          if (!botId) return;

          // A bot that keeps acting without ending its turn is made to discard.
          const stuck = currentPlayer(game).id === botId && !game.buyOffer && botActionsThisTurn >= MAX_BOT_ACTIONS_PER_TURN;
          const action = stuck && game.turnStage === 'play' ? safeBotAction(game, botId) : chooseBotAction(game, botId);
          set({ botActionsThisTurn: botActionsThisTurn + 1 });
          // If the bot chose an illegal move, fall back to something always legal.
          if (!dispatch(action)) dispatch(safeBotAction(game, botId));
        },
      };
    },
    {
      name: 'quaranta-game',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
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
  // v1 games predate buying and the own-pace mode.
  if (fromVersion < 2) {
    game = {
      ...game,
      mode: game.mode ?? 'classic',
      discardBuyable: game.discardBuyable ?? false,
      buyOffer: game.buyOffer ?? null,
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
