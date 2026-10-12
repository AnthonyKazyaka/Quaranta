/**
 * Online play runs on an in-device simulation until the Firebase backend exists, so it's only
 * offered in development builds. Set EXPO_PUBLIC_ENABLE_ONLINE_DEMO=true to show it in a build
 * you're sharing for testing.
 */
export const onlineEnabled: boolean = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_ONLINE_DEMO === 'true';
