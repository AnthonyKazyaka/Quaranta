import { MAX_POINTS_PER_HAND, PHASES } from '@quaranta/shared';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { colors, radius, spacing } from '@/theme';

const TURN_RULES = [
  'Draw the top card of the deck or the top card of the discard pile.',
  "If you haven't opened this hand, you may open by laying down cards that meet the hand's requirement. You can't play anything else on the turn you open.",
  'Once open, on later turns you may lay down new runs or sets of 3+ cards, add cards to any meld on the table, and swap a natural card for a joker it stands in for.',
  'End your turn by discarding one card. A card that could be played on the table can\'t be discarded, and in the first two hands nobody may discard an Ace or face card until everyone has opened. If every card in your hand is blocked, discard anything.',
  'The first player to get rid of every card goes out and ends the hand.',
];

const SCORING = [
  '2 through 10: face value',
  'Jacks, Queens and Kings: 10',
  'Aces: 1 if you hold just one, otherwise 11 each',
  'Jokers: 25',
  `At most ${MAX_POINTS_PER_HAND} points per hand. In All Down, anyone left holding cards takes ${MAX_POINTS_PER_HAND}.`,
];

export default function RulesScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          How to play
        </Text>
        <Text style={styles.body}>
          Quaranta is played with two decks plus four jokers (108 cards). Everyone is dealt 13 cards. A game is eight
          hands, each with its own opening requirement. The dealer rotates every hand.
        </Text>

        <Section title="Melds">
          <Text style={styles.body}>
            A run is three or more cards in a row of one suit (Aces can be low or high, but runs don&apos;t wrap). A set is
            cards of one rank with no suit repeated. Jokers can stand in for any card unless the opening says otherwise.
          </Text>
        </Section>

        <Section title="The eight hands">
          {PHASES.map((phase, i) => (
            <View key={phase.condition} style={styles.phase}>
              <Text style={styles.phaseName}>
                {i + 1}. {phase.name}
              </Text>
              <Text style={styles.body}>{phase.description}</Text>
            </View>
          ))}
        </Section>

        <Section title="Your turn">
          {TURN_RULES.map((rule) => (
            <Text key={rule} style={styles.bullet}>
              • {rule}
            </Text>
          ))}
        </Section>

        <Section title="Scoring">
          <Text style={styles.body}>When someone goes out, everyone else scores the cards left in their hand:</Text>
          {SCORING.map((rule) => (
            <Text key={rule} style={styles.bullet}>
              • {rule}
            </Text>
          ))}
          <Text style={styles.body}>After eight hands, the lowest total wins.</Text>
        </Section>

        <Button label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.felt },
  content: { padding: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
  title: { color: colors.gold, fontSize: 32, fontWeight: '900' },
  section: { backgroundColor: colors.feltLight, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  bullet: { color: colors.text, fontSize: 15, lineHeight: 22 },
  phase: { gap: 2 },
  phaseName: { color: colors.gold, fontSize: 15, fontWeight: '700' },
});
