import { GamePlayer, GameState, formatCents, totalScores } from '@quaranta/shared';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, seatColor, spacing } from '@/theme';
import { ThinkingDots, usePulse } from './motion';

/** Every player's seat: card count, open status and running score, with the active seat lit. */
export function PlayerStrip({ game, humanId, fill }: { game: GameState; humanId: string; fill?: boolean }) {
  const scores = totalScores(game);
  const seats = game.players.map((player, index) => (
    <Seat
      key={player.id}
      player={player}
      index={index}
      score={scores[player.id]}
      purse={game.purses?.[player.id] ?? 0}
      isDealer={index === game.dealerIndex}
      isActive={game.status === 'playing' && index === game.currentPlayerIndex}
      isYou={player.id === humanId}
      fill={fill}
    />
  ));

  if (fill) return <View style={styles.row}>{seats}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {seats}
    </ScrollView>
  );
}

interface SeatProps {
  player: GamePlayer;
  index: number;
  score: number;
  /** Net winnings in cents. */
  purse: number;
  isDealer: boolean;
  isActive: boolean;
  isYou: boolean;
  fill?: boolean;
}

function Seat({ player, index, score, purse, isDealer, isActive, isYou, fill }: SeatProps) {
  const glow = usePulse(isActive);
  const accent = seatColor(index);
  const cards = player.hand.length;

  return (
    <View
      style={[styles.seat, fill && styles.seatFill, isActive && { borderColor: accent }]}
      accessible
      accessibilityLabel={`${player.name}: ${cards} cards, ${score} points, ${purse < 0 ? 'down' : 'up'} ${formatCents(Math.abs(purse))}${player.isOpen ? ', open' : ''}${isDealer ? ', dealer' : ''}${isActive ? ', playing now' : ''}`}
    >
      {isActive && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.glow,
            { boxShadow: `0px 0px 16px ${accent}`, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] }) },
          ]}
        />
      )}
      <View style={[styles.avatar, { backgroundColor: accent }]}>
        <Text style={styles.avatarText}>{player.name.slice(0, 1).toUpperCase()}</Text>
        {isDealer && (
          <View style={styles.dealer}>
            <Text style={styles.dealerText}>D</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {isYou ? 'You' : player.name}
          </Text>
          {isActive && player.isBot && <ThinkingDots color={accent} size={4} />}
        </View>
        <Text style={styles.detail} numberOfLines={1}>
          {cards} {cards === 1 ? 'card' : 'cards'} · <Text style={styles.score}>{score}</Text> pts ·{' '}
          <Text style={purse > 0 ? styles.up : purse < 0 ? styles.down : styles.score}>
            {purse > 0 ? '+' : ''}
            {formatCents(purse)}
          </Text>
        </Text>
      </View>
      {player.isOpen && (
        <View style={styles.open}>
          <Text style={styles.openText}>OPEN</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  seat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    minWidth: 128,
  },
  seatFill: {
    flex: 1,
    minWidth: 0,
  },
  glow: {
    borderRadius: radius.lg,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.feltDeep,
    fontWeight: '900',
    fontSize: 15,
  },
  dealer: {
    position: 'absolute',
    right: -5,
    bottom: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.cardFace,
    borderWidth: 1,
    borderColor: colors.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealerText: {
    color: colors.feltDeep,
    fontSize: 9,
    fontWeight: '900',
  },
  info: {
    flexShrink: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14,
    flexShrink: 1,
  },
  detail: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  score: {
    color: colors.text,
    fontWeight: '700',
  },
  up: {
    color: '#7fd69a',
    fontWeight: '700',
  },
  down: {
    color: colors.danger,
    fontWeight: '700',
  },
  open: {
    marginLeft: 'auto',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.goldSoft,
  },
  openText: {
    color: colors.gold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
