import { GameState, PHASES, leaders, totalScores } from '@quaranta/shared';
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { ensureSignedIn, getFirestoreDb } from './firebase';

/**
 * Firestore layout:
 *   users/{uid}/games/{gameId}
 *     status, phaseIndex, phaseName, players[{id,name,isBot,score}], winnerNames, updatedAt, createdAt
 *     state: JSON string of the full GameState (Firestore can't store nested arrays directly,
 *            and the engine state is only ever read back whole).
 */
export interface SavedGameSummary {
  id: string;
  status: GameState['status'];
  phaseIndex: number;
  phaseName: string;
  players: { id: string; name: string; isBot: boolean; score: number }[];
  winnerNames: string[];
  updatedAt: Date | null;
}

function summarize(game: GameState): Omit<SavedGameSummary, 'id' | 'updatedAt'> {
  const scores = totalScores(game);
  return {
    status: game.status,
    phaseIndex: game.phaseIndex,
    phaseName: PHASES[game.phaseIndex].name,
    players: game.players.map((p) => ({ id: p.id, name: p.name, isBot: p.isBot, score: scores[p.id] })),
    winnerNames: game.status === 'gameOver' ? leaders(game).map((p) => p.name) : [],
  };
}

async function gamesCollection() {
  const db = getFirestoreDb();
  const user = await ensureSignedIn();
  if (!db || !user) return null;
  return collection(db, 'users', user.uid, 'games');
}

/** Saves the game to Firestore. Returns false (without throwing) when cloud saves aren't available. */
export async function saveGame(game: GameState, createdAt: number): Promise<boolean> {
  try {
    const games = await gamesCollection();
    if (!games) return false;
    await setDoc(doc(games, game.id), {
      ...summarize(game),
      state: JSON.stringify(game),
      createdAt: new Date(createdAt),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.warn('[gameRepository] Failed to save game', error);
    return false;
  }
}

export async function listRecentGames(count = 10): Promise<SavedGameSummary[]> {
  try {
    const games = await gamesCollection();
    if (!games) return [];
    const snapshot = await getDocs(query(games, orderBy('updatedAt', 'desc'), limit(count)));
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        status: data.status,
        phaseIndex: data.phaseIndex,
        phaseName: data.phaseName,
        players: data.players ?? [],
        winnerNames: data.winnerNames ?? [],
        updatedAt: data.updatedAt?.toDate?.() ?? null,
      };
    });
  } catch (error) {
    console.warn('[gameRepository] Failed to load games', error);
    return [];
  }
}
