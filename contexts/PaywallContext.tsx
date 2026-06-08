import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useRouter } from 'expo-router';

type ShowPaywallFn = (onPurchased?: () => void) => void;

const PaywallContext = createContext<ShowPaywallFn | null>(null);

/** Screens register here so any paywall presentation closes in-app modals first. */
const paywallModalCloseListeners = new Set<() => void>();

export function flushPaywallModalClosers(): void {
  paywallModalCloseListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

export function registerPaywallModalCloseListener(fn: () => void): () => void {
  paywallModalCloseListeners.add(fn);
  return () => {
    paywallModalCloseListeners.delete(fn);
  };
}

/**
 * Call before navigating to `/paywall` or presenting Superwall so stacked modals don’t obscure the paywall.
 */
export function useCloseModalsWhenPaywallOpens(closeAllModals: () => void) {
  const ref = useRef(closeAllModals);
  ref.current = closeAllModals;
  useEffect(() => {
    return registerPaywallModalCloseListener(() => ref.current());
  }, []);
}

type GateRefs = {
  pendingPurchaseCallbackRef: React.MutableRefObject<(() => void) | undefined>;
  paywallOpenedFromInAppGateRef: React.MutableRefObject<boolean>;
};

const PaywallGateRefsContext = createContext<GateRefs | null>(null);

export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pendingPurchaseCallbackRef = useRef<(() => void) | undefined>(
    undefined,
  );
  const paywallOpenedFromInAppGateRef = useRef(false);

  const showPaywall: ShowPaywallFn = useCallback(
    (onPurchased) => {
      flushPaywallModalClosers();
      pendingPurchaseCallbackRef.current = onPurchased;
      paywallOpenedFromInAppGateRef.current = true;
      router.push('/paywall');
    },
    [router],
  );

  const gateRefs = useMemo(
    () => ({
      pendingPurchaseCallbackRef,
      paywallOpenedFromInAppGateRef,
    }),
    [],
  );

  return (
    <PaywallGateRefsContext.Provider value={gateRefs}>
      <PaywallContext.Provider value={showPaywall}>
        {children}
      </PaywallContext.Provider>
    </PaywallGateRefsContext.Provider>
  );
}

export function usePaywall(): ShowPaywallFn {
  const fn = useContext(PaywallContext);
  if (!fn) {
    throw new Error('usePaywall must be used within PaywallProvider');
  }
  return fn;
}

/** For `app/paywall` only — session opened via `showPaywall()`. */
export function usePaywallGateRefs(): GateRefs {
  const ctx = useContext(PaywallGateRefsContext);
  if (!ctx) {
    throw new Error('usePaywallGateRefs must be used within PaywallProvider');
  }
  return ctx;
}
