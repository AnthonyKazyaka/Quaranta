import { Card, Rank, SUIT_SYMBOLS, Suit, isRedSuit, rankLabel } from '@quaranta/shared';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, shadows } from '@/theme';
import { PressState, prefersReducedMotion, useNativeDriver, useSpring } from './motion';

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

export function cardHeight(width: number): number {
  return Math.round(width * 1.4);
}

function cardRadius(width: number): number {
  return Math.max(4, Math.round(width * 0.09));
}

const suitColor = (suit: Suit) => (isRedSuit(suit) ? colors.cardRed : colors.cardBlack);

export function PlayingCard({ card, width, selected, dimmed, onPress, accessibilityHint }: PlayingCardProps) {
  const height = cardHeight(width);
  const lift = useSpring(!!selected);
  const press = useRef(new Animated.Value(1)).current;

  const face = (
    <View
      style={[
        styles.card,
        { width, height, borderRadius: cardRadius(width) },
        selected && styles.selected,
        dimmed && styles.dimmed,
      ]}
    >
      {card.joker ? <JokerFace width={width} represents={card.represents} /> : <NaturalFace width={width} rank={card.rank} suit={card.suit} />}
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={cardAccessibilityLabel(card)}>
        {face}
      </View>
    );
  }

  const pressTo = (toValue: number) => {
    if (prefersReducedMotion()) return;
    Animated.spring(press, { toValue, friction: 6, tension: 300, useNativeDriver }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => pressTo(0.95)}
      onPressOut={() => pressTo(1)}
      accessibilityRole="button"
      accessibilityLabel={cardAccessibilityLabel(card)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: !!selected }}
      style={({ hovered }: PressState) => [hovered && !selected && styles.hovered]}
    >
      <Animated.View
        style={{
          transform: [
            { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -Math.round(height * 0.14)] }) },
            { scale: press },
          ],
        }}
      >
        {face}
      </Animated.View>
    </Pressable>
  );
}

/** Rank over suit, as printed in a card's corner. */
function CornerIndex({ label, suit, size, color, flipped }: { label: string; suit: string; size: number; color: string; flipped?: boolean }) {
  return (
    <View style={[styles.index, flipped && styles.indexFlipped]}>
      <Text style={[styles.indexRank, { fontSize: size, lineHeight: size * 1.02, color, letterSpacing: label.length > 1 ? -1 : 0 }]}>
        {label}
      </Text>
      <Text style={[styles.noSelect, { fontSize: size * 0.78, lineHeight: size * 0.86, color }]}>{suit}</Text>
    </View>
  );
}

function NaturalFace({ width, rank, suit }: { width: number; rank: Rank; suit: Suit }) {
  const color = suitColor(suit);
  const symbol = SUIT_SYMBOLS[suit];
  const indexSize = Math.max(10, Math.round(width * 0.25));
  // Small table cards are mostly covered by their neighbours; a plain pip reads better there.
  const isCourt = rank > 10 && width >= 40;
  return (
    <>
      <CornerIndex label={rankLabel(rank)} suit={symbol} size={indexSize} color={color} />
      {width >= 56 && <CornerIndex label={rankLabel(rank)} suit={symbol} size={indexSize} color={color} flipped />}
      {isCourt ? (
        <View style={[styles.court, { borderColor: color, borderRadius: Math.max(2, width * 0.05) }]}>
          <Text style={[styles.courtLetter, { fontSize: width * 0.4, lineHeight: width * 0.48, color }]}>{rankLabel(rank)}</Text>
          <Text style={[styles.noSelect, { fontSize: width * 0.2, lineHeight: width * 0.24, color }]}>{symbol}</Text>
        </View>
      ) : (
        <Text style={[styles.pip, { fontSize: width * (rank === 1 ? 0.6 : 0.46), color }]}>{symbol}</Text>
      )}
    </>
  );
}

function JokerFace({ width, represents }: { width: number; represents: { rank: Rank; suit: Suit } | null }) {
  const indexSize = Math.max(10, Math.round(width * 0.25));
  return (
    <>
      {represents ? (
        <CornerIndex label={rankLabel(represents.rank)} suit={SUIT_SYMBOLS[represents.suit]} size={indexSize} color={suitColor(represents.suit)} />
      ) : (
        <View style={styles.index}>
          <Text style={[styles.indexRank, { fontSize: indexSize * 0.9, color: colors.goldDark }]}>★</Text>
        </View>
      )}
      <View style={styles.jokerCenter}>
        <Text style={[styles.jokerStar, { fontSize: width * 0.44, lineHeight: width * 0.5 }]}>★</Text>
        <Text style={[styles.jokerLabel, { fontSize: Math.max(7, width * 0.13) }]}>JOKER</Text>
      </View>
    </>
  );
}

export function CardBack({ width, label }: { width: number; label?: string }) {
  const height = cardHeight(width);
  const emblem = Math.max(16, Math.round(width * 0.5));
  return (
    <View style={[styles.back, { width, height, borderRadius: cardRadius(width), padding: Math.max(3, width * 0.07) }]}>
      <View style={[styles.backInner, { borderRadius: Math.max(2, cardRadius(width) - 3) }]}>
        <View style={[styles.backEmblem, { width: emblem, height: emblem, borderRadius: emblem / 2 }]}>
          <Text style={[styles.backText, { fontSize: emblem * 0.56, lineHeight: emblem * 0.7 }]}>{label ?? 'Q'}</Text>
        </View>
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
    overflow: 'hidden',
    boxShadow: shadows.card,
  },
  selected: {
    borderColor: colors.selected,
    boxShadow: shadows.cardLifted,
  },
  hovered: {
    transform: [{ translateY: -3 }],
  },
  dimmed: {
    opacity: 0.45,
  },
  noSelect: {
    userSelect: 'none',
  },
  index: {
    position: 'absolute',
    top: 3,
    left: 3,
    alignItems: 'center',
    minWidth: 12,
  },
  indexFlipped: {
    top: undefined,
    left: undefined,
    bottom: 3,
    right: 3,
    transform: [{ rotate: '180deg' }],
  },
  indexRank: {
    fontWeight: '800',
    userSelect: 'none',
  },
  pip: {
    marginTop: '18%',
    marginLeft: '14%',
    userSelect: 'none',
  },
  court: {
    marginTop: '18%',
    marginLeft: '14%',
    width: '58%',
    height: '58%',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardFaceShade,
    opacity: 0.95,
  },
  courtLetter: {
    fontFamily: fonts.displayHeavy,
    userSelect: 'none',
  },
  jokerCenter: {
    marginTop: '16%',
    alignItems: 'center',
  },
  jokerStar: {
    color: colors.goldDark,
    userSelect: 'none',
  },
  jokerLabel: {
    fontFamily: fonts.display,
    letterSpacing: 1,
    color: colors.cardBlack,
    userSelect: 'none',
  },
  back: {
    backgroundColor: colors.cardBack,
    borderWidth: 1,
    borderColor: colors.cardBackDark,
    boxShadow: shadows.card,
  },
  backInner: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBackAccent,
    backgroundColor: colors.cardBackDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backEmblem: {
    borderWidth: 1,
    borderColor: colors.cardBackAccent,
    backgroundColor: colors.cardBack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.cardBackAccent,
    fontFamily: fonts.displayHeavy,
    userSelect: 'none',
  },
});
