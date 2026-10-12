import { ReactNode } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';

// A soft pool of light in the middle of the table, darkening toward the edges.
const GRADIENT = `radial-gradient(ellipse at 50% 35%, ${colors.feltLight} 0%, ${colors.felt} 45%, ${colors.feltDeep} 100%)`;
const gradientStyle = (
  Platform.OS === 'web' ? { backgroundImage: GRADIENT } : { experimental_backgroundImage: GRADIENT }
) as ViewStyle;

interface ScreenProps {
  children: ReactNode;
  edges?: Edge[];
}

/** Full-screen felt background with safe-area padding. Every screen sits on one. */
export function Screen({ children, edges }: ScreenProps) {
  return (
    <View style={[styles.felt, gradientStyle]}>
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  felt: { flex: 1, backgroundColor: colors.felt },
  safe: { flex: 1 },
});
