import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { TableInfo, TableSeat } from '@/services/online';
import { useToastStore } from '@/stores/toastStore';
import { colors, radius, spacing } from '@/theme';
import { shareText } from '@/utils/share';

interface LobbyProps {
  table: TableInfo;
  uid: string;
  busy: boolean;
  error: string | null;
  onStart: () => void;
  onSetSeat: (seatIndex: number, change: 'bot' | 'open') => void;
  onLeave: () => void;
}

/** How a seat reads in the list. */
export function seatLabel(seat: TableSeat, uid: string): string {
  if (!seat.uid) return 'Open seat';
  // A player who just kept the default name "You" doesn't need to be told twice.
  return seat.uid === uid && seat.name.toLowerCase() !== 'you' ? `${seat.name} (you)` : seat.name;
}

export function Lobby({ table, uid, busy, error, onStart, onSetSeat, onLeave }: LobbyProps) {
  const isHost = table.hostUid === uid;
  const seated = table.seats.filter((s) => s.uid).length;
  const open = table.seats.length - seated;
  const hostName = table.seats.find((s) => s.uid === table.hostUid)?.name ?? 'the host';
  const canStart = isHost && !busy && (open === 0 || table.settings.fillWithBots);

  const share = async () => {
    const outcome = await shareText(`Join my Quaranta table! Invite code: ${table.inviteCode}`);
    if (outcome === 'copied') useToastStore.getState().show({ text: 'Invite copied. Paste it into a message.' });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.panel}>
        <Text style={styles.label}>Invite code</Text>
        <Text style={styles.code} accessibilityLabel={`Invite code ${table.inviteCode.split('').join(' ')}`} selectable>
          {table.inviteCode}
        </Text>
        <Text style={styles.muted}>Friends can join from Play online → Join with a code.</Text>
        <Button label="Share invite" variant="secondary" onPress={share} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Table settings</Text>
        <Text style={styles.muted}>
          {table.settings.mode === 'paced' ? 'Own pace' : 'Classic'} · {table.settings.seatCount} seats ·{' '}
          {table.settings.turnSeconds}s turns ·{' '}
          {table.settings.fillWithBots ? 'computer players fill empty seats' : 'every seat needs a person'}
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>
          Players · {seated} of {table.seats.length}
        </Text>
        {table.seats.map((seat, index) => {
          const isMe = seat.uid === uid;
          return (
            <View key={index} style={styles.seat} accessibilityLabel={seatLabel(seat, uid)}>
              <View style={[styles.avatar, !seat.uid && styles.avatarEmpty]}>
                <Text style={[styles.avatarText, !seat.uid && styles.avatarTextEmpty]}>{seat.uid ? seat.name.slice(0, 1).toUpperCase() : '+'}</Text>
              </View>
              <View style={styles.seatText}>
                <Text style={[styles.seatName, !seat.uid && styles.muted]} numberOfLines={1}>
                  {seatLabel(seat, uid)}
                </Text>
                <Text style={styles.muted}>
                  {[
                    seat.uid === table.hostUid ? 'Host' : '',
                    seat.isBot ? 'Computer' : '',
                    !seat.uid ? 'Waiting for a player…' : '',
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Ready'}
                </Text>
              </View>
              {isHost && !isMe && !seat.uid && (
                <Button label="Add computer" variant="secondary" compact disabled={busy} onPress={() => onSetSeat(index, 'bot')} />
              )}
              {isHost && !isMe && !!seat.uid && (
                <Button label="Remove" variant="ghost" compact disabled={busy} onPress={() => onSetSeat(index, 'open')} />
              )}
            </View>
          );
        })}
      </View>

      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}

      {isHost ? (
        <>
          <Button label={busy ? 'Starting…' : 'Start game'} disabled={!canStart} onPress={onStart} />
          <Text style={styles.muted}>
            {open === 0
              ? 'Everyone is here.'
              : table.settings.fillWithBots
                ? `${open} empty seat${open > 1 ? 's' : ''} will be filled by computer players.`
                : `Waiting for ${open} more player${open > 1 ? 's' : ''}.`}
          </Text>
        </>
      ) : (
        <Text style={styles.waiting} accessibilityLiveRegion="polite">
          Waiting for {hostName} to start the game…
        </Text>
      )}
      <Button label="Leave table" variant="ghost" onPress={onLeave} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  panel: { backgroundColor: colors.feltLight, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  panelTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  code: { color: colors.gold, fontSize: 48, fontWeight: '900', letterSpacing: 8, textAlign: 'center' },
  muted: { color: colors.textMuted, fontSize: 13 },
  seat: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmpty: { backgroundColor: colors.feltDark, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  avatarText: { color: colors.feltDark, fontWeight: '900', fontSize: 16 },
  avatarTextEmpty: { color: colors.textMuted },
  seatText: { flex: 1 },
  seatName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 14 },
  waiting: { color: colors.text, fontSize: 15, textAlign: 'center' },
});
