import { GamePlayer, TableMeld } from '@quaranta/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { PlayingCard } from './PlayingCard';

interface TableMeldsProps {
  melds: TableMeld[];
  players: GamePlayer[];
  cardWidth: number;
  /** Tapping a meld plays the selected cards onto it. */
  onMeldPress?: (meldId: string) => void;
  highlight: boolean;
}

export function TableMelds({ melds, players, cardWidth, onMeldPress, highlight }: TableMeldsProps) {
  if (melds.length === 0) {
    return <Text style={styles.empty}>No cards on the table yet.</Text>;
  }

  const overlap = Math.round(cardWidth * 0.45);
  return (
    <View style={styles.wrap}>
      {players.map((player) => {
        const owned = melds.filter((m) => m.ownerId === player.id);
        if (owned.length === 0) return null;
        return (
          <View key={player.id} style={styles.group}>
            <Text style={styles.owner}>{player.name}</Text>
            <View style={styles.row}>
              {owned.map((meld) => (
                <Pressable
                  key={meld.id}
                  onPress={onMeldPress ? () => onMeldPress(meld.id) : undefined}
                  disabled={!onMeldPress}
                  accessibilityRole="button"
                  accessibilityLabel={`${player.name}'s ${meld.kind} of ${meld.cards.length} cards`}
                  accessibilityHint="Plays your selected cards on this meld"
                  style={({ pressed }) => [styles.meld, highlight && styles.meldTarget, pressed && styles.meldPressed]}
                >
                  {meld.cards.map((card, i) => (
                    <View key={card.id} style={{ marginLeft: i === 0 ? 0 : -overlap }}>
                      <PlayingCard card={card} width={cardWidth} />
                    </View>
                  ))}
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  group: {
    gap: spacing.xs,
  },
  owner: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  meld: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  meldTarget: {
    borderColor: colors.gold,
    borderStyle: 'dashed',
  },
  meldPressed: {
    backgroundColor: colors.feltLight,
  },
});
