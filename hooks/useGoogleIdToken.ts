import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { useMemo } from 'react';
import type { AuthSessionResult } from 'expo-auth-session';
import type { AuthRequestPromptOptions } from 'expo-auth-session';
import { googleNativeRedirectUri } from '@/lib/googleNativeRedirectUri';

WebBrowser.maybeCompleteAuthSession();

/** Satisfies expo-auth-session when client id is not yet configured (hook must always run). */
const IOS_CLIENT_PLACEHOLDER =
  '000000000000-ios-not-configured.apps.googleusercontent.com';

export type GoogleIdTokenHook = {
  request: ReturnType<typeof Google.useIdTokenAuthRequest>[0];
  response: AuthSessionResult | null;
  promptAsync: (
    options?: AuthRequestPromptOptions,
  ) => Promise<AuthSessionResult>;
  /** True only on a real iOS build (dev or store) with a valid `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. */
  configured: boolean;
  /** Explains why Google is disabled (e.g. Expo Go) or what to add to `.env`. */
  googleSetupHint: string | null;
};

/**
 * Google Sign-In for **iOS native builds only** (`npx expo run:ios`, TestFlight, App Store).
 * **Expo Go is not supported** — there is no supported `exp://` / proxy flow for this app.
 */
export function useGoogleIdToken(): GoogleIdTokenHook {
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  const isExpoGo =
    Platform.OS === 'ios' &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  const isIosNative =
    Platform.OS === 'ios' &&
    [ExecutionEnvironment.Bare, ExecutionEnvironment.Standalone].includes(
      Constants.executionEnvironment,
    );

  const redirectUri =
    isIosNative && ios ? googleNativeRedirectUri(ios) : null;

  const iosForSdk = ios || IOS_CLIENT_PLACEHOLDER;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: Platform.OS === 'ios' ? iosForSdk : undefined,
    webClientId:
      Platform.OS === 'web' ? IOS_CLIENT_PLACEHOLDER : undefined,
    androidClientId:
      Platform.OS === 'android' ? IOS_CLIENT_PLACEHOLDER : undefined,
    ...(redirectUri ? { redirectUri } : {}),
  });

  const configured = Boolean(isIosNative && ios && redirectUri);

  const googleSetupHint = useMemo((): string | null => {
    if (Platform.OS !== 'ios') {
      return 'Google sign-in is implemented for the iOS app only. Use the iOS Simulator or a device with npx expo run:ios.';
    }
    if (isExpoGo) {
      return 'Google sign-in does not work in Expo Go. Run: npx expo run:ios — then open the Leveld dev build on simulator or device. See docs/GOOGLE_SIGNIN_IOS.md.';
    }
    if (isIosNative && !ios) {
      return 'Add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID to .env (CLIENT_ID from GoogleService-Info.plist), then rebuild: npx expo run:ios';
    }
    return null;
  }, [isExpoGo, isIosNative, ios]);

  return { request, response, promptAsync, configured, googleSetupHint };
}
