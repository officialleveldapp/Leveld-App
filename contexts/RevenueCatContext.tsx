import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Linking, Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  type CustomerInfoUpdateListener,
  type MakePurchaseResult,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { useAuth } from '@/contexts/AuthContext';
import {
  LEVELD_PRO_ENTITLEMENT_ID,
  getConfiguredProductIds,
} from '@/lib/revenuecat/constants';
import { customerInfoHasLeveldPro } from '@/lib/revenuecat/entitlements';
import {
  getPurchasesErrorMessage,
  isUserCancelledError,
} from '@/lib/revenuecat/purchasesError';

function getAppleApiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY?.trim() || undefined;
}

function getGoogleApiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY?.trim() || undefined;
}

export function isRevenueCatSupportedPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function isRevenueCatConfiguredForBuild(): boolean {
  if (!isRevenueCatSupportedPlatform()) return false;
  if (Platform.OS === 'ios') return Boolean(getAppleApiKey());
  // Android: use Play key, or in __DEV__ fall back to Apple public key (RevenueCat samples often use one test key).
  return Boolean(
    getGoogleApiKey() || (__DEV__ && getAppleApiKey()),
  );
}

type RevenueCatContextValue = {
  /** SDK configured with a valid API key for this platform. */
  isReady: boolean;
  customerInfo: CustomerInfo | null;
  /** True if RevenueCat reports active Leveld Pro entitlement. */
  hasLeveldProEntitlement: boolean;
  /** Entitlement OR backend profile flag (webhook may lag). */
  isEffectivelyPro: boolean;
  activeProductIds: string[];
  refreshCustomerInfo: () => Promise<CustomerInfo | null>;
  restorePurchases: () => Promise<CustomerInfo | null>;
  /** RevenueCat Paywall (current offering from dashboard). */
  presentPaywall: () => Promise<PAYWALL_RESULT | null>;
  /** Paywall only when `Leveld Pro` is not active. */
  presentPaywallIfNeeded: () => Promise<PAYWALL_RESULT | null>;
  /** Load offerings (products/packages). Use for a custom paywall; no dashboard Paywall template required. */
  fetchOfferings: () => Promise<PurchasesOfferings | null>;
  /** Complete purchase for a package from `fetchOfferings` / current offering. */
  purchasePackage: (
    pkg: PurchasesPackage,
  ) => Promise<MakePurchaseResult | null>;
  /** Manage subscription UI (refunds, plan changes on iOS, etc.). */
  presentCustomerCenter: () => Promise<void>;
  /**
   * System subscription management (cancel, turn off auto-renew, change plan).
   * Uses native sheet when available; otherwise opens the store subscriptions URL.
   */
  openStoreSubscriptionManagement: () => Promise<void>;
  /** Exposed for debugging / settings copy. */
  configuredProductIds: ReturnType<typeof getConfiguredProductIds>;
};

const RevenueCatContext = createContext<RevenueCatContextValue | null>(null);

export function RevenueCatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, refreshProfile } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  const apiKey = useMemo(() => {
    if (Platform.OS === 'ios') return getAppleApiKey();
    if (Platform.OS === 'android') {
      return getGoogleApiKey() || (__DEV__ ? getAppleApiKey() : undefined);
    }
    return undefined;
  }, []);

  const enabled = Boolean(apiKey && isRevenueCatSupportedPlatform());

  // Configure SDK and subscribe to CustomerInfo updates.
  useEffect(() => {
    if (!enabled || !apiKey) {
      setSdkReady(true);
      return;
    }

    let cancelled = false;
    const listener: CustomerInfoUpdateListener = (info) => {
      setCustomerInfo(info);
      if (customerInfoHasLeveldPro(info)) {
        void refreshProfile();
      }
    };

    (async () => {
      try {
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        }
        const alreadyConfigured = await Purchases.isConfigured();
        if (!alreadyConfigured) {
          Purchases.configure({ apiKey });
        }
        Purchases.addCustomerInfoUpdateListener(listener);
        const info = await Purchases.getCustomerInfo();
        if (!cancelled) setCustomerInfo(info);
      } catch (e) {
        console.warn('[RevenueCat] init:', e);
      } finally {
        if (!cancelled) setSdkReady(true);
      }
    })();

    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [enabled, apiKey, refreshProfile]);

  // Identify user — must match backend RevenueCat webhook `app_user_id` (profile PK).
  useEffect(() => {
    if (!enabled || !sdkReady) return;

    const run = async () => {
      try {
        if (profile?.id != null) {
          const { customerInfo: next } = await Purchases.logIn(
            String(profile.id),
          );
          setCustomerInfo(next);
        } else {
          const next = await Purchases.logOut();
          setCustomerInfo(next);
        }
      } catch (e) {
        console.warn('[RevenueCat] logIn/logOut:', e);
      }
    };

    void run();
  }, [enabled, sdkReady, profile?.id]);

  const hasLeveldProEntitlement = customerInfoHasLeveldPro(customerInfo);

  const isEffectivelyPro = Boolean(
    hasLeveldProEntitlement || profile?.is_pro,
  );

  const activeProductIds = useMemo(() => {
    const active = customerInfo?.activeSubscriptions ?? [];
    return Array.isArray(active) ? [...active] : [];
  }, [customerInfo]);

  const refreshCustomerInfo = useCallback(async (): Promise<CustomerInfo | null> => {
    if (!enabled || !sdkReady) return null;
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      return info;
    } catch (e) {
      console.warn('[RevenueCat] refreshCustomerInfo:', e);
      return null;
    }
  }, [enabled, sdkReady]);

  const restorePurchases = useCallback(async (): Promise<CustomerInfo | null> => {
    if (!enabled || !sdkReady) return null;
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      if (customerInfoHasLeveldPro(info)) {
        void refreshProfile();
      }
      return info;
    } catch (e) {
      console.warn('[RevenueCat] restorePurchases:', e);
      throw e;
    }
  }, [enabled, sdkReady, refreshProfile]);

  const presentPaywall = useCallback(async (): Promise<PAYWALL_RESULT | null> => {
    if (!enabled || !sdkReady) return null;
    try {
      const result = await RevenueCatUI.presentPaywall({});
      if (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      ) {
        await refreshCustomerInfo();
        await refreshProfile();
      }
      return result;
    } catch (e) {
      if (isUserCancelledError(e)) return null;
      console.warn('[RevenueCat] presentPaywall:', getPurchasesErrorMessage(e));
      throw e;
    }
  }, [enabled, sdkReady, refreshCustomerInfo, refreshProfile]);

  const presentPaywallIfNeeded = useCallback(async (): Promise<PAYWALL_RESULT | null> => {
    if (!enabled || !sdkReady) return null;
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: LEVELD_PRO_ENTITLEMENT_ID,
      });
      if (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      ) {
        await refreshCustomerInfo();
        await refreshProfile();
      }
      return result;
    } catch (e) {
      if (isUserCancelledError(e)) return null;
      console.warn(
        '[RevenueCat] presentPaywallIfNeeded:',
        getPurchasesErrorMessage(e),
      );
      throw e;
    }
  }, [enabled, sdkReady, refreshCustomerInfo, refreshProfile]);

  const fetchOfferings = useCallback(async (): Promise<PurchasesOfferings | null> => {
    if (!enabled || !sdkReady) return null;
    try {
      return await Purchases.getOfferings();
    } catch (e) {
      console.warn('[RevenueCat] getOfferings:', getPurchasesErrorMessage(e));
      return null;
    }
  }, [enabled, sdkReady]);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage): Promise<MakePurchaseResult | null> => {
      if (!enabled || !sdkReady) return null;
      try {
        const result = await Purchases.purchasePackage(pkg);
        setCustomerInfo(result.customerInfo);
        if (customerInfoHasLeveldPro(result.customerInfo)) {
          await refreshProfile();
        }
        return result;
      } catch (e) {
        if (isUserCancelledError(e)) return null;
        console.warn(
          '[RevenueCat] purchasePackage:',
          getPurchasesErrorMessage(e),
        );
        throw e;
      }
    },
    [enabled, sdkReady, refreshProfile],
  );

  const presentCustomerCenter = useCallback(async (): Promise<void> => {
    if (!enabled || !sdkReady) return;
    try {
      await RevenueCatUI.presentCustomerCenter({
        callbacks: {
          onRestoreCompleted: () => {
            void refreshProfile();
          },
        },
      });
    } catch (e) {
      console.warn(
        '[RevenueCat] presentCustomerCenter:',
        getPurchasesErrorMessage(e),
      );
      throw e;
    }
  }, [enabled, sdkReady, refreshProfile]);

  const openStoreSubscriptionManagement = useCallback(async (): Promise<void> => {
    if (!enabled || !sdkReady) return;
    try {
      await Purchases.showManageSubscriptions();
      return;
    } catch (e) {
      console.warn(
        '[RevenueCat] showManageSubscriptions:',
        getPurchasesErrorMessage(e),
      );
    }
    const url =
      Platform.OS === 'android'
        ? 'https://play.google.com/store/account/subscriptions'
        : 'https://apps.apple.com/account/subscriptions';
    await Linking.openURL(url);
  }, [enabled, sdkReady]);

  const value = useMemo<RevenueCatContextValue>(
    () => ({
      isReady: enabled && sdkReady,
      customerInfo,
      hasLeveldProEntitlement,
      isEffectivelyPro,
      activeProductIds,
      refreshCustomerInfo,
      restorePurchases,
      presentPaywall,
      presentPaywallIfNeeded,
      fetchOfferings,
      purchasePackage,
      presentCustomerCenter,
      openStoreSubscriptionManagement,
      configuredProductIds: getConfiguredProductIds(),
    }),
    [
      enabled,
      sdkReady,
      customerInfo,
      hasLeveldProEntitlement,
      isEffectivelyPro,
      activeProductIds,
      refreshCustomerInfo,
      restorePurchases,
      presentPaywall,
      presentPaywallIfNeeded,
      fetchOfferings,
      purchasePackage,
      presentCustomerCenter,
      openStoreSubscriptionManagement,
    ],
  );

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat(): RevenueCatContextValue {
  const ctx = useContext(RevenueCatContext);
  if (!ctx) {
    throw new Error('useRevenueCat must be used within RevenueCatProvider');
  }
  return ctx;
}

/** Safe when provider is optional — returns null outside provider. */
export function useRevenueCatOptional(): RevenueCatContextValue | null {
  return useContext(RevenueCatContext);
}
