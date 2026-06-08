import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_SEC = 'leveld_rest_timer_sec_v1';
const KEY_AUTO = 'leveld_rest_timer_auto_v1';

export const DEFAULT_REST_SEC = 90;

export function clampRestSec(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_REST_SEC;
  return Math.min(600, Math.max(15, Math.round(n)));
}

export async function getRestTimerSeconds(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SEC);
    if (raw == null) return DEFAULT_REST_SEC;
    return clampRestSec(parseInt(raw, 10));
  } catch {
    return DEFAULT_REST_SEC;
  }
}

export async function setRestTimerSeconds(sec: number): Promise<void> {
  await AsyncStorage.setItem(KEY_SEC, String(clampRestSec(sec)));
}

export async function getRestTimerAutoAfterExercise(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_AUTO);
    if (raw == null) return false;
    return raw === '1';
  } catch {
    return false;
  }
}

export async function setRestTimerAutoAfterExercise(on: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_AUTO, on ? '1' : '0');
}
