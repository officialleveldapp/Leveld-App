import React, { useCallback, useEffect, type ComponentProps } from 'react';
import { useRouter } from 'expo-router';
import {
  SuperwallProvider,
  usePlacement,
  useSuperwall,
  useUser,
} from 'expo-superwall';
import { useAuth } from '@/contexts/AuthContext';
import { PremiumGateContext } from '@/contexts/PremiumGateContext';

type SuperwallProviderOptions = NonNullable<
  ComponentProps<typeof SuperwallProvider>['options']
>;

function SuperwallIdentifyEffect() {
  const { profile, loading } = useAuth();
  const { identify, signOut } = useUser();

  useEffect(() => {
    if (loading) return;
    if (profile?.id != null) {
      void identify(String(profile.id));
    } else {
      void signOut();
    }
  }, [profile?.id, loading, identify, signOut]);

  return null;
}

function PremiumGateSuperwallInner({ children }: { children: React.ReactNode }) {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const isConfigured = useSuperwall((s) => s.isConfigured);

  const { registerPlacement } = usePlacement({
    onDismiss: () => {
      void refreshProfile();
    },
  });

  const registerGated = useCallback(
    async (placement: string, feature: () => void) => {
      if (profile?.is_pro) {
        feature();
        return;
      }
      if (!isConfigured) {
        router.push('/paywall');
        return;
      }
      await registerPlacement({ placement, feature });
    },
    [profile?.is_pro, isConfigured, registerPlacement, router],
  );

  return (
    <PremiumGateContext.Provider value={registerGated}>
      {children}
    </PremiumGateContext.Provider>
  );
}

export function PremiumGateSuperwallTree({
  children,
}: {
  children: React.ReactNode;
}) {
  const ios = process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY?.trim() || '';
  const android = process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_KEY?.trim() || '';

  const superwallDebug =
    __DEV__ && process.env.EXPO_PUBLIC_SUPERWALL_DEBUG?.trim() === '1';

  const options: SuperwallProviderOptions | undefined = superwallDebug
    ? ({
        networkEnvironment: 'developer',
        logging: { level: 'debug', scopes: ['all'] },
      } as SuperwallProviderOptions)
    : undefined;

  return (
    <SuperwallProvider
      apiKeys={{ ios, android }}
      options={options}
      onConfigurationError={(err) =>
        console.warn('[Superwall] configuration:', err.message)
      }
    >
      <SuperwallIdentifyEffect />
      <PremiumGateSuperwallInner>{children}</PremiumGateSuperwallInner>
    </SuperwallProvider>
  );
}
