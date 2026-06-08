import React, { useLayoutEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LeveldProPaywallContent } from '@/components/LeveldProPaywallContent';
import { clearPostOnboardingPaywallPending } from '@/lib/postRegisterFlow';
import { replaceWithPendingGroupInviteIfAny } from '@/lib/pendingGroupInviteNavigation';
import {
  usePaywallGateRefs,
} from '@/contexts/PaywallContext';

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const isPostOnboardingFirst =
    params.source === 'onboarding';

  const { pendingPurchaseCallbackRef, paywallOpenedFromInAppGateRef } =
    usePaywallGateRefs();

  const openedFromInAppGate = useRef(false);
  useLayoutEffect(() => {
    openedFromInAppGate.current = paywallOpenedFromInAppGateRef.current;
    paywallOpenedFromInAppGateRef.current = false;
  }, [paywallOpenedFromInAppGateRef]);

  const navigateAway = async () => {
    pendingPurchaseCallbackRef.current = undefined;
    await clearPostOnboardingPaywallPending();
    if (await replaceWithPendingGroupInviteIfAny(router)) return;

    if (openedFromInAppGate.current) {
      router.back();
      return;
    }

    if (isPostOnboardingFirst) {
      router.replace('/(tabs)');
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  const onProUnlocked = async () => {
    await clearPostOnboardingPaywallPending();
    const cb = pendingPurchaseCallbackRef.current;
    pendingPurchaseCallbackRef.current = undefined;
    if (await replaceWithPendingGroupInviteIfAny(router)) return;

    if (openedFromInAppGate.current) {
      cb?.();
      router.back();
      return;
    }

    cb?.();

    if (isPostOnboardingFirst) {
      router.replace('/(tabs)');
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  const onPurchaseReceiptProcessing = async () => {
    await clearPostOnboardingPaywallPending();
    pendingPurchaseCallbackRef.current = undefined;
    if (await replaceWithPendingGroupInviteIfAny(router)) return;

    if (openedFromInAppGate.current) {
      router.back();
      return;
    }

    if (isPostOnboardingFirst) {
      router.replace('/(tabs)');
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <LeveldProPaywallContent
      closeButtonDelayMs={isPostOnboardingFirst ? 3000 : 0}
      onDismiss={navigateAway}
      onProUnlocked={onProUnlocked}
      onPurchaseReceiptProcessing={onPurchaseReceiptProcessing}
    />
  );
}
