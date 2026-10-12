import { Card } from './cards';
import { GameLogEntry, GameState, GameStatus, RoundResult, TableMeld, TurnStage } from './game';

export interface PublicPlayer {
  id: string;
  name: string;
  isBot: boolean;
  isOpen: boolean;
  handCount: number;
}

/**
 * Everything every player at the table may see. In online play this is the shared table document.
 * It deliberately leaves out the deck order, other players' hands and `rngState` (which would let
 * anyone replay the shuffle and reconstruct the deck).
 */
export interface PublicGameView {
  id: string;
  version: number;
  players: PublicPlayer[];
  phaseIndex: number;
  dealerIndex: number;
  currentPlayerIndex: number;
  turnStage: TurnStage;
  openedThisTurn: boolean;
  status: GameStatus;
  melds: TableMeld[];
  topDiscard: Card | null;
  discardCount: number;
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
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      isOpen: p.isOpen,
      handCount: p.hand.length,
    })),
    phaseIndex: state.phaseIndex,
    dealerIndex: state.dealerIndex,
    currentPlayerIndex: state.currentPlayerIndex,
    turnStage: state.turnStage,
    openedThisTurn: state.openedThisTurn,
    status: state.status,
    melds: state.melds,
    topDiscard: state.discardPile[state.discardPile.length - 1] ?? null,
    discardCount: state.discardPile.length,
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
