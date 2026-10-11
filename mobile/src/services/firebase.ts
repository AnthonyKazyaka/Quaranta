import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, User, getAuth, initializeAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { Firestore, getFirestore, initializeFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

interface FirebaseRuntimeConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

function readRuntimeConfig(): FirebaseRuntimeConfig | null {
  const firebase = (Constants.expoConfig?.extra as { firebase?: FirebaseRuntimeConfig } | undefined)?.firebase;
  if (!firebase?.apiKey || !firebase.projectId || !firebase.appId) {
    return null;
  }
  return firebase;
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

/** Firebase is optional: without config the game runs fully offline. */
export function isFirebaseConfigured(): boolean {
  return readRuntimeConfig() !== null;
}

export function getFirebaseApp(): FirebaseApp | null {
  if (cachedApp) return cachedApp;
  const config = readRuntimeConfig();
  if (!config) return null;
  cachedApp = getApps()[0] ?? initializeApp(config);
  return cachedApp;
}

export function getFirebaseAuth(): Auth | null {
  if (cachedAuth) return cachedAuth;
  const app = getFirebaseApp();
  if (!app) return null;

  if (Platform.OS === 'web') {
    cachedAuth = getAuth(app);
    return cachedAuth;
  }

  try {
    // getReactNativePersistence only exists in the React Native build of firebase/auth,
    // so it's missing from the default type definitions.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getReactNativePersistence } = require('firebase/auth') as {
      getReactNativePersistence: (storage: typeof AsyncStorage) => import('firebase/auth').Persistence;
    };
    cachedAuth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    cachedAuth = getAuth(app);
  }
  return cachedAuth;
}

export function getFirestoreDb(): Firestore | null {
  if (cachedDb) return cachedDb;
  const app = getFirebaseApp();
  if (!app) return null;

  try {
    cachedDb = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    cachedDb = getFirestore(app);
  }
  return cachedDb;
}

let signInPromise: Promise<User | null> | null = null;

/**
 * Signs in anonymously so saved games can be tied to this device's user. Resolves to null when
 * Firebase isn't configured or sign-in fails (e.g. Anonymous auth isn't enabled in the console).
 */
export function ensureSignedIn(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  signInPromise ??= new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
        return;
      }
      try {
        resolve((await signInAnonymously(auth)).user);
      } catch (error) {
        console.warn('[firebase] Anonymous sign-in failed; cloud saves are disabled.', error);
        resolve(null);
      }
    });
  }).finally(() => {
    signInPromise = null;
  });

  return signInPromise;
}
