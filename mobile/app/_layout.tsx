import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '@/components/ToastHost';
import { ensureSignedIn } from '@/services/firebase';
import { onlineNavigator } from '@/stores/onlineStore';
import { colors } from '@/theme';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Anonymous sign-in for cloud saves; a no-op when Firebase isn't configured.
    void ensureSignedIn();
  }, []);

  // "Your turn" toasts open the table they're about to.
  useEffect(() => {
    onlineNavigator.open = (gameId) => router.push({ pathname: '/online/[gameId]', params: { gameId } });
    return () => {
      onlineNavigator.open = null;
    };
  }, [router]);

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
      <ToastHost />
    </SafeAreaProvider>
  );
}
