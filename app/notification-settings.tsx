import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { ChevronLeft, Bell, ChevronRight, Check } from 'lucide-react-native';
import {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_TYPE_META,
  formatNotifTime,
  getNotificationPrefs,
  setNotificationPrefs,
  type NotificationPrefs,
  type NotifTypeKey,
} from '@/lib/notificationPreferences';
import {
  DEFAULT_NOTIFICATION_PERSONALITY,
  NOTIFICATION_VIBES,
  getNotificationPersonality,
  getNotificationVibeRowsForProfileUi,
  setNotificationPersonality,
  scheduleDailyNotifications,
  type NotificationPersonality,
} from '@/lib/notifications';

function timeToDate(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [vibe, setVibe] = useState<NotificationPersonality>(DEFAULT_NOTIFICATION_PERSONALITY);
  const [vibeOptions, setVibeOptions] =
    useState<readonly { id: NotificationPersonality; label: string; subtitle: string }[]>(
      NOTIFICATION_VIBES,
    );
  const [loading, setLoading] = useState(true);
  const [openPicker, setOpenPicker] = useState<NotifTypeKey | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, v, rows] = await Promise.all([
        getNotificationPrefs(),
        getNotificationPersonality(),
        getNotificationVibeRowsForProfileUi(),
      ]);
      if (!cancelled) {
        setPrefs(p);
        setVibe(v);
        setVibeOptions(rows);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  };

  const persist = useCallback(async (next: NotificationPrefs) => {
    setPrefs(next);
    await setNotificationPrefs(next);
    await scheduleDailyNotifications();
  }, []);

  const toggleType = (type: NotifTypeKey, enabled: boolean) => {
    const next: NotificationPrefs = {
      ...prefs,
      [type]: { ...prefs[type], enabled },
    };
    void persist(next);
  };

  const onTimeChange = (type: NotifTypeKey) => (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setOpenPicker(null);
      if (event.type !== 'set' || !date) return;
    } else if (!date) {
      return;
    }
    const next: NotificationPrefs = {
      ...prefs,
      [type]: { ...prefs[type], hour: date!.getHours(), minute: date!.getMinutes() },
    };
    // On iOS the inline spinner updates live; persist on each change.
    void persist(next);
  };

  const changeVibe = (id: NotificationPersonality) => {
    setVibe(id);
    void (async () => {
      await setNotificationPersonality(id);
      await scheduleDailyNotifications();
    })();
  };

  const openSystemSettings = () => {
    if (Platform.OS === 'ios') void Linking.openURL('app-settings:');
    else void Linking.openSettings();
  };

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
          <ChevronLeft color="#FFFFFF" size={26} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#4C91FF" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            Choose which daily reminders you want and the time each one arrives.
          </Text>

          <Text style={styles.sectionLabel}>Reminders</Text>
          <View style={styles.card}>
            {NOTIFICATION_TYPE_META.map((meta, idx) => {
              const pref = prefs[meta.id];
              const isLast = idx === NOTIFICATION_TYPE_META.length - 1;
              return (
                <View key={meta.id} style={[styles.typeRow, !isLast && styles.rowDivider]}>
                  <View style={styles.typeIcon}>
                    <Bell color="#4C91FF" size={18} />
                  </View>
                  <View style={styles.typeMid}>
                    <Text style={styles.typeLabel}>{meta.label}</Text>
                    <Text style={styles.typeSubtitle}>{meta.subtitle}</Text>
                    <TouchableOpacity
                      onPress={() => setOpenPicker(openPicker === meta.id ? null : meta.id)}
                      disabled={!pref.enabled}
                      style={[styles.timeChip, !pref.enabled && styles.timeChipDisabled]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[styles.timeChipText, !pref.enabled && styles.timeChipTextDisabled]}
                      >
                        {formatNotifTime(pref.hour, pref.minute)}
                      </Text>
                    </TouchableOpacity>
                    {openPicker === meta.id && pref.enabled ? (
                      <View style={styles.pickerWrap}>
                        <DateTimePicker
                          value={timeToDate(pref.hour, pref.minute)}
                          mode="time"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={onTimeChange(meta.id)}
                          themeVariant="dark"
                          textColor="#FFFFFF"
                        />
                        {Platform.OS === 'ios' ? (
                          <TouchableOpacity
                            onPress={() => setOpenPicker(null)}
                            style={styles.pickerDone}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.pickerDoneText}>Done</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  <Switch
                    value={pref.enabled}
                    onValueChange={(v) => toggleType(meta.id, v)}
                    trackColor={{ false: '#3A3A3A', true: '#4C91FF' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#3A3A3A"
                  />
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Reminder vibe</Text>
          <Text style={styles.sectionHint}>
            Pick how Leveld talks to you. Preset lines only—no custom text, so notifications stay
            safe and on-brand.
          </Text>
          <View style={styles.card}>
            {vibeOptions.map((v, idx) => {
              const selected = vibe === v.id;
              const isLast = idx === vibeOptions.length - 1;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vibeRow, !isLast && styles.rowDivider]}
                  onPress={() => changeVibe(v.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.typeMid}>
                    <Text style={[styles.typeLabel, selected && styles.vibeLabelSelected]}>
                      {v.label}
                    </Text>
                    <Text style={styles.typeSubtitle}>{v.subtitle}</Text>
                  </View>
                  {selected ? <Check color="#4C91FF" size={20} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.systemRow}
            onPress={openSystemSettings}
            activeOpacity={0.8}
          >
            <Text style={styles.systemRowText}>Open system notification settings</Text>
            <ChevronRight color="#64748B" size={20} />
          </TouchableOpacity>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerRight: { width: 44 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  intro: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  sectionHint: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2B2B2B',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  typeIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(76, 145, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  typeMid: { flex: 1, minWidth: 0 },
  typeLabel: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  typeSubtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  timeChip: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#23272E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#323842',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  timeChipDisabled: {
    opacity: 0.4,
  },
  timeChipText: {
    color: '#4C91FF',
    fontSize: 15,
    fontWeight: '700',
  },
  timeChipTextDisabled: {
    color: '#94A3B8',
  },
  pickerWrap: {
    marginTop: 8,
  },
  pickerDone: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#4C91FF',
    borderRadius: 10,
  },
  pickerDoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  vibeLabelSelected: {
    color: '#4C91FF',
  },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2B2B2B',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  systemRowText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
});
