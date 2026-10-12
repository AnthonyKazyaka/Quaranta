import { MAX_POINTS_PER_HAND, PHASES, STAKES, formatCents } from '@quaranta/shared';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Appear } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { onlineEnabled } from '@/features';
import { colors, fonts, radius, spacing } from '@/theme';

const TURN_RULES = [
  'Draw the top card of the deck or the top card of the discard pile.',
  "If you haven't opened this hand, you may open by laying down cards that meet the hand's requirement. You can't play anything else on the turn you open.",
  'Once open, on later turns you may lay down new runs or sets of 3+ cards, add cards to any meld on the table, and swap a natural card for a joker it stands in for.',
  'End your turn by discarding one card. A card that could be played on the table can\'t be discarded, and in the first two hands nobody may discard an Ace or face card until everyone has opened. If every card in your hand is blocked, discard anything.',
  'The first player to get rid of every card goes out and ends the hand.',
];

const BUYING = [
  "When the player whose turn it is draws from the deck instead of taking the top discard, anyone else may buy that discard. It's open to everyone, whether or not they've opened.",
  "Every card is for sale except jokers and the card turned up when the hand is dealt.",
  'The offer stays open until that player discards. If several people want the card, it goes to the first of them in turn order after that player.',
  `A buyer takes just the one card and puts ${formatCents(STAKES.buy)} in the pot. There's no limit, but every card you buy is one more you could be caught holding when someone goes out.`,
];

const OWN_PACE_RULES = [
  'Each player works on their own opening. Everyone starts with High Pair.',
  "After a hand in which you opened, you move on to the next opening. If you didn't open, you try the same one again.",
  'The game ends after the hand in which someone opens with All Down, or after 20 hands. The player who completed the most openings wins, and points break ties.',
];

const ONLINE_RULES =
  "Host a table or join with a four-letter invite code. Every turn has a time limit; if you run out, a computer player plays your turn, and after two missed turns it takes your seat until you tap I'm back. Empty seats can be filled with computer players.";

const STAKES_RULES = [
  `Everyone antes ${formatCents(STAKES.ante)} into the pot at the start of each hand.`,
  'Whoever goes out takes the pot. A hand only ends when someone goes out: if the deck runs dry, the discards are shuffled into a new one.',
  `The winner of the game collects ${formatCents(STAKES.gameWin)} from every other player. Players tied for first split it.`,
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
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} accessibilityRole="header">
            How to play
          </Text>
          <Button label="Back" variant="secondary" compact onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </View>
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
              <View style={styles.phaseNumber}>
                <Text style={styles.phaseNumberText}>{i + 1}</Text>
              </View>
              <View style={styles.phaseText}>
                <Text style={styles.phaseName}>{phase.name}</Text>
                <Text style={styles.body}>{phase.description}</Text>
              </View>
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

        <Section title="Buying">
          {BUYING.map((rule) => (
            <Text key={rule} style={styles.bullet}>
              • {rule}
            </Text>
          ))}
        </Section>

        <Section title="Own pace mode">
          {OWN_PACE_RULES.map((rule) => (
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
          <Text style={styles.body}>After eight hands, the lowest total wins (in Own pace mode, see above).</Text>
        </Section>

        <Section title="Stakes">
          {STAKES_RULES.map((rule) => (
            <Text key={rule} style={styles.bullet}>
              • {rule}
            </Text>
          ))}
        </Section>

        {onlineEnabled && (
          <Section title="Playing online">
            <Text style={styles.body}>{ONLINE_RULES}</Text>
          </Section>
        )}

        <Button label="Back to the table" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Appear style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </Appear>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.md },
  title: { color: colors.gold, fontSize: 36, fontFamily: fonts.displayHeavy },
  section: {
    backgroundColor: colors.panel,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: spacing.lg + 2,
    gap: spacing.sm + 2,
  },
  sectionTitle: { color: colors.text, fontSize: 20, fontFamily: fonts.display },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  bullet: { color: colors.text, fontSize: 15, lineHeight: 22 },
  phase: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  phaseNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  phaseNumberText: { color: colors.gold, fontWeight: '900', fontSize: 13 },
  phaseText: { flex: 1, gap: 2 },
  phaseName: { color: colors.gold, fontSize: 15, fontWeight: '800' },
});
