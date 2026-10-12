import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { GameTable } from '@/components/GameTable';
import { SeatStatus } from '@/components/PlayerStrip';
import { TurnTimer } from '@/components/TurnTimer';
import { DemoControls } from '@/components/online/DemoControls';
import { Lobby } from '@/components/online/Lobby';
import { OnlineBanner } from '@/components/online/OnlineBanner';
import { onlineEnabled } from '@/features';
import { getOnlineService } from '@/services/online';
import { useOnlineStore } from '@/stores/onlineStore';
import { colors, spacing } from '@/theme';

export default function OnlineTableScreen() {
  const router = useRouter();
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const service = getOnlineService();
  const ui = useOnlineStore();
  const { table, view, failure, connection, deadline, clockOffset } = ui;

  useEffect(() => {
    if (onlineEnabled && gameId) ui.openTable(gameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openTable is stable.
  }, [gameId]);

  // While this screen is showing there's no need for a "your turn" toast.
  useFocusEffect(
    useCallback(() => {
      useOnlineStore.getState().setViewing(true);
      return () => useOnlineStore.getState().setViewing(false);
    }, []),
  );

  const seatStatus = useMemo(() => {
    const status: Record<string, SeatStatus> = {};
    for (const seat of table?.seats ?? []) {
      if (seat.uid && !seat.isBot) status[seat.uid] = { connected: seat.connected, autoplay: seat.autoplay };
    }
    return status;
  }, [table]);

  if (!onlineEnabled) return <Redirect href="/" />;

  const toHub = () => router.replace('/online');
  const leave = async () => {
    await ui.leaveTable();
    toHub();
  };

  if (failure) {
    return (
      <Message title="This table is no longer available" detail={failure}>
        <Button label="Back to online play" onPress={() => { ui.closeTable(); toHub(); }} />
      </Message>
    );
  }

  if (!table || (table.status !== 'lobby' && !view)) {
    return (
      <Message title="Opening the table…">
        <ActivityIndicator color={colors.gold} />
      </Message>
    );
  }

  if (table.status === 'lobby') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Table {table.inviteCode}
            </Text>
            <Button label="Menu" variant="secondary" compact onPress={toHub} />
          </View>
          <OnlineBanner connection={connection} botIsPlayingForMe={false} onResume={() => {}} />
          <Lobby
            table={table}
            uid={service.uid}
            busy={ui.lobbyBusy}
            error={ui.lobbyError}
            onStart={() => void ui.startGame()}
            onSetSeat={(index, change) => void ui.setSeat(index, change)}
            onLeave={() => void leave()}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!view) return null;
  const mySeat = table.seats.find((s) => s.uid === service.uid);
  const live = connection === 'online';

  return (
    <GameTable
      view={view}
      ui={ui}
      onMenu={toHub}
      onExit={() => void leave()}
      seatStatus={seatStatus}
      locked={!live}
      lockedReason={live ? undefined : 'Waiting for the connection to come back…'}
      headerExtra={
        deadline && view.status === 'playing' ? <TurnTimer deadline={deadline} now={() => Date.now() + clockOffset} /> : null
      }
      banner={
        <>
          <OnlineBanner
            connection={connection}
            botIsPlayingForMe={!!mySeat?.autoplay}
            onResume={() => void ui.resumeSeat()}
            busy={ui.lobbyBusy}
          />
          <DemoControls gameId={table.gameId} />
        </>
      }
    />
  );
}

function Message({ title, detail, children }: { title: string; detail?: string; children?: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {detail && <Text style={styles.detail}>{detail}</Text>}
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.felt },
  content: { padding: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.gold, fontSize: 28, fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.lg },
  detail: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
});
