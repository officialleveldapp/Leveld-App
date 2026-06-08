import type { NavigationState, PartialState } from '@react-navigation/native';

type StoreShape = {
  navigationRef: {
    isReady: () => boolean;
    resetRoot: (s: PartialState<NavigationState> | NavigationState) => void;
  };
  getStateForHref: (href: string) => PartialState<NavigationState> | undefined;
};

function getStore(): StoreShape | null {
  try {
    return require('expo-router/build/global-state/router-store')
      .store as StoreShape;
  } catch {
    return null;
  }
}

/**
 * Reset root to a path using Expo’s linking state (always targets the real root stack).
 */
function tryResetRootHref(href: string): boolean {
  try {
    const store = getStore();
    if (!store) return false;
    const nav = store.navigationRef;
    if (!nav.isReady()) return false;
    const state = store.getStateForHref(href);
    if (state && Array.isArray(state.routes) && state.routes.length > 0) {
      nav.resetRoot(state);
      return true;
    }
  } catch (e) {
    console.warn('[resetToWelcome] resetRoot href failed', href, e);
  }
  return false;
}

const MIN_INDEX_ROOT: PartialState<NavigationState> = {
  index: 0,
  routes: [{ name: 'index' }],
};

const MIN_AUTH_LOGIN_ROOT: PartialState<NavigationState> = {
  index: 0,
  routes: [{ name: 'auth/login' as const }],
};

function tryResetRootFallback(
  partial: PartialState<NavigationState>,
): boolean {
  try {
    const store = getStore();
    if (!store) return false;
    const nav = store.navigationRef;
    if (!nav.isReady()) return false;
    nav.resetRoot(partial);
    return true;
  } catch (e) {
    console.warn('[resetToWelcome] resetRoot fallback failed', e);
  }
  return false;
}

/** Welcome / marketing screen (`app/index`). */
export function resetToWelcome(): void {
  if (tryResetRootHref('/')) return;
  queueMicrotask(() => tryResetRootHref('/'));
  requestAnimationFrame(() => tryResetRootHref('/'));
  for (const ms of [16, 50, 120, 280, 520, 1000]) {
    setTimeout(() => {
      if (!tryResetRootHref('/')) {
        tryResetRootFallback(MIN_INDEX_ROOT);
      }
    }, ms);
  }
}

/**
 * After sign-out: land on **login** first (clear for App Review), then welcome.
 * Always uses `resetRoot` — never `router.replace` from inside tabs.
 */
export function resetAfterSignOut(): void {
  const attempt = () => {
    if (tryResetRootHref('/auth/login')) return true;
    if (tryResetRootHref('/')) return true;
    if (tryResetRootFallback(MIN_AUTH_LOGIN_ROOT)) return true;
    return tryResetRootFallback(MIN_INDEX_ROOT);
  };

  if (attempt()) return;
  queueMicrotask(attempt);
  requestAnimationFrame(attempt);
  for (const ms of [16, 50, 120, 280, 520, 1000, 2000]) {
    setTimeout(attempt, ms);
  }
}
