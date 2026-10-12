import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { getMockControls } from '@/services/online';
import { colors, radius, spacing } from '@/theme';

/**
 * Buttons for trying the awkward parts of online play without a real network: dropping the
 * connection and making a friend stop responding. Only shown while the backend is the mock.
 */
export function DemoControls({ gameId }: { gameId: string }) {
  const controls = getMockControls();
  const [open, setOpen] = useState(false);
  const [, refresh] = useState(0);
  if (!controls) return null;

  const online = controls.isOnline();
  const friends = controls.friends(gameId);

  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={styles.toggle}>
        <Text style={styles.toggleText}>{open ? 'Hide demo controls' : 'Demo controls'}</Text>
      </Pressable>
      {open && (
        <View style={styles.panel}>
          <Text style={styles.note}>The other players are simulated on this device.</Text>
          <View style={styles.row}>
            <Button
              label={online ? 'Drop my connection' : 'Reconnect'}
              variant="secondary"
              compact
              onPress={() => {
                controls.setOnline(!online);
                refresh((n) => n + 1);
              }}
            />
            {friends.map((friend) => (
              <Button
                key={friend.seatIndex}
                label={friend.idle ? `Wake ${friend.name}` : `Freeze ${friend.name}`}
                variant="secondary"
                compact
                onPress={() => {
                  controls.setIdle(gameId, friend.seatIndex, !friend.idle);
                  refresh((n) => n + 1);
                }}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.sm, paddingTop: spacing.xs },
  toggle: { alignSelf: 'flex-start', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  toggleText: { color: colors.textMuted, fontSize: 12, textDecorationLine: 'underline' },
  panel: { backgroundColor: colors.feltDark, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  note: { color: colors.textMuted, fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
