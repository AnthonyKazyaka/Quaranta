import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { PressState, prefersReducedMotion, useNativeDriver } from './motion';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
  compact?: boolean;
  accessibilityHint?: string;
}

export function Button({ label, onPress, variant = 'primary', disabled, style, compact, accessibilityHint }: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressTo = (toValue: number) => {
    if (prefersReducedMotion()) return;
    Animated.spring(scale, { toValue, friction: 6, tension: 260, useNativeDriver }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => pressTo(0.96)}
        onPressOut={() => pressTo(1)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        accessibilityHint={accessibilityHint}
        style={({ pressed, hovered }: PressState) => [
          styles.base,
          compact && styles.compact,
          styles[variant],
          hovered && !disabled && hoverStyles[variant],
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.label, compact && styles.compactLabel, labelStyles[variant]]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  compact: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    minHeight: 40,
  },
  primary: {
    backgroundColor: colors.gold,
    borderBottomWidth: 3,
    borderBottomColor: colors.goldDark,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.25)',
  },
  secondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(242, 214, 150, 0.28)',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.35,
    boxShadow: 'none',
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
    userSelect: 'none',
  },
  compactLabel: {
    fontSize: 14,
  },
});

const hoverStyles = StyleSheet.create({
  primary: { backgroundColor: colors.goldLight },
  secondary: { backgroundColor: 'rgba(255, 255, 255, 0.11)' },
  ghost: { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
});

const labelStyles = StyleSheet.create({
  primary: { color: colors.feltDeep },
  secondary: { color: colors.text },
  ghost: { color: colors.textMuted },
});
