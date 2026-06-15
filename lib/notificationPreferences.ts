import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'leveld.notificationPrefs.v1';

export const NOTIFICATION_TYPE_KEYS = ['motivation', 'workout', 'social'] as const;

export type NotifTypeKey = (typeof NOTIFICATION_TYPE_KEYS)[number];

export interface NotifTypePref {
  enabled: boolean;
  /** 0-23 */
  hour: number;
  /** 0-59 */
  minute: number;
}

export type NotificationPrefs = Record<NotifTypeKey, NotifTypePref>;

/** UI metadata for each notification type (label + helper copy). */
export const NOTIFICATION_TYPE_META: ReadonlyArray<{
  id: NotifTypeKey;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'motivation',
    label: 'Daily motivation',
    subtitle: 'A morning push to start your day strong',
  },
  {
    id: 'workout',
    label: 'Workout reminder',
    subtitle: 'A nudge to train and log your session',
  },
  {
    id: 'social',
    label: 'Social nudge',
    subtitle: 'Check in on groups, friends, and the leaderboard',
  },
];

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  motivation: { enabled: true, hour: 8, minute: 0 },
  workout: { enabled: true, hour: 16, minute: 0 },
  social: { enabled: true, hour: 20, minute: 0 },
};

function clampHour(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(23, Math.max(0, Math.round(n)));
}

function clampMinute(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(59, Math.max(0, Math.round(n)));
}

function sanitizeType(
  raw: Partial<NotifTypePref> | undefined,
  fallback: NotifTypePref,
): NotifTypePref {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : fallback.enabled,
    hour: clampHour(typeof raw.hour === 'number' ? raw.hour : fallback.hour),
    minute: clampMinute(typeof raw.minute === 'number' ? raw.minute : fallback.minute),
  };
}

function sanitizePrefs(raw: Partial<NotificationPrefs> | null | undefined): NotificationPrefs {
  return {
    motivation: sanitizeType(raw?.motivation, DEFAULT_NOTIFICATION_PREFS.motivation),
    workout: sanitizeType(raw?.workout, DEFAULT_NOTIFICATION_PREFS.workout),
    social: sanitizeType(raw?.social, DEFAULT_NOTIFICATION_PREFS.social),
  };
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) return { ...DEFAULT_NOTIFICATION_PREFS };
    return sanitizePrefs(JSON.parse(raw) as Partial<NotificationPrefs>);
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

export async function setNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizePrefs(prefs)));
  } catch {
    /* best-effort persistence */
  }
}

/** Format an hour/minute pair as a localized 12-hour string, e.g. "8:00 AM". */
export function formatNotifTime(hour: number, minute: number): string {
  const h = clampHour(hour);
  const m = clampMinute(minute);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
}
