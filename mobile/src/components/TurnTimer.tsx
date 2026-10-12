import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '@/theme';

interface TurnTimerProps {
  /** When the current turn runs out, in the same clock as `now()`. */
  deadline: number;
  /** Clock to count against; online games pass the server-adjusted time. */
  now?: () => number;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
}

/** Counts down to the end of the turn, turning red for the last ten seconds. */
export function TurnTimer({ deadline, now = Date.now }: TurnTimerProps) {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(timer);
  }, []);

  const remaining = deadline - now();
  return (
    <Text
      style={[styles.timer, remaining <= 10_000 && styles.urgent]}
      accessibilityRole="timer"
      accessibilityLabel={`${Math.max(0, Math.ceil(remaining / 1000))} seconds left`}
    >
      {formatCountdown(remaining)}
    </Text>
  );
}

const styles = StyleSheet.create({
  timer: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    backgroundColor: colors.feltDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  urgent: { color: colors.danger },
});
