import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ensureSignedIn } from '@/services/firebase';
import { colors } from '@/theme';

export default function RootLayout() {
  useEffect(() => {
    // Anonymous sign-in for cloud saves; a no-op when Firebase isn't configured.
    void ensureSignedIn();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.felt },
          animation: 'fade',
        }}
      />
    </SafeAreaProvider>
  );
}
