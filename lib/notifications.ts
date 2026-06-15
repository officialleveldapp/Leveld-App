import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import type {
  NotificationContentAttachmentIos,
  NotificationContentInput,
  NotificationTriggerInput,
} from 'expo-notifications';

import LOGO_ASSET from '../assets/images/logo.png';
import { apiGetNotificationPresets } from '@/lib/api';
import {
  getNotificationPrefs,
  NOTIFICATION_TYPE_KEYS,
  type NotifTypeKey,
} from '@/lib/notificationPreferences';

// ---------------------------------------------------------------------------
// Notification handler — show banner + list when app is foregrounded
// ---------------------------------------------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ---------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ---------------------------------------------------------------------------
// Preset “vibes” — all copy is app-authored (no user-written notification text)
// ---------------------------------------------------------------------------

export const NOTIFICATION_PERSONALITIES = [
  'motivational',
  'nice',
  'aggressive',
  'troll',
  'chill',
] as const;

export type NotificationPersonality = (typeof NOTIFICATION_PERSONALITIES)[number];

export const DEFAULT_NOTIFICATION_PERSONALITY: NotificationPersonality = 'motivational';

const STORAGE_KEY = 'leveld.notificationPersonality.v1';
const NOTIF_MANIFEST_STORAGE_KEY = 'leveld.notificationPresetsManifest.v1';

export const NOTIFICATION_VIBES: ReadonlyArray<{
  id: NotificationPersonality;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'motivational',
    label: 'Motivational',
    subtitle: 'Classic pump-up lines',
  },
  {
    id: 'nice',
    label: 'Nice',
    subtitle: 'Warm, gentle, low pressure',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    subtitle: 'No-excuses drill energy',
  },
  {
    id: 'troll',
    label: 'Troll',
    subtitle: 'Playful roasts (preset only)',
  },
  {
    id: 'chill',
    label: 'Chill',
    subtitle: 'Easygoing “when you’re ready”',
  },
];

type NotifLine = { title: string; body: string };
type VibePools = { motivation: NotifLine[]; workout: NotifLine[]; social: NotifLine[] };

/** Last server bundle (offline + instant UI before network). */
export type NotificationPresetsBundle = {
  updated_at: string | null;
  presets: NotificationPresetApi[];
};

export type NotificationPresetApi = {
  slug: string;
  label: string;
  subtitle: string;
  sort_order: number;
  motivation_messages: NotifLine[];
  workout_messages: NotifLine[];
  social_messages: NotifLine[];
};

let remotePoolsCache: Partial<Record<string, VibePools>> | null = null;
let remoteVibeUi: Array<{
  id: string;
  label: string;
  subtitle: string;
}> | null = null;

const MOTIVATION_MESSAGES: NotifLine[] = [
  { title: 'You got this 💪', body: 'Every rep counts. Show up for yourself today.' },
  { title: 'Stay consistent', body: "The only bad workout is the one you didn't do." },
  { title: 'Level up today', body: 'Small progress is still progress. Keep pushing.' },
  { title: 'Be unstoppable', body: 'Champions are made when nobody is watching.' },
  { title: 'One more day', body: "Your future self will thank you for today's effort." },
  { title: 'No excuses', body: "Discipline beats motivation. Let's go." },
  { title: 'Keep the streak alive 🔥', body: "You've been crushing it. Don't stop now." },
];

const WORKOUT_REMINDERS: NotifLine[] = [
  { title: 'Time to train', body: 'Your workout is waiting. Open Leveld and get after it.' },
  { title: "Don't skip today", body: "Even 20 minutes makes a difference. Let's move." },
  { title: 'Ready to lift?', body: 'Tap here to start tracking your workout.' },
  { title: 'Hit the gym 🏋️', body: 'Your body is ready. Log your session in Leveld.' },
  { title: 'Workout check-in', body: "Have you trained yet today? Your streak depends on it." },
  { title: 'Iron is calling', body: 'Open Leveld, pick a plan, and crush it.' },
  { title: 'Your move', body: "Rest days are earned. If today isn't one — let's go." },
];

const SOCIAL_NUDGES: NotifLine[] = [
  { title: 'Check in with the crew', body: "See what your friends have been training. Open Groups." },
  { title: 'Your friends are active', body: 'Someone in your group just logged a workout. Take a look.' },
  { title: 'Share your progress', body: 'Post your latest workout and inspire the group.' },
  { title: 'Group challenge 🏆', body: 'Check how you stack up on the leaderboard.' },
  { title: 'Stay connected', body: 'A quick check-in keeps the motivation flowing. Open Leveld.' },
  { title: 'Community gains', body: 'Training together > training alone. See your feed.' },
  { title: "Who's winning?", body: 'Peek at the group leaderboard and claim your spot.' },
];

const NICE_POOL: VibePools = {
  motivation: [
    { title: 'Morning, friend', body: 'Take today one small step at a time. Rooting for you.' },
    { title: 'You’re enough', body: 'Effort counts, even on quiet days. Be kind to yourself.' },
    { title: 'Gentle nudge', body: 'Progress doesn’t have to be loud to be real.' },
    { title: 'Hydrate, breathe', body: 'When you’re ready to move, Leveld is here—no rush.' },
    { title: 'Soft reminder', body: 'You don’t have to be perfect—just honest with yourself.' },
    { title: 'Little wins', body: 'Showing up matters more than looking impressive.' },
    { title: 'Today’s plot', body: 'Maybe it’s a training day. Maybe it’s rest. Both can be okay.' },
  ],
  workout: [
    { title: 'Whenever you’re ready', body: 'A short session still counts. Open Leveld if it feels right.' },
    { title: 'No pressure', body: 'If you’ve got energy, your workout is waiting—guilt-free either way.' },
    { title: 'Friendly check-in', body: 'Moving a little beats not moving at all.' },
    { title: 'Your pace', body: 'Train in a way that still feels kind to your body.' },
    { title: 'We believe in you', body: 'Tap in when it feels right—no shame in slow days.' },
    { title: 'Optional session', body: 'If today’s the day, Leveld makes logging simple.' },
    { title: 'Easy does it', body: 'Pick something doable and call it a win.' },
  ],
  social: [
    { title: 'Say hi', body: 'Groups feel warmer with you in the mix. Peek when you can.' },
    { title: 'Your crew', body: 'A quick scroll through Groups might spark your next session.' },
    { title: 'Share if you like', body: 'Even a tiny update can cheer someone on.' },
    { title: 'Community warmth', body: 'People are training nearby—in spirit. Check the board.' },
    { title: 'Loosely connected', body: 'No obligation—just vibes in Groups when you want them.' },
    { title: 'Soft social', body: 'If you’re curious what friends logged, it’s all in Groups.' },
    { title: 'Belonging', body: 'You’re part of the grind—even on lurk days.' },
  ],
};

const AGGRESSIVE_POOL: VibePools = {
  motivation: [
    { title: 'UP.', body: 'Coffee doesn’t lift weights. You do. Move.' },
    { title: 'Excuses = 0', body: 'Discipline isn’t negotiable today. Open the app.' },
    { title: 'Clock’s ticking', body: 'Another day won’t train itself. Start.' },
    { title: 'Comfort is loud', body: 'Gains stay quiet until you earn the noise. Work.' },
    { title: 'No fluff', body: 'Show up, log sets, leave nothing on the table.' },
    { title: 'Standards', body: 'Average is a choice. Choose different today.' },
    { title: 'Execute', body: 'Motivation is optional. Action isn’t.' },
  ],
  workout: [
    { title: 'TRAIN', body: 'If you’re not hurt, you’re still negotiating. Open Leveld.' },
    { title: 'Session waiting', body: 'The bar doesn’t care about your mood. Move it anyway.' },
    { title: 'Stop negotiating', body: 'Pick a workout and run it. That’s the whole brief.' },
    { title: 'Weak default', body: 'Skip training and you’re voting for who you were yesterday.' },
    { title: 'Input required', body: 'Sweat now, or explain later to your own standards.' },
    { title: 'Non-optional', body: 'You don’t “try” to train—you train. Log it.' },
    { title: 'Go time', body: 'Four PM isn’t a suggestion. It’s a contract with yourself.' },
  ],
  social: [
    { title: 'Competition exists', body: 'Someone just trained while you thought about it. Catch up.' },
    { title: 'Leaderboards don’t wait', body: 'Groups tab. See the gap—then close it.' },
    { title: 'Accountability', body: 'Post progress or stay invisible. Both are statements.' },
    { title: 'Eyes on standards', body: 'Community rewards reps, not intentions. Log something.' },
    { title: 'Not a fan club', body: 'Groups are for work. Show yours.' },
    { title: 'Rank is earned', body: 'Scroll the feed after you’ve earned the scroll.' },
    { title: 'Pressure is a privilege', body: 'Someone in your group outworked you today. Respond.' },
  ],
};

const TROLL_POOL: VibePools = {
  motivation: [
    { title: 'Quick audit', body: 'Couch speedrun any%? Impressive. Gym’s still an option.' },
    { title: 'Allegedly', body: 'You’re “gonna go later.” Leveld is ready when fiction becomes fact.' },
    { title: 'Missing person', body: 'Your future PR filed a report. Last seen: not the gym.' },
    { title: 'Main character', body: 'Or background NPC. Your call—sub-five minutes to decide.' },
    { title: 'Plot twist', body: 'Leg day didn’t ghost you—you ghosted it. Rewrite the episode.' },
    { title: 'Thermostat check', body: 'If motivation is at zero, discipline is the patch. Install it.' },
    { title: 'Performance review', body: '“Thought about training.” Rating: needs improvement.' },
  ],
  workout: [
    { title: 'We’ve noticed', body: 'Thumb day isn’t a split. Lift something heavier than the phone.' },
    { title: 'Schedule says', body: 'Train before the algorithm schedules your regret.' },
    { title: 'Touch grass', body: 'After squats. Order matters.' },
    { title: 'NPC idle', body: 'Default animation detected. Switch to Leveld workout mode.' },
    { title: 'Cope vs reps', body: 'One builds muscle. Open the app and pick wisely.' },
    { title: 'Bench the excuses', body: 'They’re light. You can handle more weight than that.' },
    { title: 'Gym sub 5', body: 'Don’t be a spectator. Go train—timer starts now.' },
  ],
  social: [
    { title: 'Social experiment', body: 'Open Groups: who’s training vs posting cope?' },
    { title: 'Leaderboard lore', body: 'Someone climbed while you scrolled. Rude. Revenge optional.' },
    { title: 'FOMO loading', body: 'Feed moved. You can lurk or participate—both are loud.' },
    { title: 'Group chat energy', body: 'Quiet in there. A flex post would help. Statistically.' },
    { title: 'Sweat receipts', body: 'The board keeps score even if your camera doesn’t.' },
    { title: 'Friendly rivalry', body: 'Your friend didn’t ask to be your villain arc. Still happened.' },
    { title: 'Main feed', body: 'Training posts hit different than “soon.” Be the former.' },
  ],
};

const CHILL_POOL: VibePools = {
  motivation: [
    { title: 'Easy does it', body: 'When you feel like moving, Leveld’s here—no rush.' },
    { title: 'Low-key win', body: 'Any small session beats a perfect plan you never start.' },
    { title: 'Vibes check', body: 'Go-day or rest-day—both can be valid. You pick.' },
    { title: 'Optional hero arc', body: 'Open the app without a speech. Just move a little.' },
    { title: 'Soft launch', body: 'If today’s a training day, cool. If not, the app isn’t judging.' },
    { title: 'No manifesto', body: 'Sometimes motivation is just “might as well.” That counts.' },
    { title: 'Float downstream', body: 'When you’re ready to row, Leveld has the oars.' },
  ],
  workout: [
    { title: 'Whenever', body: 'Want a session? It’s in Leveld—streak guilt not included.' },
    { title: 'Chill session?', body: 'Light cardio, quick lift—log whatever you actually do.' },
    { title: 'No drama', body: 'Train like it’s Tuesday. It might literally be Tuesday.' },
    { title: 'Low stakes PR', body: 'Progress doesn’t need a spotlight—just a log entry.' },
    { title: 'If you want', body: 'Four PM is a suggestion. A good one, but still a suggestion.' },
    { title: 'Snack-sized workout', body: 'Short and done beats long and imaginary.' },
    { title: 'Easy mode', body: 'Open Leveld, tap something reasonable, close the loop.' },
  ],
  social: [
    { title: 'Casual peek', body: 'Groups when you’re curious—no pressure to perform.' },
    { title: 'Scroll the feed', body: 'Maybe you’ll see something that makes you wanna move.' },
    { title: 'Hang out', body: 'Community’s there if you want company on the grind.' },
    { title: 'Lurk allowed', body: 'You can watch the leaderboard without commenting. Still counts as showing up.' },
    { title: 'Low-key connect', body: 'Say hi if you feel like it. Ghosting the app is harder than ghosting texts.' },
    { title: 'Soft FOMO', body: 'Someone posted a workout. No stress—your turn can be later.' },
    { title: 'Group aquarium', body: 'Watch the fish swim. Jump in when the water feels right.' },
  ],
};

const VIBE_POOLS: Record<NotificationPersonality, VibePools> = {
  motivational: {
    motivation: MOTIVATION_MESSAGES,
    workout: WORKOUT_REMINDERS,
    social: SOCIAL_NUDGES,
  },
  nice: NICE_POOL,
  aggressive: AGGRESSIVE_POOL,
  troll: TROLL_POOL,
  chill: CHILL_POOL,
};

function normalizeLines(raw: unknown): NotifLine[] {
  if (!Array.isArray(raw)) return [];
  const out: NotifLine[] = [];
  for (const row of raw) {
    if (
      row &&
      typeof row === 'object' &&
      'title' in row &&
      'body' in row &&
      typeof (row as { title: unknown }).title === 'string' &&
      typeof (row as { body: unknown }).body === 'string'
    ) {
      const t = (row as { title: string; body: string }).title.trim();
      const b = (row as { title: string; body: string }).body.trim();
      if (t.length > 0 && b.length > 0) {
        out.push({ title: t, body: b });
      }
    }
  }
  return out;
}

function applyManifestToCache(data: NotificationPresetsBundle): void {
  remotePoolsCache = {};
  remoteVibeUi = [];
  for (const p of data.presets) {
    const motivation = normalizeLines(p.motivation_messages);
    const workout = normalizeLines(p.workout_messages);
    const social = normalizeLines(p.social_messages);
    if (motivation.length && workout.length && social.length) {
      remotePoolsCache[p.slug] = { motivation, workout, social };
      remoteVibeUi.push({
        id: p.slug,
        label: p.label,
        subtitle: p.subtitle,
      });
    }
  }
}

/** Load last successful API response from disk (no auth). */
export async function initNotificationPresetsCache(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const raw = await AsyncStorage.getItem(NOTIF_MANIFEST_STORAGE_KEY);
    if (raw) {
      applyManifestToCache(JSON.parse(raw) as NotificationPresetsBundle);
    }
  } catch {
    /* ignore */
  }
}

/** Fetch latest presets from API (requires session). Keeps disk cache on failure. */
export async function refreshNotificationPresetsFromApi(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { data, error } = await apiGetNotificationPresets();
    if (error || !data?.presets?.length) return;
    await AsyncStorage.setItem(NOTIF_MANIFEST_STORAGE_KEY, JSON.stringify(data));
    applyManifestToCache(data);
  } catch {
    /* keep cached */
  }
}

function getEnabledSlugs(): string[] {
  if (remoteVibeUi && remoteVibeUi.length > 0) {
    return remoteVibeUi.map((v) => v.id);
  }
  return [...NOTIFICATION_PERSONALITIES];
}

function resolvedDefaultPersonality(): NotificationPersonality {
  const slugs = getEnabledSlugs();
  if (slugs.includes(DEFAULT_NOTIFICATION_PERSONALITY)) {
    return DEFAULT_NOTIFICATION_PERSONALITY;
  }
  const first = slugs[0];
  if (first && (NOTIFICATION_PERSONALITIES as readonly string[]).includes(first)) {
    return first as NotificationPersonality;
  }
  return DEFAULT_NOTIFICATION_PERSONALITY;
}

function getPoolsFor(personality: string): VibePools {
  const remote = remotePoolsCache?.[personality];
  if (
    remote &&
    remote.motivation.length > 0 &&
    remote.workout.length > 0 &&
    remote.social.length > 0
  ) {
    return remote;
  }
  const b = VIBE_POOLS[personality as NotificationPersonality];
  if (b) return b;
  return VIBE_POOLS[resolvedDefaultPersonality()];
}

/** Profile UI: labels + subtitles from server when available. */
export async function getNotificationVibeRowsForProfileUi(): Promise<
  ReadonlyArray<{ id: NotificationPersonality; label: string; subtitle: string }>
> {
  await initNotificationPresetsCache();
  await refreshNotificationPresetsFromApi();
  if (remoteVibeUi && remoteVibeUi.length > 0) {
    return remoteVibeUi.map((v) => ({
      id: v.id as NotificationPersonality,
      label: v.label,
      subtitle: v.subtitle,
    }));
  }
  return NOTIFICATION_VIBES;
}

export async function getNotificationPersonality(): Promise<NotificationPersonality> {
  if (Platform.OS === 'web') return DEFAULT_NOTIFICATION_PERSONALITY;
  try {
    await initNotificationPresetsCache();
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const slugs = getEnabledSlugs();
    if (raw && slugs.includes(raw)) {
      return raw as NotificationPersonality;
    }
  } catch {
    /* ignore */
  }
  return resolvedDefaultPersonality();
}

export async function setNotificationPersonality(p: NotificationPersonality): Promise<void> {
  if (Platform.OS === 'web') return;
  const slugs = getEnabledSlugs();
  const next = slugs.includes(p) ? p : resolvedDefaultPersonality();
  await AsyncStorage.setItem(STORAGE_KEY, next);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Accent for Android notification surfaces (matches Leveld primary blue). */
const NOTIFICATION_ANDROID_COLOR = '#4C91FF';

/** Bump name when changing `LOGO_ASSET` so we don’t reuse a stale copy in Documents. */
const IOS_NOTIF_LOGO_FILE = 'leveld-notification-brand-v2.png';

function androidNotificationExtras():
  | { color: string }
  | Record<string, never> {
  return Platform.OS === 'android' ? { color: NOTIFICATION_ANDROID_COLOR } : {};
}

/**
 * iOS: `UNNotificationAttachment` reads `uri` (file URL), not only `url`. We copy the bundled
 * logo into the app documents directory so the path is a stable `file://` reference.
 * Shows as the thumbnail on the notification (and helps when the Simulator shows a generic
 * left glyph even though the home-screen icon is correct).
 */
async function iosBrandImageAttachments(): Promise<
  NotificationContentAttachmentIos[] | undefined
> {
  if (Platform.OS !== 'ios') return undefined;

  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) return undefined;

  const dest = `${baseDir}${IOS_NOTIF_LOGO_FILE}`;

  try {
    const asset = Asset.fromModule(LOGO_ASSET);
    await asset.downloadAsync();
    const src = asset.localUri ?? asset.uri;
    if (!src) return undefined;

    await FileSystem.copyAsync({ from: src, to: dest });
    const info = await FileSystem.getInfoAsync(dest);
    if (!info.exists) return undefined;

    const uri = dest.startsWith('file://') ? dest : `file://${dest}`;

    // Native iOS reads `uri`; TS types only document `url`. Include both.
    const row = {
      identifier: 'leveld-brand',
      url: uri,
      type: null,
      uri,
    } as unknown as NotificationContentAttachmentIos;
    return [row];
  } catch {
    return undefined;
  }
}

/** Try scheduling with optional iOS image attachment; fall back to text-only if attachment fails. */
async function scheduleLocalNotification(args: {
  identifier?: string;
  content: NotificationContentInput;
  trigger: NotificationTriggerInput;
}): Promise<void> {
  const { identifier, content, trigger } = args;
  const attach = await iosBrandImageAttachments();
  const withAttach: NotificationContentInput = attach
    ? { ...content, attachments: attach }
    : content;

  try {
    await Notifications.scheduleNotificationAsync({
      ...(identifier ? { identifier } : {}),
      content: withAttach,
      trigger,
    });
  } catch (e) {
    if (attach) {
      try {
        await Notifications.scheduleNotificationAsync({
          ...(identifier ? { identifier } : {}),
          content,
          trigger,
        });
        if (__DEV__) {
          console.warn(
            '[notifications] Scheduled without image attachment (iOS rejected attachment URL; text still works).',
          );
        }
        return;
      } catch {
        /* fall through */
      }
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Schedule the 3 daily notifications
// ---------------------------------------------------------------------------

/** Notification identifiers so we can cancel/replace them. */
const ID_MOTIVATION = 'leveld-daily-motivation';
const ID_WORKOUT = 'leveld-daily-workout';
const ID_SOCIAL = 'leveld-daily-social';

/** Maps each notification type to its identifier and the vibe copy pool it draws from. */
const TYPE_TO_ID: Record<NotifTypeKey, string> = {
  motivation: ID_MOTIVATION,
  workout: ID_WORKOUT,
  social: ID_SOCIAL,
};

/**
 * Schedule (or reschedule) the daily local notifications the user has enabled.
 *
 * Each enabled type fires once per day at its user-chosen time and repeats.
 * Disabled types are left cancelled. Content is randomised at schedule time and
 * follows the user’s chosen preset vibe (no custom user text).
 */
export async function scheduleDailyNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await initNotificationPresetsCache();
  await refreshNotificationPresetsFromApi();

  await cancelDailyNotifications();

  const prefs = await getNotificationPrefs();
  const personality = await getNotificationPersonality();
  const pool = getPoolsFor(personality);
  const androidExtras = androidNotificationExtras();

  try {
    for (const type of NOTIFICATION_TYPE_KEYS) {
      const pref = prefs[type];
      if (!pref.enabled) continue;

      const line = pickRandom(pool[type]);
      await scheduleLocalNotification({
        identifier: TYPE_TO_ID[type],
        content: {
          title: line.title,
          body: line.body,
          sound: 'default',
          ...androidExtras,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: pref.hour,
          minute: pref.minute,
        },
      });
    }
  } catch (e) {
    console.warn('[notifications] scheduleDailyNotifications failed', e);
  }
}

/** Cancel only the three Leveld daily notifications — leaves any other scheduled ones alone. */
export async function cancelDailyNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(ID_MOTIVATION),
    Notifications.cancelScheduledNotificationAsync(ID_WORKOUT),
    Notifications.cancelScheduledNotificationAsync(ID_SOCIAL),
  ]);
}
