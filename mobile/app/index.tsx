import { Card, PHASES } from '@quaranta/shared';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Appear, PressState, prefersReducedMotion, useNativeDriver } from '@/components/motion';
import { PlayingCard } from '@/components/PlayingCard';
import { Screen } from '@/components/Screen';
import { isFirebaseConfigured } from '@/services/firebase';
import { SavedGameSummary, listRecentGames } from '@/services/gameRepository';
import { BOT_NAMES, useGameStore } from '@/stores/gameStore';
import { colors, fonts, radius, seatColor, spacing } from '@/theme';

const BOT_OPTIONS = [1, 2, 3];

const HERO_CARDS: Card[] = [
  { id: 'hero-q', joker: false, suit: 'hearts', rank: 12 },
  { id: 'hero-a', joker: false, suit: 'spades', rank: 1 },
  { id: 'hero-joker', joker: true, represents: null },
  { id: 'hero-k', joker: false, suit: 'diamonds', rank: 13 },
];

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
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <CardFan />
          <Appear delay={150}>
            <Text style={styles.title} accessibilityRole="header">
              Quaranta
            </Text>
          </Appear>
          <Appear delay={250}>
            <Text style={styles.tagline}>A rummy game in eight hands. Lowest score wins.</Text>
          </Appear>
        </View>

        {canContinue && (
          <Appear delay={300} style={[styles.panel, styles.continuePanel]}>
            <View style={styles.panelHead}>
              <Text style={styles.panelTitle}>Game in progress</Text>
              <Text style={styles.badge}>
                Hand {game.phaseIndex + 1}/{PHASES.length}
              </Text>
            </View>
            <Text style={styles.muted}>
              {PHASES[game.phaseIndex].name} · {game.players.map((p) => p.name).join(', ')}
            </Text>
            <Button label="Continue game" onPress={() => router.push('/game')} />
          </Appear>
        )}

        <Appear delay={canContinue ? 380 : 300} style={styles.panel}>
          <Text style={styles.panelTitle}>New game</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Your name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="You"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              maxLength={20}
              accessibilityLabel="Your name"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Computer opponents</Text>
            <View style={styles.segment} accessibilityRole="radiogroup">
              {BOT_OPTIONS.map((count) => (
                <Pressable
                  key={count}
                  onPress={() => setBotCount(count)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: botCount === count }}
                  accessibilityLabel={`${count} ${count === 1 ? 'opponent' : 'opponents'}`}
                  style={({ hovered }: PressState) => [
                    styles.segmentItem,
                    hovered && styles.segmentHover,
                    botCount === count && styles.segmentActive,
                  ]}
                >
                  <Text style={[styles.segmentText, botCount === count && styles.segmentTextActive]}>{count}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.opponents}>
              {BOT_NAMES.slice(0, botCount).map((bot, i) => (
                <Appear key={bot} from="scale" style={styles.opponent}>
                  <View style={[styles.opponentDot, { backgroundColor: seatColor(i + 1) }]} />
                  <Text style={styles.opponentName}>{bot}</Text>
                </Appear>
              ))}
            </View>
          </View>
          <Button
            label={canContinue ? 'Start over with a new game' : 'Deal me in'}
            variant={canContinue ? 'secondary' : 'primary'}
            onPress={() => {
              startGame(name, botCount);
              router.push('/game');
            }}
          />
        </Appear>

        <Appear delay={460}>
          <Button label="How to play" variant="ghost" onPress={() => router.push('/rules')} />
        </Appear>

        {recent.length > 0 && (
          <Appear delay={500} style={styles.panel}>
            <Text style={styles.panelTitle}>Recent games</Text>
            {recent.map((g, i) => (
              <View key={g.id} style={[styles.recentRow, i > 0 && styles.recentDivider]}>
                <Text style={styles.recentText} numberOfLines={1}>
                  {g.players.map((p) => `${p.name} ${p.score}`).join(' · ')}
                </Text>
                <Text style={styles.muted}>
                  {g.status === 'gameOver' ? `Winner: ${g.winnerNames.join(' & ')}` : `In progress, hand ${g.phaseIndex + 1}`}
                </Text>
              </View>
            ))}
          </Appear>
        )}

        <View style={styles.footer}>
          <View style={[styles.statusDot, { backgroundColor: cloudEnabled ? '#7fd69a' : colors.textFaint }]} />
          <Text style={styles.footerText}>
            {cloudEnabled ? 'Games sync to the cloud.' : 'Playing offline. Games are saved on this device.'}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Four cards that fan open when the menu appears. */
function CardFan() {
  const spread = useRef(new Animated.Value(prefersReducedMotion() ? 1 : 0)).current;
  useEffect(() => {
    if (prefersReducedMotion()) return;
    Animated.spring(spread, { toValue: 1, friction: 7, tension: 40, delay: 100, useNativeDriver }).start();
  }, [spread]);

  const width = 64;
  const mid = (HERO_CARDS.length - 1) / 2;
  return (
    <View style={styles.fan} aria-hidden>
      {HERO_CARDS.map((card, i) => {
        const offset = i - mid;
        return (
          <Animated.View
            key={card.id}
            style={[
              styles.fanCard,
              {
                marginLeft: -width / 2,
                transform: [
                  { translateX: spread.interpolate({ inputRange: [0, 1], outputRange: [0, offset * 30] }) },
                  { translateY: spread.interpolate({ inputRange: [0, 1], outputRange: [6, Math.abs(offset) * 7] }) },
                  { rotate: spread.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${offset * 9}deg`] }) },
                ],
              },
            ]}
          >
            <PlayingCard card={card} width={width} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  hero: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.sm, gap: spacing.xs },
  fan: { width: 220, height: 120, marginBottom: spacing.sm },
  fanCard: { position: 'absolute', left: '50%', top: 8 },
  title: {
    color: colors.gold,
    fontSize: 54,
    fontFamily: fonts.displayHeavy,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  tagline: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: spacing.lg + 2,
    gap: spacing.md + 2,
  },
  continuePanel: { borderColor: 'rgba(242, 193, 78, 0.35)' },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { color: colors.text, fontSize: 20, fontFamily: fonts.display },
  badge: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: colors.goldSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  field: { gap: spacing.sm },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  muted: { color: colors.textMuted, fontSize: 13 },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  segment: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.md + 2,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  segmentItem: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md - 2,
    alignItems: 'center',
  },
  segmentHover: { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  segmentActive: { backgroundColor: colors.gold },
  segmentText: { color: colors.text, fontSize: 16, fontWeight: '800', userSelect: 'none' },
  segmentTextActive: { color: colors.feltDeep },
  opponents: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  opponent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  opponentDot: { width: 8, height: 8, borderRadius: 4 },
  opponentName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  recentRow: { gap: 2, paddingTop: spacing.xs },
  recentDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.panelBorder,
    paddingTop: spacing.sm,
  },
  recentText: { color: colors.text, fontSize: 14 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingBottom: spacing.lg },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  footerText: { color: colors.textMuted, fontSize: 12 },
});
