import { actorsToMove, getPlayer } from '@quaranta/shared';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { GameTable } from '@/components/GameTable';
import { localView, useGameStore } from '@/stores/gameStore';

/** Pause between bot moves so people can follow along. */
const BOT_DELAY_MS = 650;

export default function GameScreen() {
  const router = useRouter();
  const ui = useGameStore();
  const { game, humanId } = ui;
  const view = useMemo(() => localView(game, humanId), [game, humanId]);

  // Drive bot turns (and bots deciding whether to buy) one action at a time.
  useEffect(() => {
    if (!game || game.status !== 'playing' || !actorsToMove(game).some((id) => getPlayer(game, id).isBot)) return;
    const timer = setTimeout(() => useGameStore.getState().runBotStep(), BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [game]);

  if (!view) return <Redirect href="/" />;

  return (
    <GameTable
      view={view}
      ui={ui}
      onMenu={() => router.replace('/')}
      onExit={() => {
        ui.quitGame();
        router.replace('/');
      }}
    />
  );
}
