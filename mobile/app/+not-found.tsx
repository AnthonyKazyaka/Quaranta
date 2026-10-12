import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { colors, fonts, spacing } from '@/theme';

export default function NotFound() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Misdeal</Text>
        <Text style={styles.text}>That page doesn&apos;t exist.</Text>
        <Link href="/" style={styles.link}>
          Back to the menu
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  title: { color: colors.gold, fontSize: 40, fontFamily: fonts.displayHeavy },
  text: { color: colors.text, fontSize: 18 },
  link: { color: colors.gold, fontSize: 16, fontWeight: '700' },
});
