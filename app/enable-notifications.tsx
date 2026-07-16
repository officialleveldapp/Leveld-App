import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';
import {
  DEFAULT_NOTIFICATION_PERSONALITY,
  NOTIFICATION_VIBES,
  getNotificationPersonality,
  getNotificationVibeRowsForProfileUi,
  setNotificationPersonality,
  requestNotificationPermission,
  scheduleDailyNotifications,
  type NotificationPersonality,
} from '@/lib/notifications';
import { clearPostOnboardingNotificationsPending } from '@/lib/postRegisterFlow';
import { replaceWithPendingGroupInviteIfAny } from '@/lib/pendingGroupInviteNavigation';

export default function EnableNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [vibe, setVibe] = useState<NotificationPersonality>(
    DEFAULT_NOTIFICATION_PERSONALITY,
  );
  const [vibeOptions, setVibeOptions] =
    useState<readonly { id: NotificationPersonality; label: string; subtitle: string }[]>(
      NOTIFICATION_VIBES,
    );
  const [submitting, setSubmitting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [v, rows] = await Promise.all([
        getNotificationPersonality(),
        getNotificationVibeRowsForProfileUi(),
      ]);
      if (!cancelled) {
        setVibe(v);
        setVibeOptions(rows);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = useCallback(async () => {
    await clearPostOnboardingNotificationsPending();
    if (await replaceWithPendingGroupInviteIfAny(router)) return;
    router.replace('/(tabs)');
  }, [router]);

  const handleEnable = async () => {
    if (submitting) return;
    setSubmitting(true);
    setPermissionDenied(false);
    try {
      await setNotificationPersonality(vibe);

      if (Platform.OS === 'web') {
        await finish();
        return;
      }

      const granted = await requestNotificationPermission();
      if (!granted) {
        setPermissionDenied(true);
        return;
      }

      await scheduleDailyNotifications();
      await finish();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await setNotificationPersonality(vibe);
      await finish();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={['#0B0E14', '#050608']} style={styles.root}>
      <View
        style={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 20) + 20,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Bell color="#4C91FF" size={26} />
          </View>
          <Text style={styles.title}>Stay on track</Text>
          <Text style={styles.subtitle}>
            Daily reminders keep your streak alive. Pick a style — you can
            fine-tune everything later in settings.
          </Text>
        </View>

        <View style={styles.vibeList}>
          {vibeOptions.map((option) => {
            const selected = vibe === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setVibe(option.id)}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.chipLabel, selected && styles.chipLabelSelected]}
                >
                  {option.label}
                </Text>
                <Text style={styles.chipSubtitle} numberOfLines={1}>
                  {option.subtitle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          {permissionDenied ? (
            <Text style={styles.deniedHint}>
              Notifications are off in system settings. You can enable them
              later from Profile → Notifications.
            </Text>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={submitting}
            onPress={() => void handleEnable()}
            style={[styles.cta, submitting && styles.ctaDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaLabel}>Enable notifications</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void handleSkip()}
            disabled={submitting}
            style={styles.skipBtn}
            hitSlop={8}
          >
            <Text style={styles.skipText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 22,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(76, 145, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(76, 145, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  vibeList: {
    gap: 8,
  },
  chip: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#252D3A',
    backgroundColor: '#141922',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chipSelected: {
    borderColor: '#4C91FF',
    backgroundColor: '#161E2E',
  },
  chipLabel: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  chipLabelSelected: {
    color: '#7FB1FF',
  },
  chipSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 1,
  },
  footer: {
    marginTop: 'auto',
  },
  deniedHint: {
    color: '#FDA4AF',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 12,
  },
  cta: {
    backgroundColor: '#4C91FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  skipBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
});
