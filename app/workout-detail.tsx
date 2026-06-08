import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Timer } from 'lucide-react-native';
import { apiGetWorkouts } from '@/lib/api';

type ExerciseEntry = {
  name?: string;
  sets?: number;
  reps?: number;
  weight?: number;
};

function firstParam(v: string | string[] | undefined): string {
  if (v == null) return '';
  return Array.isArray(v) ? String(v[0] ?? '') : String(v);
}

function workoutTitle(notes: string | undefined): string {
  const t = typeof notes === 'string' ? notes.trim() : '';
  return t || 'Workout';
}

function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate + (isoDate.includes('T') ? '' : 'T12:00:00'));
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes || 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} hr` : `${h} hr ${r} min`;
}

function normalizeExercises(raw: unknown): ExerciseEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ExerciseEntry[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const nameRaw = typeof o.name === 'string' ? o.name.trim() : '';
    if (!nameRaw) continue;
    const setsRaw =
      typeof o.sets === 'number' ? o.sets : parseInt(String(o.sets ?? ''), 10);
    const repsRaw =
      typeof o.reps === 'number' ? o.reps : parseInt(String(o.reps ?? ''), 10);
    let weight: number | undefined;
    if (typeof o.weight === 'number' && Number.isFinite(o.weight)) {
      weight = o.weight;
    } else if (o.weight != null && String(o.weight).trim() !== '') {
      const w = parseFloat(String(o.weight));
      if (Number.isFinite(w)) weight = w;
    }
    out.push({
      name: nameRaw,
      sets: Number.isFinite(setsRaw) ? setsRaw : 0,
      reps: Number.isFinite(repsRaw) ? repsRaw : 0,
      weight,
    });
  }
  return out;
}

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = firstParam(idParam);

  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [durationMin, setDurationMin] = useState(0);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await apiGetWorkouts();
    if (error || !Array.isArray(data)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const w = data.find((x: { id?: string }) => x?.id === id);
    if (!w) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setTitle(workoutTitle(w.notes));
    setDateStr(typeof w.workout_date === 'string' ? w.workout_date : '');
    setDurationMin(
      typeof w.duration_minutes === 'number' ? w.duration_minutes : parseInt(String(w.duration_minutes ?? 0), 10) || 0,
    );
    setExercises(normalizeExercises(w.exercises));
    setNotFound(false);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft color="#FFFFFF" size={26} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          Workout
        </Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#4C91FF" size="large" />
        </View>
      ) : notFound ? (
        <View style={styles.centered}>
          <Text style={styles.muted}>Workout not found.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.dateLine}>{formatDate(dateStr)}</Text>
          <View style={styles.metaRow}>
            <Timer color="#4C91FF" size={18} />
            <Text style={styles.metaText}>{formatDuration(durationMin)}</Text>
          </View>

          <Text style={styles.sectionLabel}>Exercises</Text>
          {exercises.length === 0 ? (
            <Text style={styles.muted}>No exercise details saved for this session.</Text>
          ) : (
            exercises.map((ex, i) => (
              <View key={`${ex.name}-${i}`} style={styles.exRow}>
                <Text style={styles.exName}>{ex.name}</Text>
                <Text style={styles.exDetail}>
                  {ex.sets} × {ex.reps}
                  {ex.weight != null && ex.weight > 0 ? ` · ${ex.weight} lbs` : ''}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  dateLine: {
    color: '#999999',
    fontSize: 15,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: '#141414',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  metaText: {
    color: '#CFE2FF',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 28,
    marginBottom: 12,
  },
  exRow: {
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  exName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  exDetail: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  muted: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
  },
});
