import { Card } from './cards';
import { BuyWindow, GameLogEntry, GameMode, GameState, GameStatus, RoundResult, TableMeld, TurnStage } from './game';

export interface PublicPlayer {
  id: string;
  name: string;
  isBot: boolean;
  isOpen: boolean;
  handCount: number;
  /** The opening this player is working on, as an index into `PHASES`. */
  phaseIndex: number;
}

/**
 * Everything every player at the table may see. In online play this is the shared table document.
 * It deliberately leaves out the deck order, other players' hands and `rngState` (which would let
 * anyone replay the shuffle and reconstruct the deck).
 */
export interface PublicGameView {
  id: string;
  version: number;
  mode: GameMode;
  players: PublicPlayer[];
  phaseIndex: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  turnStage: TurnStage;
  openedThisTurn: boolean;
  status: GameStatus;
  melds: TableMeld[];
  topDiscard: Card | null;
  /** The card beneath the top discard, for drawing the pile. Discards are face up, so it's public. */
  underDiscard: Card | null;
  discardCount: number;
  /** Buy requests are made out loud, so everyone sees them. */
  buyWindow: BuyWindow | null;
  pot: number;
  purses: Record<string, number>;
  deckCount: number;
  results: RoundResult[];
  log: GameLogEntry[];
}

/** What one player sees: the public table plus their own hand. */
export interface PlayerView extends PublicGameView {
  viewerId: string;
  hand: Card[];
}

export function getPublicView(state: GameState): PublicGameView {
  return {
    id: state.id,
    version: state.version,
    mode: state.mode,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      isOpen: p.isOpen,
      handCount: p.hand.length,
      phaseIndex: p.phaseIndex,
    })),
    phaseIndex: state.phaseIndex,
    dealerIndex: state.dealerIndex,
    currentPlayerIndex: state.currentPlayerIndex,
    turnStage: state.turnStage,
    openedThisTurn: state.openedThisTurn,
    status: state.status,
    melds: state.melds,
    topDiscard: state.discardPile[state.discardPile.length - 1] ?? null,
    underDiscard: state.discardPile[state.discardPile.length - 2] ?? null,
    discardCount: state.discardPile.length,
    buyWindow: state.buyWindow ?? null,
    pot: state.pot ?? 0,
    purses: state.purses ?? {},
    deckCount: state.deck.length,
    results: state.results,
    log: state.log,
  };
}

export function getPlayerView(state: GameState, viewerId: string): PlayerView {
  const viewer = state.players.find((p) => p.id === viewerId);
  if (!viewer) {
    throw new Error(`Player ${viewerId} isn't in this game.`);
  }
  return { ...getPublicView(state), viewerId, hand: viewer.hand };
}

/** The discard on offer in the open buy window, as seen from a view. */
export function viewBuyableCard(view: PublicGameView): Card | null {
  const window = view.buyWindow;
  return window && view.topDiscard?.id === window.cardId ? view.topDiscard : null;
}

/** Whether the deck has a card to draw, counting a reshuffle of the discard pile under its top card. */
export function viewCanDrawFromDeck(view: PublicGameView): boolean {
  return view.deckCount > 0 || view.discardCount > 1;
}

/** Whether a player may ask to buy the top discard right now. */
export function viewCanBuy(view: PublicGameView, playerId: string): boolean {
  return (
    view.status === 'playing' &&
    viewBuyableCard(view) !== null &&
    view.players[view.currentPlayerIndex].id !== playerId &&
    !view.buyWindow!.requests.includes(playerId)
  );
}

/** Identifies one buy offer: the same card can come up for sale again later in the hand. */
export function viewBuyOfferKey(view: PublicGameView): string | null {
  const window = view.buyWindow;
  return window ? `${view.phaseIndex}:${view.currentPlayerIndex}:${window.cardId}:${view.deckCount}` : null;
}
