import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme';

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Text style={styles.text}>That page doesn&apos;t exist.</Text>
      <Link href="/" style={styles.link}>
        Back to the menu
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.felt },
  text: { color: colors.text, fontSize: 18 },
  link: { color: colors.gold, fontSize: 16 },
});
