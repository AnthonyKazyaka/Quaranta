import { ReactNode, useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, PressableStateCallbackType, StyleProp, ViewStyle } from 'react-native';

/** Pressable's style-callback state. React Native Web also reports `hovered` under a mouse. */
export type PressState = PressableStateCallbackType & { hovered?: boolean };

/** The web has no native animation module; Animated runs on the JS thread there. */
export const useNativeDriver = Platform.OS !== 'web';

// Read once and kept current, so animations can check it synchronously.
let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.()
  .then((enabled) => {
    reduceMotion = enabled;
  })
  .catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled) => {
  reduceMotion = enabled;
});

export function prefersReducedMotion(): boolean {
  return reduceMotion;
}

export type AppearFrom = 'below' | 'above' | 'scale' | 'drop' | 'deal';

interface AppearProps {
  children: ReactNode;
  /** How the content arrives. */
  from?: AppearFrom;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/** Animates its children in once, when it mounts. Key it by content to replay for new content. */
export function Appear({ children, from = 'below', delay = 0, duration = 280, style }: AppearProps) {
  const progress = useRef(new Animated.Value(prefersReducedMotion() ? 1 : 0)).current;

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    });
    animation.start();
    return () => animation.stop();
    // Mount-only: later prop changes shouldn't replay the entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Animated.View style={[style, { opacity: progress, transform: appearTransform(from, progress) }]}>{children}</Animated.View>;
}

function appearTransform(from: AppearFrom, p: Animated.Value) {
  const lerp = (a: number, b: number) => p.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  switch (from) {
    case 'above':
      return [{ translateY: lerp(-14, 0) }];
    case 'scale':
      return [{ scale: lerp(0.88, 1) }];
    case 'drop':
      return [{ scale: lerp(1.18, 1) }, { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['-7deg', '0deg'] }) }];
    case 'deal':
      return [
        { translateY: lerp(-48, 0) },
        { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['-9deg', '0deg'] }) },
        { scale: lerp(0.9, 1) },
      ];
    default:
      return [{ translateY: lerp(14, 0) }];
  }
}

/** A value that loops 0 → 1 → 0 while `active`, for gentle "your move" glows. */
export function usePulse(active: boolean, period = 1400): Animated.Value {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active || prefersReducedMotion()) {
      value.setValue(active ? 1 : 0);
      return;
    }
    const half = period / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver }),
        Animated.timing(value, { toValue: 0, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      value.setValue(0);
    };
  }, [active, period, value]);
  return value;
}

/** Springs between 0 and 1 as `on` changes. */
export function useSpring(on: boolean): Animated.Value {
  const value = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    if (prefersReducedMotion()) {
      value.setValue(on ? 1 : 0);
      return;
    }
    const animation = Animated.spring(value, { toValue: on ? 1 : 0, friction: 7, tension: 140, useNativeDriver });
    animation.start();
    return () => animation.stop();
  }, [on, value]);
  return value;
}

/** Returns a value and a trigger that gives it a short horizontal shake, for rejected moves. */
export function useShake(): [Animated.Value, () => void] {
  const value = useRef(new Animated.Value(0)).current;
  const shake = () => {
    if (prefersReducedMotion()) return;
    value.setValue(0);
    Animated.sequence(
      [1, -1, 0.6, -0.6, 0].map((toValue) =>
        Animated.timing(value, { toValue, duration: 55, easing: Easing.linear, useNativeDriver }),
      ),
    ).start();
  };
  return [value, shake];
}

/** Three dots that bob in turn: someone else is thinking. */
export function ThinkingDots({ color, size = 5 }: { color: string; size?: number }) {
  const value = usePulse(true, 1100);
  return (
    <Animated.View style={{ flexDirection: 'row', gap: size * 0.6, alignItems: 'center' }} accessible={false}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: value.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: i === 1 ? [0.35, 1, 0.35] : i === 0 ? [1, 0.35, 0.6] : [0.35, 0.6, 1],
            }),
          }}
        />
      ))}
    </Animated.View>
  );
}
