import { Card, STAKES, cardLabel, formatCents } from '@quaranta/shared';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { Button } from './Button';
import { Appear, prefersReducedMotion } from './motion';
import { PlayingCard } from './PlayingCard';

interface BuyOfferProps {
  card: Card;
  /** The player whose turn it is; the offer closes when they discard. */
  sellerName: string;
  /** Whether the human has already asked to buy this card. */
  requested: boolean;
  /** Other players who have asked for it. */
  rivals: string[];
  cardWidth: number;
  /** How long the table waits for a decision before play carries on. Leave out when it does not wait. */
  decisionMs?: number;
  onBuy: () => void;
  onPass: () => void;
}

/** Offers the top discard for sale while someone else is playing their turn. */
export function BuyOffer({ card, sellerName, requested, rivals, cardWidth, decisionMs, onBuy, onPass }: BuyOfferProps) {
  const label = cardLabel(card);
  const remaining = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (requested || !decisionMs || prefersReducedMotion()) return;
    // Width can't use the native driver, so this runs on the JS thread everywhere.
    const timer = Animated.timing(remaining, { toValue: 0, duration: decisionMs, easing: Easing.linear, useNativeDriver: false });
    timer.start();
    return () => timer.stop();
  }, [decisionMs, remaining, requested]);

  const others = rivals.length > 0 ? `${rivals.join(' & ')} ${rivals.length > 1 ? 'want' : 'wants'} it too. ` : '';

  return (
    <Appear from="below" style={[styles.offer, requested && styles.requested]}>
      <PlayingCard card={card} width={cardWidth} />
      <View style={styles.body}>
        {requested ? (
          <>
            <Text style={styles.title}>You asked to buy {label}</Text>
            <Text style={styles.detail}>
              {others}Settled in turn order when {sellerName} discards.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>
              Buy {label} for {formatCents(STAKES.buy)}?
            </Text>
            <Text style={styles.detail}>
              {others}
              {sellerName} passed it up. Buying adds a card to your hand.
            </Text>
          </>
        )}
        {!requested && !!decisionMs && (
          <View style={styles.track}>
            <Animated.View
              style={[styles.bar, { width: remaining.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
            />
          </View>
        )}
      </View>
      {!requested && (
        <View style={styles.buttons}>
          <Button label="Buy" compact onPress={onBuy} accessibilityHint={`Asks to buy ${label} for ${formatCents(STAKES.buy)}`} />
          <Button label="Pass" variant="ghost" compact onPress={onPass} />
        </View>
      )}
    </Appear>
  );
}

const styles = StyleSheet.create({
  offer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    paddingRight: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: 'rgba(242, 193, 78, 0.45)',
  },
  requested: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: colors.panelBorder,
  },
  body: { flex: 1, gap: 3, minWidth: 0 },
  title: { color: colors.text, fontSize: 14, fontWeight: '800' },
  detail: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginTop: 3,
  },
  bar: { height: 3, backgroundColor: colors.gold },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
