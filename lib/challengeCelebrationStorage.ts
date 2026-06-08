import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'leveld_pending_challenge_celebrations';

export type ChallengeCelebrationPayload = {
  participation_id: string;
  challenge_id: string;
  challenge_name: string;
  group_id: string;
  group_name: string;
};

export async function queueChallengeCelebrations(
  items: ChallengeCelebrationPayload[],
): Promise<void> {
  if (!items.length) return;
  const existing = await getPendingChallengeCelebrations();
  const merged = [...existing, ...items];
  await AsyncStorage.setItem(KEY, JSON.stringify(merged));
}

export async function getPendingChallengeCelebrations(): Promise<
  ChallengeCelebrationPayload[]
> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChallengeCelebrationPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function clearPendingChallengeCelebrations(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
