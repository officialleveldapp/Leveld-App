import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/** True when running inside the Expo Go app (no custom native modules). */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function superwallPublicKeyForPlatform(): string | undefined {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY?.trim();
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_KEY?.trim();
  }
  return undefined;
}

/**
 * Superwall native code is only available in dev/standalone builds, not Expo Go.
 * Call this before loading `expo-superwall` (e.g. via require).
 */
export function shouldUseSuperwallNative(): boolean {
  if (Platform.OS === 'web') return false;
  if (isExpoGo()) return false;
  return Boolean(superwallPublicKeyForPlatform());
}

/**
 * Human-readable reason the static /paywall screen is shown instead of Superwall.
 * Use for support banners only — logic must stay aligned with `shouldUseSuperwallNative`.
 */
export function describeSuperwallFallback(): string {
  if (Platform.OS === 'web') {
    return 'Superwall paywalls are not available on web.';
  }
  if (isExpoGo()) {
    return 'Superwall needs a development build. Run npx expo run:ios (or run:android) — it does not run inside the Expo Go app.';
  }
  if (Platform.OS === 'ios' && !process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY?.trim()) {
    return 'Add your Superwall public API key to .env as EXPO_PUBLIC_SUPERWALL_IOS_KEY (Dashboard → Settings → Keys), then stop Metro, run npx expo start --clear, and reload the app. See docs/SUPERWALL_LOCAL.md.';
  }
  if (Platform.OS === 'android' && !process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_KEY?.trim()) {
    return 'Add EXPO_PUBLIC_SUPERWALL_ANDROID_KEY to .env, then restart Metro with npx expo start --clear and rebuild. See docs/SUPERWALL_LOCAL.md.';
  }
  return 'The native Superwall UI failed to load. See docs/SUPERWALL_LOCAL.md.';
}
