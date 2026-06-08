import React, {
  useCallback,
  useEffect,
  useRef,
  type ComponentProps,
} from 'react';
import { useRouter } from 'expo-router';
import {
  SuperwallProvider,
  usePlacement,
  useSuperwall,
  useUser,
} from 'expo-superwall';
import { useAuth } from '@/contexts/AuthContext';
import { flushPaywallModalClosers } from '@/contexts/PaywallContext';
import { PremiumGateContext } from '@/contexts/PremiumGateContext';

type SuperwallProviderOptions = NonNullable<
  ComponentProps<typeof SuperwallProvider>['options']
>;

function SuperwallIdentifyEffect() {
  const { profile, loading } = useAuth();
  const { identify, signOut } = useUser();
  /** Last synced app user id; avoids calling Superwall signOut on every render when logged out. */
  const lastSyncedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    const nextId = profile?.id != null ? String(profile.id) : null;
    const prevId = lastSyncedIdRef.current;
    lastSyncedIdRef.current = nextId;

    if (nextId != null) {
      if (nextId !== prevId) {
        void identify(nextId);
      }
      return;
    }

    if (prevId != null) {
      void signOut();
    }
    // `identify` / `signOut` from useUser() are often new references each render; including them
    // re-fired this effect and caused maximum update depth when signing out.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only when app profile id changes
  }, [profile?.id, loading]);

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
      flushPaywallModalClosers();
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
