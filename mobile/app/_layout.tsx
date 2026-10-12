import { PlayfairDisplay_700Bold, PlayfairDisplay_900Black, useFonts } from '@expo-google-fonts/playfair-display';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ensureSignedIn } from '@/services/firebase';
import { colors } from '@/theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ PlayfairDisplay_700Bold, PlayfairDisplay_900Black });

  useEffect(() => {
    // Anonymous sign-in for cloud saves; a no-op when Firebase isn't configured.
    void ensureSignedIn();
    // Match the page behind the app so overscroll and resizes never flash white.
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = colors.feltDeep;
    }
  }, []);

  // Hold the first frame until the display font is ready, so headings don't jump.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.felt }} />;
  }

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
