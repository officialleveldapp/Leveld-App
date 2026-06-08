import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Timer } from 'lucide-react-native';
import { apiGetWorkouts } from '@/lib/api';

type WorkoutListItem = {
  id: string;
  workout_date: string;
  exercises: unknown[];
  duration_minutes: number;
  notes?: string;
};

function workoutTitle(notes: string | undefined): string {
  const t = typeof notes === 'string' ? notes.trim() : '';
  return t || 'Workout';
}

function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate + (isoDate.includes('T') ? '' : 'T12:00:00'));
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
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

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await apiGetWorkouts();
    if (!error && Array.isArray(data)) {
      setWorkouts(data as WorkoutListItem[]);
    } else {
      setWorkouts([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void (async () => {
        await load();
        if (!cancelled) setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

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
        <Text style={styles.topTitle}>Workout history</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#4C91FF" size="large" />
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
            workouts.length === 0 && styles.listEmptyGrow,
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4C91FF" />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No workouts logged yet.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() =>
                router.push({
                  pathname: '/workout-detail',
                  params: { id: item.id },
                })
              }
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {workoutTitle(item.notes)}
                </Text>
                <Text style={styles.rowDate}>{formatDate(item.workout_date)}</Text>
              </View>
              <View style={styles.durationPill}>
                <Timer color="#CFE2FF" size={14} />
                <Text style={styles.durationText}>{formatDuration(item.duration_minutes)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
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
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  listEmptyGrow: { flexGrow: 1 },
  emptyText: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 48,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  rowDate: {
    color: '#888888',
    fontSize: 13,
    marginTop: 4,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4C91FF18',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  durationText: {
    color: '#CFE2FF',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
