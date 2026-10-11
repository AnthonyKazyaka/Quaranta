import { PHASES } from '@quaranta/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { isFirebaseConfigured } from '@/services/firebase';
import { SavedGameSummary, listRecentGames } from '@/services/gameRepository';
import { useGameStore } from '@/stores/gameStore';
import { colors, radius, spacing } from '@/theme';

const BOT_OPTIONS = [1, 2, 3];

export default function HomeScreen() {
  const router = useRouter();
  const game = useGameStore((s) => s.game);
  const savedName = useGameStore((s) => s.playerName);
  const startGame = useGameStore((s) => s.startGame);
  const [name, setName] = useState(savedName);
  const [botCount, setBotCount] = useState(3);
  const [recent, setRecent] = useState<SavedGameSummary[]>([]);
  const cloudEnabled = isFirebaseConfigured();

  // The persisted name arrives after the store rehydrates.
  useEffect(() => {
    if (savedName) setName((current) => current || savedName);
  }, [savedName]);

  useEffect(() => {
    if (cloudEnabled) listRecentGames(5).then(setRecent);
  }, [cloudEnabled, game?.status]);

  const canContinue = game && game.status !== 'gameOver';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title} accessibilityRole="header">
            Quaranta
          </Text>
          <Text style={styles.tagline}>A rummy game in eight hands. Lowest score wins.</Text>
        </View>

        {canContinue && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Game in progress</Text>
            <Text style={styles.muted}>
              Hand {game.phaseIndex + 1} of {PHASES.length}: {PHASES[game.phaseIndex].name} ·{' '}
              {game.players.map((p) => p.name).join(', ')}
            </Text>
            <Button label="Continue" onPress={() => router.push('/game')} />
          </View>
        )}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>New game</Text>
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
          <Text style={styles.label}>Computer opponents</Text>
          <View style={styles.segment} accessibilityRole="radiogroup">
            {BOT_OPTIONS.map((count) => (
              <Pressable
                key={count}
                onPress={() => setBotCount(count)}
                accessibilityRole="radio"
                accessibilityState={{ checked: botCount === count }}
                style={[styles.segmentItem, botCount === count && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, botCount === count && styles.segmentTextActive]}>{count}</Text>
              </Pressable>
            ))}
          </View>
          <Button
            label={canContinue ? 'Start over with a new game' : 'Deal me in'}
            variant={canContinue ? 'secondary' : 'primary'}
            onPress={() => {
              startGame(name, botCount);
              router.push('/game');
            }}
          />
        </View>

        <Button label="How to play" variant="secondary" onPress={() => router.push('/rules')} />

        {recent.length > 0 && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Recent games</Text>
            {recent.map((g) => (
              <View key={g.id} style={styles.recentRow}>
                <Text style={styles.recentText} numberOfLines={1}>
                  {g.players.map((p) => `${p.name} ${p.score}`).join(' · ')}
                </Text>
                <Text style={styles.muted}>
                  {g.status === 'gameOver' ? `Winner: ${g.winnerNames.join(' & ')}` : `In progress, hand ${g.phaseIndex + 1}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          {cloudEnabled ? 'Games sync to the cloud.' : 'Playing offline. Games are saved on this device.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.felt },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  hero: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  title: { color: colors.gold, fontSize: 48, fontWeight: '900', letterSpacing: 2 },
  tagline: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
  panel: {
    backgroundColor: colors.feltLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
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
  segment: { flexDirection: 'row', gap: spacing.sm },
  segmentItem: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.feltDark,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  segmentText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  segmentTextActive: { color: colors.feltDark },
  recentRow: { gap: 2 },
  recentText: { color: colors.text, fontSize: 14 },
  footer: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
