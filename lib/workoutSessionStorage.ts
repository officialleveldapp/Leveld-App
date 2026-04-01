import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_KEY = 'leveld_active_session';

export async function readWorkoutSessionRaw(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem(SESSION_KEY)
      : null;
  }
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function writeWorkoutSessionRaw(raw: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, raw);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, raw);
}

export async function clearWorkoutSessionStorage(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

/** Clear persisted in-progress workout (same as disk cleanup on sign-out). */
export async function clearPersistedWorkoutSession(): Promise<void> {
  await clearWorkoutSessionStorage();
}
