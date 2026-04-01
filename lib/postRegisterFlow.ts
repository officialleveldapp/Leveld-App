import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Profile } from '@/types/database';

const PAYWALL_PENDING = 'leveld_post_onboarding_paywall_pending';

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  }
  return SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function storageRemove(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

/** Matches Django Profile defaults for new users who have not finished in-app onboarding. */
export function profileNeedsOnboarding(profile: Profile | null): boolean {
  if (!profile) return true;
  const g = (profile.goal || '').trim();
  const e = (profile.experience_level || '').trim();
  return g === 'General Fitness' && e === 'Beginner';
}

export async function markPostOnboardingPaywallPending(): Promise<void> {
  await storageSet(PAYWALL_PENDING, '1');
}

export async function isPostOnboardingPaywallPending(): Promise<boolean> {
  return (await storageGet(PAYWALL_PENDING)) === '1';
}

export async function clearPostOnboardingPaywallPending(): Promise<void> {
  await storageRemove(PAYWALL_PENDING);
}
