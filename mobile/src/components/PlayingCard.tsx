import { Card, SUIT_SYMBOLS, isRedSuit, rankLabel } from '@quaranta/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';

interface PlayingCardProps {
  card: Card;
  width: number;
  selected?: boolean;
  dimmed?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
}

export function cardAccessibilityLabel(card: Card): string {
  if (card.joker) {
    return card.represents
      ? `Joker as ${rankLabel(card.represents.rank)} of ${card.represents.suit}`
      : 'Joker';
  }
  return `${rankLabel(card.rank)} of ${card.suit}`;
}

export function PlayingCard({ card, width, selected, dimmed, onPress, accessibilityHint }: PlayingCardProps) {
  const height = Math.round(width * 1.4);
  const value = card.joker ? card.represents : card;
  const color = value ? (isRedSuit(value.suit) ? colors.cardRed : colors.cardBlack) : colors.cardBlack;
  const corner = Math.max(10, Math.round(width * 0.26));

  const face = (
    <View
      style={[
        styles.card,
        { width, height, borderRadius: Math.max(4, width * 0.1) },
        selected && styles.selected,
        dimmed && styles.dimmed,
      ]}
    >
      {card.joker ? (
        <>
          <Text style={[styles.joker, { fontSize: width * 0.42 }]}>★</Text>
          <Text style={[styles.jokerLabel, { fontSize: Math.max(7, width * 0.14) }]}>JOKER</Text>
          {value && (
            <Text style={[styles.represents, { fontSize: Math.max(8, width * 0.17), color }]}>
              {rankLabel(value.rank)}
              {SUIT_SYMBOLS[value.suit]}
            </Text>
          )}
        </>
      ) : (
        <>
          <View style={styles.corner}>
            <Text style={[styles.cornerRank, { fontSize: corner, lineHeight: corner * 1.05, color }]}>{rankLabel(card.rank)}</Text>
            <Text style={{ fontSize: corner * 0.8, lineHeight: corner * 0.9, color }}>{SUIT_SYMBOLS[card.suit]}</Text>
          </View>
          <Text style={[styles.suit, { fontSize: width * 0.45, color }]}>{SUIT_SYMBOLS[card.suit]}</Text>
        </>
      )}
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={cardAccessibilityLabel(card)}>
        {face}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={cardAccessibilityLabel(card)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [{ transform: [{ translateY: selected ? -10 : pressed ? -4 : 0 }] }]}
    >
      {face}
    </Pressable>
  );
}

export function CardBack({ width, label }: { width: number; label?: string }) {
  const height = Math.round(width * 1.4);
  return (
    <View style={[styles.back, { width, height, borderRadius: Math.max(4, width * 0.1) }]}>
      <View style={styles.backInner}>
        <Text style={[styles.backText, { fontSize: Math.max(10, width * 0.22) }]}>{label ?? 'Q'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardFace,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  selected: {
    borderColor: colors.selected,
    borderWidth: 3,
  },
  dimmed: {
    opacity: 0.45,
  },
  corner: {
    position: 'absolute',
    top: 2,
    left: 4,
    alignItems: 'center',
  },
  cornerRank: {
    fontWeight: '700',
  },
  suit: {
    marginTop: '30%',
    marginLeft: '25%',
  },
  joker: {
    color: colors.goldDark,
  },
  jokerLabel: {
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.cardBlack,
  },
  represents: {
    position: 'absolute',
    top: 2,
    left: 4,
    fontWeight: '700',
  },
  back: {
    backgroundColor: colors.cardBack,
    borderWidth: 2,
    borderColor: colors.cardFace,
    padding: 4,
  },
  backInner: {
    flex: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBackAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.cardFace,
    fontWeight: '800',
  },
});
