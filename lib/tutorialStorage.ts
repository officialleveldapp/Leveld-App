import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_TAB_TUTORIAL = 'leveld.hasSeenTabTutorial.v1';

export async function hasSeenTabTutorial(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_TAB_TUTORIAL)) === '1';
  } catch {
    return true; // fail safe: don't nag the user if storage is unavailable
  }
}

export async function markTabTutorialSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_TAB_TUTORIAL, '1');
  } catch {
    /* best-effort */
  }
}
