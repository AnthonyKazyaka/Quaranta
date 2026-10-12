import { GameAction, PlayerView, findSwappableJoker, tryAddToMeld } from '@quaranta/shared';

export type SortOrder = 'suit' | 'rank';

export interface StoreMessage {
  text: string;
  tone: 'info' | 'error';
}

/** Everything about the table the player is sitting at that isn't part of the game itself. */
export interface TableUiState {
  /** Cards the player has selected in their hand. */
  selectedIds: string[];
  /** Groups set aside for opening, which must all be played together. */
  stagedMelds: string[][];
  sortBy: SortOrder;
  message: StoreMessage | null;
  /** A move has been sent and is waiting to be confirmed (only ever true for online games). */
  pending: boolean;
}

export interface TableUiActions {
  setSortBy: (sortBy: SortOrder) => void;
  setMessage: (message: StoreMessage | null) => void;
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
  buy: () => void;
  passBuy: () => void;
  nextRound: () => void;
}

export type TableUi = TableUiState & TableUiActions;

export const initialTableUi: TableUiState = {
  selectedIds: [],
  stagedMelds: [],
  sortBy: 'suit',
  message: null,
  pending: false,
};

/** Where a table sends its moves. Local games apply them straight away; online games go via the server. */
export interface TableHost {
  getView: () => PlayerView | null;
  /** Sends a move. Illegal moves are reported through the slice's `message`, and resolve to false. */
  send: (action: GameAction) => boolean | Promise<boolean>;
}

type Selection = Pick<TableUiState, 'selectedIds' | 'stagedMelds'>;

/**
 * Keeps the selection sensible after the game changes under it: it's dropped when the turn or hand
 * changes, and otherwise trimmed to cards the player still holds.
 */
export function reconcileSelection(current: Selection, previous: PlayerView | null, next: PlayerView): Selection {
  const turnChanged =
    !previous ||
    previous.currentPlayerIndex !== next.currentPlayerIndex ||
    previous.status !== next.status ||
    previous.phaseIndex !== next.phaseIndex;
  if (turnChanged) return { selectedIds: [], stagedMelds: [] };

  const hand = new Set(next.hand.map((c) => c.id));
  return {
    selectedIds: current.selectedIds.filter((id) => hand.has(id)),
    stagedMelds: current.stagedMelds.filter((group) => group.every((id) => hand.has(id))),
  };
}

/**
 * The table's UI state and the actions a player can take, shared by the single-player store and
 * the online store. Both just say where moves go (`host`).
 */
export function createTableSlice(
  set: (partial: Partial<TableUiState>) => void,
  get: () => TableUiState,
  host: TableHost,
): TableUi {
  const note = (text: string) => set({ message: { text, tone: 'info' } });

  /** Sends a move, tracking it as pending while an online round trip is in flight. */
  const send = (action: GameAction): boolean | Promise<boolean> => {
    const result = host.send(action);
    if (typeof result === 'boolean') return result;
    set({ pending: true });
    return result.finally(() => set({ pending: false }));
  };

  const act = (build: (viewerId: string) => GameAction) => {
    const view = host.getView();
    if (view) void send(build(view.viewerId));
  };

  return {
    ...initialTableUi,

    setSortBy: (sortBy) => set({ sortBy }),
    setMessage: (message) => set({ message }),

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

    drawFromDeck: () => act((playerId) => ({ type: 'drawFromDeck', playerId })),
    drawFromDiscard: () => act((playerId) => ({ type: 'drawFromDiscard', playerId })),
    buy: () => act((playerId) => ({ type: 'buy', playerId })),
    passBuy: () => act((playerId) => ({ type: 'passBuy', playerId })),

    openWithStaged: () => {
      const { stagedMelds, selectedIds } = get();
      // Anything still selected counts as one more group, so a single meld needn't be staged first.
      const melds = selectedIds.length > 0 ? [...stagedMelds, selectedIds] : stagedMelds;
      if (melds.length === 0) {
        note('Select the cards you want to open with.');
        return;
      }
      act((playerId) => ({ type: 'open', playerId, melds }));
    },

    laySelection: () => act((playerId) => ({ type: 'layMeld', playerId, cardIds: get().selectedIds })),

    discardSelection: () => {
      const { selectedIds } = get();
      if (selectedIds.length !== 1) {
        note('Select exactly one card to discard.');
        return;
      }
      act((playerId) => ({ type: 'discard', playerId, cardId: selectedIds[0] }));
    },

    playSelectionOnMeld: (meldId) => {
      const view = host.getView();
      const { selectedIds } = get();
      if (!view) return;
      if (selectedIds.length === 0) {
        note('Select cards from your hand, then tap a meld to play them.');
        return;
      }

      const meld = view.melds.find((m) => m.id === meldId);
      const cards = selectedIds.flatMap((id) => view.hand.find((c) => c.id === id) ?? []);
      const card = cards.length === 1 ? cards[0] : undefined;
      const joker = meld && card ? findSwappableJoker(meld, card) : null;
      const exactSwap =
        !!joker?.represents && !!card && !card.joker && joker.represents.rank === card.rank && joker.represents.suit === card.suit;
      // Prefer swapping out a joker the card exactly replaces; otherwise add it, and only swap when it can't be added.
      const swap = exactSwap || (!!joker && !!meld && !tryAddToMeld(meld, cards));

      if (swap && card) {
        void send({ type: 'swapJoker', playerId: view.viewerId, meldId, cardId: card.id });
      } else {
        void send({ type: 'addToMeld', playerId: view.viewerId, meldId, cardIds: selectedIds });
      }
    },

    nextRound: () => act(() => ({ type: 'nextRound' })),
  };
}
