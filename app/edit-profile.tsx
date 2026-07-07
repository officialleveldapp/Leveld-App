import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Lock } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/contexts/AuthContext';
import { apiUpdateProfile } from '@/lib/api';

const GOALS = [
  { id: 'strength', label: 'Strength' },
  { id: 'endurance', label: 'Endurance' },
  { id: 'weight_loss', label: 'Weight Loss' },
  { id: 'general', label: 'General Fitness' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const WORKOUT_FREQUENCIES = [
  { id: 1, label: '1–2 days/week' },
  { id: 3, label: '3–4 days/week' },
  { id: 5, label: '5+ days/week' },
];

const TRAINING_ENVIRONMENTS = [
  { id: 'home', label: 'Home gym' },
  { id: 'gym', label: 'Commercial gym' },
  { id: 'both', label: 'Both' },
];

const SESSION_LENGTHS = [
  { id: 30, label: '~30 min' },
  { id: 45, label: '~45 min' },
  { id: 60, label: '60+ min' },
];

function normalizeGoalId(goal: string): string {
  const lower = goal.trim().toLowerCase();
  const byLabel = GOALS.find((g) => g.label.toLowerCase() === lower);
  if (byLabel) return byLabel.id;
  const byId = GOALS.find((g) => g.id === lower || g.id === goal);
  return byId?.id ?? goal;
}

function normalizeExperienceId(level: string): string {
  const lower = level.trim().toLowerCase();
  const byLabel = EXPERIENCE_LEVELS.find((e) => e.label.toLowerCase() === lower);
  if (byLabel) return byLabel.id;
  const byId = EXPERIENCE_LEVELS.find((e) => e.id === lower);
  return byId?.id ?? level;
}

function extractApiError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  const e = error as Record<string, unknown>;
  const detail = e.detail;
  if (Array.isArray(detail) && detail[0]) return String(detail[0]);
  if (typeof detail === 'string' && detail.trim()) return detail;
  for (const key of ['email', 'username', 'goal', 'experience_level']) {
    const v = e[key];
    if (Array.isArray(v) && v[0]) return String(v[0]);
  }
  const message = e.message;
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

function ChipRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <TouchableOpacity
              key={String(opt.id)}
              onPress={() => onChange(opt.id)}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useAuth();

  const isOAuthLinked = Boolean(
    profile?.signed_in_with_google || profile?.signed_in_with_apple,
  );
  const oauthProvider = profile?.signed_in_with_apple
    ? 'Apple'
    : profile?.signed_in_with_google
      ? 'Google'
      : null;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [goal, setGoal] = useState('general');
  const [experience, setExperience] = useState('beginner');
  const [frequency, setFrequency] = useState(3);
  const [environment, setEnvironment] = useState('gym');
  const [sessionMinutes, setSessionMinutes] = useState(45);
  const [bodyWeight, setBodyWeight] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [benchLbs, setBenchLbs] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username ?? '');
    setEmail(profile.email ?? '');
    setGoal(normalizeGoalId(profile.goal || 'general'));
    setExperience(normalizeExperienceId(profile.experience_level || 'beginner'));
    setFrequency(profile.workout_frequency || 3);
    setEnvironment(profile.training_environment || 'gym');
    setSessionMinutes(profile.session_length_minutes ?? 45);
    setBodyWeight(
      profile.body_weight_lbs != null ? String(profile.body_weight_lbs) : '',
    );
    setHeightInches(
      profile.height_inches != null ? String(profile.height_inches) : '',
    );
    setBenchLbs(
      profile.starting_bench_lbs != null ? String(profile.starting_bench_lbs) : '',
    );
  }, [profile]);

  const parseOptionalInt = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n);
  };

  const handleSave = async () => {
    setError(null);
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }
    if (!isOAuthLinked) {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        setError('Enter a valid email address.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        username: trimmedUsername,
        goal,
        experience_level: experience,
        workout_frequency: frequency,
        training_environment: environment,
        session_length_minutes: sessionMinutes,
        body_weight_lbs: parseOptionalInt(bodyWeight),
        height_inches: parseOptionalInt(heightInches),
        starting_bench_lbs: parseOptionalInt(benchLbs),
      };
      if (!isOAuthLinked) {
        payload.email = email.trim().toLowerCase();
      }

      const { error: apiError } = await apiUpdateProfile(payload);
      if (apiError) {
        throw new Error(extractApiError(apiError, 'Failed to update profile'));
      }

      await refreshProfile();
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <ChevronLeft color="#4C91FF" size={28} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Account</Text>

          <Input
            label="Display name"
            placeholder="Your name in the app"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="words"
            autoCorrect={false}
          />

          <View>
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isOAuthLinked}
              style={isOAuthLinked ? styles.lockedInput : undefined}
            />
            {isOAuthLinked ? (
              <View style={styles.lockedHint}>
                <Lock color="#64748B" size={14} />
                <Text style={styles.lockedHintText}>
                  Signed in with {oauthProvider} — email is managed by your {oauthProvider} account.
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Training basics</Text>

          <ChipRow label="Primary goal" options={GOALS} value={goal} onChange={setGoal} />
          <ChipRow
            label="Experience"
            options={EXPERIENCE_LEVELS}
            value={experience}
            onChange={setExperience}
          />
          <ChipRow
            label="Weekly frequency"
            options={WORKOUT_FREQUENCIES}
            value={frequency}
            onChange={setFrequency}
          />
          <ChipRow
            label="Where you train"
            options={TRAINING_ENVIRONMENTS}
            value={environment}
            onChange={setEnvironment}
          />
          <ChipRow
            label="Typical session"
            options={SESSION_LENGTHS}
            value={sessionMinutes}
            onChange={setSessionMinutes}
          />

          <Text style={styles.sectionTitle}>Body stats (optional)</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Input
                label="Weight (lbs)"
                placeholder="180"
                value={bodyWeight}
                onChangeText={setBodyWeight}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.statCol}>
              <Input
                label="Height (in)"
                placeholder="70"
                value={heightInches}
                onChangeText={setHeightInches}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Input
            label="Bench press (lbs)"
            placeholder="135"
            value={benchLbs}
            onChangeText={setBenchLbs}
            keyboardType="number-pad"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            title="Save changes"
            onPress={() => void handleSave()}
            loading={saving}
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: '#94A3B8', fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 4, width: 40 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: { width: 40 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 8,
  },
  fieldBlock: { marginBottom: 18 },
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  chipActive: {
    backgroundColor: 'rgba(76, 145, 255, 0.15)',
    borderColor: '#4C91FF',
  },
  chipText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#7FB1FF' },
  lockedInput: { opacity: 0.65 },
  lockedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
    marginBottom: 8,
  },
  lockedHintText: {
    flex: 1,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCol: { flex: 1 },
  errorText: {
    color: '#FDA4AF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  saveBtn: { marginTop: 8 },
});
