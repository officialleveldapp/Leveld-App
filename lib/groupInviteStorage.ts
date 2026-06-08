import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_KEY = 'leveld_pending_group_invite';
const OPEN_AFTER_TABS_KEY = 'leveld_open_group_after_tabs';

export async function setPendingGroupInvite(groupId: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, groupId);
}

export async function getPendingGroupInvite(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_KEY);
}

export async function clearPendingGroupInvite(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}

export async function setOpenGroupAfterTabsNav(groupId: string): Promise<void> {
  await AsyncStorage.setItem(OPEN_AFTER_TABS_KEY, groupId);
}

/** Read once and remove so we only open the group detail once. */
export async function getAndClearOpenGroupAfterTabsNav(): Promise<string | null> {
  const v = await AsyncStorage.getItem(OPEN_AFTER_TABS_KEY);
  if (v) await AsyncStorage.removeItem(OPEN_AFTER_TABS_KEY);
  return v;
}

export async function clearAllGroupInviteState(): Promise<void> {
  await AsyncStorage.multiRemove([PENDING_KEY, OPEN_AFTER_TABS_KEY]);
}
