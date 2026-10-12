import { PublicGameView, formatCents, viewCanDrawFromDeck } from '@quaranta/shared';
import { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing } from '@/theme';
import { Appear, PressState, usePulse } from './motion';
import { CardBack, PlayingCard, cardHeight } from './PlayingCard';

interface PilesProps {
  view: PublicGameView;
  cardWidth: number;
  canDraw: boolean;
  /** The top discard is up for sale. */
  forSale?: boolean;
  onDrawDeck: () => void;
  onDrawDiscard: () => void;
}

/** The deck and discard pile. Both glow when it's your turn to draw. */
export function Piles({ view, cardWidth, canDraw, forSale, onDrawDeck, onDrawDiscard }: PilesProps) {
  const pulse = usePulse(canDraw);
  const discard = view.topDiscard;
  const under = view.underDiscard;
  const height = cardHeight(cardWidth);
  // A thicker stack for a fuller deck.
  const layers = Math.min(3, Math.ceil(view.deckCount / 18));

  return (
    <View style={styles.piles}>
      <Pile
        label="Deck"
        badge={String(view.deckCount)}
        active={canDraw && viewCanDrawFromDeck(view)}
        pulse={pulse}
        onPress={onDrawDeck}
        accessibilityLabel={`Draw from the deck, ${view.deckCount} cards left`}
      >
        <View style={{ width: cardWidth + 4, height: height + 4 }}>
          {Array.from({ length: layers }, (_, i) => layers - i).map((offset) => (
            <View key={offset} style={[styles.layer, { left: offset * 1.5, top: offset * 1.5 }]}>
              <CardBack width={cardWidth} />
            </View>
          ))}
          <CardBack width={cardWidth} />
        </View>
      </Pile>

      <Pile
        label={forSale ? 'For sale' : 'Discard'}
        highlight={forSale}
        active={canDraw && !!discard}
        pulse={pulse}
        onPress={onDrawDiscard}
        accessibilityLabel={discard ? 'Take the top discard' : 'The discard pile is empty'}
      >
        <View style={{ width: cardWidth + 4, height: height + 4 }}>
          {under && (
            <View style={[styles.layer, styles.under]}>
              <PlayingCard card={under} width={cardWidth} />
            </View>
          )}
          {discard ? (
            <Appear key={discard.id} from="drop" duration={240}>
              <PlayingCard card={discard} width={cardWidth} />
            </Appear>
          ) : (
            <View style={[styles.emptyPile, { width: cardWidth, height, borderRadius: Math.max(4, cardWidth * 0.09) }]} />
          )}
        </View>
      </Pile>

      <View style={styles.pot} accessible accessibilityLabel={`Pot: ${formatCents(view.pot)}`}>
        <Appear key={view.pot} from="scale" duration={220}>
          <View style={styles.coin}>
            <Text style={styles.coinText}>¢</Text>
          </View>
        </Appear>
        <Text style={styles.potAmount}>{formatCents(view.pot)}</Text>
        <Text style={styles.label}>Pot</Text>
      </View>
    </View>
  );
}

interface PileProps {
  label: string;
  badge?: string;
  highlight?: boolean;
  active: boolean;
  pulse: Animated.Value;
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
}

function Pile({ label, badge, highlight, active, pulse, onPress, accessibilityLabel, children }: PileProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!active}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !active }}
      style={({ hovered, pressed }: PressState) => [
        styles.pile,
        active && hovered && styles.pileHover,
        active && pressed && styles.pilePressed,
      ]}
    >
      {active && (
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }]}
        />
      )}
      {children}
      <View style={styles.labelRow}>
        <Text style={[styles.label, (active || highlight) && styles.labelActive]}>{label}</Text>
        {badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  piles: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pile: {
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  pileHover: {
    backgroundColor: colors.goldSoft,
  },
  pilePressed: {
    transform: [{ scale: 0.97 }],
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.gold,
    boxShadow: shadows.glow,
  },
  layer: {
    position: 'absolute',
  },
  under: {
    left: 3,
    top: 2,
    transform: [{ rotate: '6deg' }],
    opacity: 0.9,
  },
  emptyPile: {
    borderWidth: 1.5,
    borderColor: 'rgba(242, 214, 150, 0.25)',
    borderStyle: 'dashed',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  labelActive: {
    color: colors.gold,
  },
  pot: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: spacing.sm,
    minWidth: 48,
  },
  coin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.glow,
  },
  coinText: {
    color: colors.feltDeep,
    fontWeight: '900',
    fontSize: 15,
  },
  potAmount: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  badge: {
    minWidth: 22,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.panelStrong,
    alignItems: 'center',
  },
  badgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
