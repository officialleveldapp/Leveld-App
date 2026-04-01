import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile } from '@/types/database';
import {
  apiLogin,
  apiRegister,
  apiGoogleSignIn,
  apiGetProfile,
  clearTokens,
  hasSession,
} from '@/lib/api';
import { clearPersistedWorkoutSession } from '@/lib/workoutSessionStorage';
import { clearPostOnboardingPaywallPending } from '@/lib/postRegisterFlow';

interface AuthContextType {
  user: { id: number; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithGoogle: (idToken: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      /network request failed|network error|failed to fetch/i.test(message)
    );
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

  const loadProfile = async () => {
    try {
      if (!(await hasSession())) {
        setUser(null);
        setProfile(null);
        return;
      }
      const { data, error } = await apiGetProfile();
      if (error) throw error;
      if (data) {
        const p = data as Profile;
        setProfile({
          ...p,
          is_pro: Boolean(p.is_pro),
        });
        setUser({ id: Number(p.id), email: p.email ?? '' });
      }
    } catch (error: any) {
      // A backend outage / simulator offline should not show a red runtime error
      // or wipe a valid local auth session.
      if (isNetworkError(error)) {
        console.warn('Profile unavailable (network):', error?.message || error);
        return;
      }

      console.warn('Error loading profile:', error);
      // Token may be expired and refresh failed.
      await clearTokens();
      try {
        await clearPersistedWorkoutSession();
      } catch {
        /* ignore */
      }
      setUser(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    await loadProfile();
  };

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
      throw new Error(error.detail || 'Failed to log in');
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
      const msg =
        error.detail ||
        (typeof error === 'string' ? error : null) ||
        'Google sign-in failed';
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

  const signOut = async () => {
    try {
      await clearTokens();
      await clearPersistedWorkoutSession();
      await clearPostOnboardingPaywallPending();
    } catch (e) {
      console.warn('signOut cleanup:', e);
    }
    setUser(null);
    setProfile(null);
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
