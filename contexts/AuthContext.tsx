import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { InteractionManager, Platform } from 'react-native';
import { Profile } from '@/types/database';
import {
  apiLogin,
  apiRegister,
  apiGoogleSignIn,
  apiGetProfile,
  apiLogout,
  apiDeleteAccount,
  clearTokens,
  hasSession,
} from '@/lib/api';
import { clearPersistedWorkoutSession } from '@/lib/workoutSessionStorage';
import { clearPostOnboardingPaywallPending } from '@/lib/postRegisterFlow';
import { resetAfterSignOut, resetToWelcome } from '@/lib/resetToWelcome';
import { clearAllGroupInviteState } from '@/lib/groupInviteStorage';

interface AuthContextType {
  user: { id: number; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithGoogle: (idToken: string) => Promise<any>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Pull a human-readable message out of any API error shape so the on-screen
 * error reflects the real cause (network/timeout, bad credentials, server detail)
 * instead of a generic fallback. Order: detail → field errors → message → string.
 */
function extractAuthErrorMessage(error: any, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  const detail = (error as { detail?: string | string[] }).detail;
  if (Array.isArray(detail) && detail[0]) return String(detail[0]);
  if (typeof detail === 'string' && detail.trim()) return detail;
  const nonField = (error as { non_field_errors?: string[] }).non_field_errors;
  if (Array.isArray(nonField) && nonField[0]) return String(nonField[0]);
  // First field-level error (e.g. { email: ["..."] }).
  for (const key of ['email', 'password', 'username', 'id_token']) {
    const v = (error as Record<string, unknown>)[key];
    if (Array.isArray(v) && v[0]) return String(v[0]);
  }
  const message = (error as { message?: string }).message;
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

async function clearLocalSession(): Promise<void> {
  await Promise.allSettled([
    clearTokens(),
    clearPersistedWorkoutSession(),
    clearPostOnboardingPaywallPending(),
    clearAllGroupInviteState(),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: number; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initSession();
  }, []);

  const isNetworkError = (error: any): boolean => {
    const message =
      typeof error === 'string'
        ? error
        : error?.message || error?.detail || '';
    return (
      typeof message === 'string' &&
      /network request failed|network error|failed to fetch|timed out|timeout|aborted/i.test(
        message,
      )
    );
  };

  /** RN/WKWebView sometimes surfaces this for JSON fetches — not an auth failure; avoid signing out. */
  const isTransientBlobFetchError = (error: any): boolean => {
    const message =
      typeof error === 'string'
        ? error
        : typeof error?.message === 'string'
          ? error.message
          : '';
    return /unable to resolve data for blob/i.test(message);
  };

  const initSession = async () => {
    try {
      const active = await hasSession();
      if (active) {
        await loadProfile();
      }
    } catch (error) {
      console.warn('Error initialising session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = useCallback(async () => {
    try {
      if (!(await hasSession())) {
        setUser(null);
        setProfile(null);
        return;
      }
      const { data, error } = await apiGetProfile();
      if (error) {
        if (isTransientBlobFetchError(error)) {
          console.warn(
            'Profile fetch skipped (transient blob / fetch infrastructure):',
            error?.message ?? error,
          );
          return;
        }
        throw error;
      }
      if (data) {
        const p = data as Profile;
        setProfile({
          ...p,
          is_pro: Boolean(p.is_pro),
        });
        setUser({ id: Number(p.id), email: p.email ?? '' });
      }
    } catch (error: any) {
      if (isNetworkError(error) || isTransientBlobFetchError(error)) {
        console.warn('Profile unavailable (transient):', error?.message || error);
        return;
      }

      console.warn('Error loading profile:', error);
      setUser(null);
      setProfile(null);
      try {
        await clearLocalSession();
      } catch {
        /* ignore */
      }
      if (Platform.OS !== 'web') {
        resetToWelcome();
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await apiRegister(email, password, username);
    if (error) {
      const msg =
        error.email?.[0] ||
        error.username?.[0] ||
        error.password?.[0] ||
        error.detail ||
        'Failed to create account';
      throw new Error(msg);
    }
    if (data) {
      await clearPostOnboardingPaywallPending();
      setUser(data.user);
      const prof = data.profile as Profile;
      setProfile({ ...prof, is_pro: Boolean(prof.is_pro) });
    }
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await apiLogin(email, password);
    if (error) {
      throw new Error(extractAuthErrorMessage(error, 'Failed to log in'));
    }
    if (data) {
      await clearPostOnboardingPaywallPending();
      setUser(data.user);
      const prof = data.profile as Profile;
      setProfile({ ...prof, is_pro: Boolean(prof.is_pro) });
    }
    return { data, error };
  };

  const signInWithGoogle = async (idToken: string) => {
    const { data, error } = await apiGoogleSignIn(idToken);
    if (error) {
      throw new Error(extractAuthErrorMessage(error, 'Google sign-in failed'));
    }
    if (data) {
      await clearPostOnboardingPaywallPending();
      setUser(data.user);
      const prof = data.profile as Profile;
      setProfile({ ...prof, is_pro: Boolean(prof.is_pro) });
    }
    return { data, error };
  };

  const signOut = async () => {
    try {
      await apiLogout();
    } catch {
      /* still sign out locally */
    }

    try {
      await clearLocalSession();
    } catch {
      /* ignore */
    }

    setUser(null);
    setProfile(null);

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.location.assign('/');
      return;
    }

    InteractionManager.runAfterInteractions(() => {
      resetAfterSignOut();
    });
    setTimeout(() => resetAfterSignOut(), 500);
  };

  const deleteAccount = async () => {
    const { error } = await apiDeleteAccount();
    if (error) {
      const detail = (error as { detail?: string | string[] })?.detail;
      const msg = Array.isArray(detail)
        ? detail[0]
        : typeof detail === 'string'
          ? detail
          : 'Failed to delete account';
      throw new Error(msg);
    }

    try {
      await clearLocalSession();
    } catch {
      /* ignore */
    }

    setUser(null);
    setProfile(null);

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.location.assign('/');
      return;
    }

    InteractionManager.runAfterInteractions(() => {
      resetAfterSignOut();
    });
    setTimeout(() => resetAfterSignOut(), 500);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        deleteAccount,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
