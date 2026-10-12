import { ConfigContext, ExpoConfig } from 'expo/config';

// Firebase web config. These values identify the project and are safe to ship in the client;
// access is controlled by firestore.rules. Leave them unset to play offline only.
const firebase = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Quaranta',
  slug: 'quaranta',
  version: '0.1.0',
  scheme: 'quaranta',
  orientation: 'default',
  userInterfaceStyle: 'dark',
  backgroundColor: '#0f3d24',
  icon: './assets/icon.png',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.justaskinteractive.quaranta',
  },
  android: {
    package: 'com.justaskinteractive.quaranta',
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#0f3d24' },
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 240, backgroundColor: '#0f3d24', resizeMode: 'contain' }],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    firebase,
  },
});
