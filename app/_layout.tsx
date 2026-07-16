import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { Stack, router, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { resetAfterSignOut } from '@/lib/resetToWelcome';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { RevenueCatProvider } from '@/contexts/RevenueCatContext';
import { PaywallProvider } from '@/contexts/PaywallContext';
import { PremiumGateProvider } from '@/contexts/PremiumGateContext';
import { SessionProvider } from '@/contexts/SessionContext';
import {
  isPostOnboardingPaywallPending,
  isPostOnboardingNotificationsPending,
} from '@/lib/postRegisterFlow';
import { scheduleDailyNotifications, cancelDailyNotifications } from '@/lib/notifications';

/**
 * Expo Router omits groups from `pathname`: `(tabs)/profile` → `/profile`, not `/(tabs)/profile`.
 * Path `/` is ambiguous: both `app/index` (welcome) and `(tabs)/index` (home tab) use it — use
 * `segments` to tell them apart (`(tabs)` only appears in segments, not pathname).
 */
function isTabAppPath(pathname: string): boolean {
  if (pathname.startsWith('/(tabs)')) return true;
  const tabRoots = [
    '/profile',
    '/progress',
    '/track',
    '/groups',
    '/calendar',
  ];
  return tabRoots.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isSignedOutOnProtectedRoute(
  pathname: string,
  segments: readonly string[],
): boolean {
  if (
    pathname === '/onboarding' ||
    pathname.startsWith('/onboarding/') ||
    pathname === '/paywall' ||
    pathname.startsWith('/paywall/') ||
    pathname === '/enable-notifications' ||
    pathname.startsWith('/enable-notifications/') ||
    pathname === '/workout-complete' ||
    pathname === '/workout-history' ||
    pathname === '/workout-detail' ||
    pathname === '/create-group' ||
    pathname === '/create-workout' ||
    pathname === '/friends' ||
    pathname.startsWith('/user/') ||
    pathname === '/exercise-stats' ||
    pathname === '/edit-profile' ||
    pathname === '/calendar-workout'
  ) {
    return true;
  }
  if (isTabAppPath(pathname)) return true;
  const onTabsHome = segments.includes('(tabs)');
  const looksLikeRoot =
    pathname === '/' || pathname === '' || pathname === '/index';
  return onTabsHome && looksLikeRoot;
}

/** True when signed-out user is already on welcome `app/index` (not the tab home at `/`). */
function isSignedOutWelcomeLanding(
  pathname: string,
  segments: readonly string[],
): boolean {
  const looksLikeRoot =
    pathname === '/' || pathname === '' || pathname === '/index';
  return looksLikeRoot && !segments.includes('(tabs)');
}

/** Signed-out user may stay on any `app/auth/*` screen — do not redirect again. */
function isSignedOutSafeLanding(
  pathname: string,
  segments: readonly string[],
): boolean {
  if (pathname.startsWith('/auth')) return true;
  return isSignedOutWelcomeLanding(pathname, segments);
}

/** Schedule daily notifications when signed in; cancel when signed out.
 *  Skip during onboarding paywall / notifications steps so the OS prompt
 *  only appears on the dedicated enable-notifications screen. */
function NotificationScheduler() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      void cancelDailyNotifications();
      return;
    }
    let cancelled = false;
    (async () => {
      if (
        (await isPostOnboardingPaywallPending()) ||
        (await isPostOnboardingNotificationsPending())
      ) {
        return;
      }
      if (!cancelled) void scheduleDailyNotifications();
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return null;
}

/** Root stack + session-driven redirect to welcome (`app/index`). */
function RootStack() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const segments = useSegments();
  /** Debounce so we don’t loop, but pathname updates can trigger a legitimate second kick. */
  const lastSignOutKickAt = useRef(0);

  useEffect(() => {
    if (loading || user) return;
    if (isSignedOutSafeLanding(pathname, segments)) return;
    if (!isSignedOutOnProtectedRoute(pathname, segments)) return;

    const now = Date.now();
    if (now - lastSignOutKickAt.current < 400) return;
    lastSignOutKickAt.current = now;

    if (Platform.OS === 'web') {
      router.replace('/auth/login');
    } else {
      resetAfterSignOut();
    }
  }, [user, loading, pathname, segments]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A0A' },
          animation: 'fade',
          animationDuration: 150,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="paywall" />
        <Stack.Screen name="enable-notifications" options={{ gestureEnabled: false }} />
        <Stack.Screen name="workout-complete" options={{ gestureEnabled: false }} />
        <Stack.Screen name="workout-history" />
        <Stack.Screen name="workout-detail" />
        <Stack.Screen name="create-group" />
        <Stack.Screen name="create-workout" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="exercise-stats" />
        <Stack.Screen name="notification-settings" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="calendar-workout" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    import('@/lib/bodyModelWebBundle').then((m) => m.warmupBodyModelWebBundle());
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RevenueCatProvider>
          <PaywallProvider>
            <PremiumGateProvider>
              <SessionProvider>
                <NotificationScheduler />
                <RootStack />
                <StatusBar style="auto" />
              </SessionProvider>
            </PremiumGateProvider>
          </PaywallProvider>
        </RevenueCatProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
