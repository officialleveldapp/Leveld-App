import React, { createContext, useCallback, useContext } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { shouldUseSuperwallNative } from '@/lib/superwallAvailability';

type RegisterGatedFn = (placement: string, feature: () => void) => Promise<void>;

export const PremiumGateContext = createContext<RegisterGatedFn | null>(null);

function PremiumGateFallbackInner({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const router = useRouter();

  const registerGated = useCallback(
    async (_placement: string, feature: () => void) => {
      if (profile?.is_pro) {
        feature();
        return;
      }
      router.push('/paywall');
    },
    [profile?.is_pro, router],
  );

  return (
    <PremiumGateContext.Provider value={registerGated}>
      {children}
    </PremiumGateContext.Provider>
  );
}

/**
 * Superwall only when a public API key is set and the binary includes native code
 * (development build / standalone). Expo Go falls back to /paywall without loading the module.
 */
export function PremiumGateProvider({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'web' || !shouldUseSuperwallNative()) {
    return (
      <PremiumGateFallbackInner>{children}</PremiumGateFallbackInner>
    );
  }

  try {
    const { PremiumGateSuperwallTree } =
      require('@/contexts/PremiumGateSuperwallTree') as typeof import('@/contexts/PremiumGateSuperwallTree');
    return <PremiumGateSuperwallTree>{children}</PremiumGateSuperwallTree>;
  } catch (e) {
    console.warn(
      '[PremiumGate] expo-superwall is missing or the native module is unavailable; using /paywall fallback. Use `npx expo run:ios` (dev build) when you need Superwall.',
      e,
    );
    return (
      <PremiumGateFallbackInner>{children}</PremiumGateFallbackInner>
    );
  }
}

export function usePremiumGate() {
  const fn = useContext(PremiumGateContext);
  if (!fn) {
    throw new Error('usePremiumGate requires PremiumGateProvider');
  }
  return { registerGated: fn };
}
