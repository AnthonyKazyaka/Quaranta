import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameAction,
  GameRuleError,
  GameState,
  applyAction,
  chooseBotAction,
  createGame,
  currentPlayer,
  discardableCardIds,
  findSwappableJoker,
} from '@quaranta/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { saveGame } from '@/services/gameRepository';

export const BOT_NAMES = ['Bianca', 'Marco', 'Giulia', 'Luca', 'Sofia'];
/** Safety valve: a bot that somehow keeps acting is made to discard. */
const MAX_BOT_ACTIONS_PER_TURN = 40;

export type SortOrder = 'suit' | 'rank';

export interface StoreMessage {
  text: string;
  tone: 'info' | 'error';
}

interface GameStore {
  game: GameState | null;
  humanId: string | null;
  createdAt: number | null;
  sortBy: SortOrder;
  playerName: string;
  /** Cards the human has selected in their hand. */
  selectedIds: string[];
  /** Groups set aside for opening, which must all be played together. */
  stagedMelds: string[][];
  message: StoreMessage | null;
  botActionsThisTurn: number;

  startGame: (playerName: string, botCount: number) => void;
  quitGame: () => void;
  setSortBy: (sortBy: SortOrder) => void;
  toggleCard: (cardId: string) => void;
  clearSelection: () => void;
  stageSelection: () => void;
  unstageMeld: (index: number) => void;

  drawFromDeck: () => void;
  drawFromDiscard: () => void;
  openWithStaged: () => void;
  laySelection: () => void;
  discardSelection: () => void;
  playSelectionOnMeld: (meldId: string) => void;
  nextRound: () => void;
  runBotStep: () => void;
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
        const { game, createdAt } = get();
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
        const humanHand = new Set(next.players.find((p) => p.id === get().humanId)?.hand.map((c) => c.id));
        set({
          game: next,
          selectedIds: turnPassed ? [] : get().selectedIds.filter((id) => humanHand.has(id)),
          stagedMelds: turnPassed || action.type === 'open' ? [] : get().stagedMelds,
          message: null,
          botActionsThisTurn: turnPassed ? 0 : get().botActionsThisTurn,
        });

        if (shouldSaveToCloud(game, next, get().humanId)) {
          void saveGame(next, createdAt ?? Date.now());
        }
        return true;
      };

      const humanAction = <T extends GameAction>(build: (playerId: string) => T) => {
        const { humanId } = get();
        if (humanId) dispatch(build(humanId));
      };

      return {
        game: null,
        humanId: null,
        createdAt: null,
        sortBy: 'suit',
        playerName: '',
        selectedIds: [],
        stagedMelds: [],
        message: null,
        botActionsThisTurn: 0,

        startGame: (playerName, botCount) => {
          const name = playerName.trim() || 'You';
          const game = createGame({
            id: `game-${Date.now().toString(36)}`,
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

        setSortBy: (sortBy) => set({ sortBy }),

        toggleCard: (cardId) => {
          const { selectedIds } = get();
          set({
            selectedIds: selectedIds.includes(cardId) ? selectedIds.filter((id) => id !== cardId) : [...selectedIds, cardId],
            message: null,
          });
        },

        clearSelection: () => set({ selectedIds: [] }),

        stageSelection: () => {
          const { selectedIds, stagedMelds } = get();
          if (selectedIds.length === 0) return;
          set({ stagedMelds: [...stagedMelds, selectedIds], selectedIds: [], message: null });
        },

        unstageMeld: (index) => set({ stagedMelds: get().stagedMelds.filter((_, i) => i !== index) }),

        drawFromDeck: () => humanAction((playerId) => ({ type: 'drawFromDeck', playerId })),
        drawFromDiscard: () => humanAction((playerId) => ({ type: 'drawFromDiscard', playerId })),

        openWithStaged: () => {
          const { stagedMelds, selectedIds } = get();
          // Anything still selected counts as one more group, so a single meld needn't be staged first.
          const melds = selectedIds.length > 0 ? [...stagedMelds, selectedIds] : stagedMelds;
          if (melds.length === 0) {
            set({ message: { text: 'Select the cards you want to open with.', tone: 'info' } });
            return;
          }
          humanAction((playerId) => ({ type: 'open', playerId, melds }));
        },

        laySelection: () => humanAction((playerId) => ({ type: 'layMeld', playerId, cardIds: get().selectedIds })),

        discardSelection: () => {
          const { selectedIds } = get();
          if (selectedIds.length !== 1) {
            set({ message: { text: 'Select exactly one card to discard.', tone: 'info' } });
            return;
          }
          humanAction((playerId) => ({ type: 'discard', playerId, cardId: selectedIds[0] }));
        },

        playSelectionOnMeld: (meldId) => {
          const { game, humanId, selectedIds } = get();
          if (!game || !humanId) return;
          if (selectedIds.length === 0) {
            set({ message: { text: 'Select cards from your hand, then tap a meld to play them.', tone: 'info' } });
            return;
          }

          const meld = game.melds.find((m) => m.id === meldId);
          const hand = game.players.find((p) => p.id === humanId)?.hand ?? [];
          const card = selectedIds.length === 1 ? hand.find((c) => c.id === selectedIds[0]) : undefined;
          const joker = meld && card ? findSwappableJoker(meld, card) : null;
          const exactSwap =
            joker?.represents && card && !card.joker && joker.represents.rank === card.rank && joker.represents.suit === card.suit;

          if (exactSwap && card) {
            dispatch({ type: 'swapJoker', playerId: humanId, meldId, cardId: card.id });
            return;
          }
          if (dispatch({ type: 'addToMeld', playerId: humanId, meldId, cardIds: selectedIds })) return;
          if (joker && card) {
            dispatch({ type: 'swapJoker', playerId: humanId, meldId, cardId: card.id });
          }
        },

        nextRound: () => dispatch({ type: 'nextRound' }),

        runBotStep: () => {
          const { game, botActionsThisTurn } = get();
          if (!game || game.status !== 'playing') return;
          const bot = currentPlayer(game);
          if (!bot.isBot) return;

          let action = chooseBotAction(game);
          if (botActionsThisTurn >= MAX_BOT_ACTIONS_PER_TURN && game.turnStage === 'play') {
            action = { type: 'discard', playerId: bot.id, cardId: discardableCardIds(game, bot.id)[0] };
          }
          set({ botActionsThisTurn: botActionsThisTurn + 1 });
          if (!dispatch(action)) {
            // The bot chose an illegal move; fall back to something always legal.
            dispatch(
              game.turnStage === 'draw'
                ? { type: 'drawFromDeck', playerId: bot.id }
                : { type: 'discard', playerId: bot.id, cardId: discardableCardIds(game, bot.id)[0] },
            );
          }
        },
      };
    },
    {
      name: 'quaranta-game',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // v0 games predate GameState.version and GameState.reshuffles.
      migrate: (persisted, fromVersion) => {
        const state = persisted as { game: GameState | null };
        if (fromVersion < 1 && state.game) {
          state.game = { ...state.game, version: state.game.version ?? 0, reshuffles: state.game.reshuffles ?? 0 };
        }
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
