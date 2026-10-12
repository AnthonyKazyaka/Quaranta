import { GamePlayer, TableMeld } from '@quaranta/shared';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, seatColor, spacing } from '@/theme';
import { Appear, PressState, usePulse } from './motion';
import { PlayingCard } from './PlayingCard';

interface TableMeldsProps {
  melds: TableMeld[];
  players: GamePlayer[];
  cardWidth: number;
  /** Tapping a meld plays the selected cards onto it. */
  onMeldPress?: (meldId: string) => void;
  highlight: boolean;
  /** Lay player zones out side by side. */
  columns?: number;
}

/** The melds on the table, grouped into a zone per player in their seat color. */
export function TableMelds({ melds, players, cardWidth, onMeldPress, highlight, columns = 1 }: TableMeldsProps) {
  const pulse = usePulse(highlight, 1600);

  if (melds.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>The table is clear</Text>
        <Text style={styles.emptyText}>Melds appear here once players open.</Text>
      </View>
    );
  }

  const overlap = Math.round(cardWidth * 0.48);
  // Zones grow to share a row; the basis decides how many fit side by side.
  const zoneSize = { flexBasis: `${Math.floor(100 / columns) - 4}%` as const, flexGrow: 1 };
  return (
    <View style={styles.wrap}>
      {players.map((player, seat) => {
        const owned = melds.filter((m) => m.ownerId === player.id);
        if (owned.length === 0) return null;
        const accent = seatColor(seat);
        return (
          <Appear key={player.id} from="scale" style={[styles.zone, zoneSize, { borderLeftColor: accent }]}>
            <Text style={[styles.owner, { color: accent }]}>{player.name}</Text>
            <View style={styles.row}>
              {owned.map((meld) => (
                <Appear key={meld.id} from="scale">
                  <Pressable
                    onPress={onMeldPress ? () => onMeldPress(meld.id) : undefined}
                    disabled={!onMeldPress}
                    accessibilityRole="button"
                    accessibilityLabel={`${player.name}'s ${meld.kind} of ${meld.cards.length} cards`}
                    accessibilityHint="Plays your selected cards on this meld"
                    style={({ pressed, hovered }: PressState) => [
                      styles.meld,
                      highlight && styles.meldTarget,
                      highlight && hovered && styles.meldHover,
                      pressed && styles.meldPressed,
                    ]}
                  >
                    {highlight && (
                      <Animated.View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, styles.meldGlow, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.6] }) }]}
                      />
                    )}
                    {meld.cards.map((card, i) => (
                      <Appear key={card.id} from="above" style={{ marginLeft: i === 0 ? 0 : -overlap }}>
                        <PlayingCard card={card} width={cardWidth} />
                      </Appear>
                    ))}
                  </Pressable>
                </Appear>
              ))}
            </View>
          </Appear>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(242, 214, 150, 0.2)',
  },
  emptyTitle: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textFaint,
    fontSize: 13,
  },
  zone: {
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  owner: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  meld: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  meldTarget: {
    borderColor: 'rgba(242, 193, 78, 0.7)',
    borderStyle: 'dashed',
  },
  meldGlow: {
    borderRadius: radius.sm,
    backgroundColor: colors.goldSoft,
  },
  meldHover: {
    backgroundColor: colors.goldSoft,
  },
  meldPressed: {
    backgroundColor: 'rgba(242, 193, 78, 0.3)',
  },
});
