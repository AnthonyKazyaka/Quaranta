import { GameMode } from '@quaranta/shared';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Segmented } from '@/components/Segmented';
import {
  DEFAULT_TABLE_SETTINGS,
  MAX_TABLE_SEATS,
  MIN_TABLE_SEATS,
  TURN_SECONDS_OPTIONS,
  TableInfo,
  getOnlineService,
} from '@/services/online';
import { onlineEnabled } from '@/features';
import { useAccountStore } from '@/stores/accountStore';
import { useGameStore } from '@/stores/gameStore';
import { useOnlineStore } from '@/stores/onlineStore';
import { colors, radius, spacing } from '@/theme';

const SEAT_OPTIONS = Array.from({ length: MAX_TABLE_SEATS - MIN_TABLE_SEATS + 1 }, (_, i) => {
  const count = MIN_TABLE_SEATS + i;
  return { value: count, label: String(count) };
});
const MODE_OPTIONS: { value: GameMode; label: string }[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'paced', label: 'Own pace' },
];
const TIMER_OPTIONS = TURN_SECONDS_OPTIONS.map((seconds) => ({
  value: seconds,
  label: seconds >= 60 ? `${seconds / 60} min` : `${seconds} sec`,
}));

function tableSummary(table: TableInfo, uid: string): string {
  const names = table.seats.filter((s) => s.uid).map((s) => (s.uid === uid ? 'You' : s.name));
  const state = table.status === 'lobby' ? 'Waiting for players' : table.status === 'finished' ? 'Finished' : 'In progress';
  return `${state} · ${names.join(', ')}`;
}

export default function OnlineHubScreen() {
  const router = useRouter();
  const service = getOnlineService();
  const savedName = useGameStore((s) => s.playerName);
  const myTables = useOnlineStore((s) => s.myTables);
  const lobbyBusy = useOnlineStore((s) => s.lobbyBusy);
  const lobbyError = useOnlineStore((s) => s.lobbyError);
  const { createTable, joinTable, refreshMyTables } = useOnlineStore.getState();
  const account = useAccountStore();

  const [name, setName] = useState(savedName);
  const [seatCount, setSeatCount] = useState(DEFAULT_TABLE_SETTINGS.seatCount);
  const [mode, setMode] = useState<GameMode>(DEFAULT_TABLE_SETTINGS.mode);
  const [turnSeconds, setTurnSeconds] = useState<number>(DEFAULT_TABLE_SETTINGS.turnSeconds);
  const [fillWithBots, setFillWithBots] = useState(DEFAULT_TABLE_SETTINGS.fillWithBots);
  const [code, setCode] = useState('');

  // The persisted name arrives after the store rehydrates.
  useEffect(() => {
    if (savedName) setName((current) => current || savedName);
  }, [savedName]);

  useFocusEffect(
    useCallback(() => {
      useOnlineStore.setState({ lobbyError: null });
      void refreshMyTables();
    }, [refreshMyTables]),
  );

  const open = (gameId: string | null) => {
    if (gameId) router.push({ pathname: '/online/[gameId]', params: { gameId } });
  };
  const rememberName = () => useGameStore.setState({ playerName: name.trim() });

  if (!onlineEnabled) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Play online
          </Text>
          <Button label="Back" variant="secondary" compact onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </View>

        {service.isMock && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Demo mode: tables are simulated on this device, with pretend friends. Try the code DEMO to join one.
            </Text>
          </View>
        )}

        <View style={styles.panel}>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="You"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={20}
            accessibilityLabel="Your name"
          />
        </View>

        {myTables.length > 0 && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Your tables</Text>
            {myTables.map((table) => (
              <View key={table.gameId} style={styles.tableRow}>
                <View style={styles.tableText}>
                  <Text style={styles.tableCode}>{table.inviteCode}</Text>
                  <Text style={styles.muted} numberOfLines={2}>
                    {tableSummary(table, service.uid)}
                  </Text>
                </View>
                <Button label="Resume" compact onPress={() => open(table.gameId)} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Host a table</Text>
          <Text style={styles.label}>Seats</Text>
          <Segmented label="Seats" options={SEAT_OPTIONS} value={seatCount} onChange={setSeatCount} />
          <Text style={styles.label}>Game mode</Text>
          <Segmented label="Game mode" options={MODE_OPTIONS} value={mode} onChange={setMode} />
          <Text style={styles.label}>Time per turn</Text>
          <Segmented label="Time per turn" options={TIMER_OPTIONS} value={turnSeconds} onChange={setTurnSeconds} />
          <View style={styles.switchRow}>
            <Text style={[styles.label, styles.switchLabel]}>Fill empty seats with computer players</Text>
            <Switch
              value={fillWithBots}
              onValueChange={setFillWithBots}
              accessibilityLabel="Fill empty seats with computer players"
              trackColor={{ true: colors.gold, false: colors.border }}
            />
          </View>
          <Button
            label={lobbyBusy ? 'Creating…' : 'Create table'}
            disabled={lobbyBusy}
            onPress={async () => {
              rememberName();
              open(await createTable(name, { seatCount, mode, turnSeconds, fillWithBots }));
            }}
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Join with a code</Text>
          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="ABCD"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.codeInput]}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel="Invite code"
          />
          <Button
            label={lobbyBusy ? 'Joining…' : 'Join table'}
            disabled={lobbyBusy || code.length < 4}
            onPress={async () => {
              rememberName();
              open(await joinTable(code, name));
            }}
          />
          {lobbyError && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {lobbyError}
            </Text>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Account</Text>
          {account.linked ? (
            <>
              <Text style={styles.muted}>Signed in with {account.linked.displayName}. Your tables follow you across devices.</Text>
              <Button label="Unlink" variant="secondary" compact onPress={account.unlink} />
            </>
          ) : (
            <>
              <Text style={styles.muted}>
                You&apos;re playing as a guest on this device. Link a Google account to keep your tables on other devices.
              </Text>
              <Button
                label={account.linking ? 'Linking…' : 'Link Google account'}
                variant="secondary"
                disabled={account.linking}
                onPress={() => void account.linkGoogle()}
              />
              {account.linkError && (
                <Text style={styles.error} accessibilityLiveRegion="polite">
                  {account.linkError}
                </Text>
              )}
            </>
          )}
          <View style={styles.switchRow}>
            <Text style={[styles.label, styles.switchLabel]}>Tell me when it&apos;s my turn</Text>
            <Switch
              value={account.turnAlerts}
              onValueChange={account.setTurnAlerts}
              accessibilityLabel="Turn alerts"
              trackColor={{ true: colors.gold, false: colors.border }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.felt },
  content: { padding: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.gold, fontSize: 32, fontWeight: '900' },
  notice: { backgroundColor: colors.feltDark, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  noticeText: { color: colors.textMuted, fontSize: 13 },
  panel: { backgroundColor: colors.feltLight, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  panelTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 13 },
  input: {
    backgroundColor: colors.feltDark,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeInput: { textAlign: 'center', fontSize: 28, fontWeight: '800', letterSpacing: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchLabel: { flex: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tableText: { flex: 1 },
  tableCode: { color: colors.gold, fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  error: { color: colors.danger, fontSize: 14 },
});
