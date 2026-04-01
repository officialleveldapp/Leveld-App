import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { RevenueCatProvider } from '@/contexts/RevenueCatContext';
import { PremiumGateProvider } from '@/contexts/PremiumGateContext';
import { SessionProvider } from '@/contexts/SessionContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <RevenueCatProvider>
        <PremiumGateProvider>
          <SessionProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="+not-found" />
              <Stack.Screen name="auth/signup" />
              <Stack.Screen name="auth/login" />
              <Stack.Screen name="auth/forgot-password" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="paywall" />
              <Stack.Screen name="(tabs)" />
            </Stack>
            <StatusBar style="auto" />
          </SessionProvider>
        </PremiumGateProvider>
      </RevenueCatProvider>
    </AuthProvider>
  );
}
