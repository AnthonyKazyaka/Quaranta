import { viewBuyOfferKey, viewCanBuy } from '@quaranta/shared';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { GameTable } from '@/components/GameTable';
import { localView, useGameStore } from '@/stores/gameStore';

/** Pause between bot moves so people can follow along. */
const BOT_DELAY_MS = 700;
/** How long the table waits for you to decide on buying before the bot carries on. */
const BUY_DECISION_MS = 4000;

export default function GameScreen() {
  const router = useRouter();
  const ui = useGameStore();
  const { game, humanId, buyPassedKey } = ui;
  const view = useMemo(() => localView(game, humanId), [game, humanId]);

  // A buy offer is waiting on the human until they buy, pass, or the decision time runs out.
  const offerKey = view && humanId && viewCanBuy(view, humanId) ? viewBuyOfferKey(view) : null;
  const awaitingBuy = offerKey !== null && offerKey !== buyPassedKey ? offerKey : null;
  const offerDeadline = useRef<{ key: string; at: number } | null>(null);

  // Drive bot turns one action at a time, pausing while you decide whether to buy.
  useEffect(() => {
    if (!game || game.status !== 'playing' || !game.players[game.currentPlayerIndex].isBot) return;
    let delay = BOT_DELAY_MS;
    if (awaitingBuy) {
      if (offerDeadline.current?.key !== awaitingBuy) offerDeadline.current = { key: awaitingBuy, at: Date.now() + BUY_DECISION_MS };
      delay = Math.max(delay, offerDeadline.current.at - Date.now());
    }
    const timer = setTimeout(() => useGameStore.getState().runBotStep(), delay);
    return () => clearTimeout(timer);
  }, [game, awaitingBuy]);

  if (!view) return <Redirect href="/" />;

  return (
    <GameTable
      view={view}
      ui={ui}
      buyDecisionMs={BUY_DECISION_MS}
      onMenu={() => router.replace('/')}
      onExit={() => {
        ui.quitGame();
        router.replace('/');
      }}
    />
  );
}
