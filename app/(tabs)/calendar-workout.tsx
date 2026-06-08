import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Award, Clock, Flame, Trophy, Zap } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { apiGetWorkouts } from '@/lib/api';
import type { Exercise, Workout } from '@/types/database';

function formatDurationMinutes(total: number): string {
  if (total <= 0) return '—';
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function workoutTitle(workout: Workout): string {
  const notes = workout.notes?.trim();
  if (notes) return notes;
  const names = workout.exercises?.map((e) => e.name).filter(Boolean) ?? [];
  if (names.length === 0) return 'Workout';
  if (names.length === 1) return names[0];
  return `${names[0]} + ${names.length - 1} more`;
}

function formatExerciseLine(ex: Exercise): string {
  const parts = [`${ex.sets}×${ex.reps}`];
  if (ex.weight != null && ex.weight > 0) {
    parts.push(`${ex.weight} lbs`);
  }
  if (ex.duration != null && ex.duration > 0) {
    parts.push(`${ex.duration} min`);
  }
  return parts.join(' · ');
}

export default function CalendarWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ workoutId?: string; workoutDate?: string }>();
  const workoutId = typeof params.workoutId === 'string' ? params.workoutId : '';
  const workoutDate = typeof params.workoutDate === 'string' ? params.workoutDate : '';

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workoutId || !workoutDate) {
      setError('Missing workout.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: apiError } = await apiGetWorkouts({
        date_from: workoutDate,
        date_to: workoutDate,
      });
      if (apiError) {
        setError('Could not load workout.');
        setWorkout(null);
        return;
      }
      const found = (data as Workout[] | undefined)?.find((w) => w.id === workoutId) ?? null;
      if (!found) {
        setError('Workout not found.');
        setWorkout(null);
        return;
      }
      setWorkout(found);
    } catch {
      setError('Could not load workout.');
      setWorkout(null);
    } finally {
      setLoading(false);
    }
  }, [workoutId, workoutDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const prCount =
    workout?.exercises?.filter((e) => e.is_new_pr).length ?? 0;

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to calendar"
          >
            <ChevronLeft color="#FFFFFF" size={22} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Workout</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#4C91FF" size="large" />
          </View>
        ) : error || !workout ? (
          <Card style={styles.card}>
            <Text style={styles.errorText}>{error ?? 'Workout unavailable.'}</Text>
            <TouchableOpacity onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.dateLabel}>
                {new Date(workout.workout_date + 'T12:00:00').toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.workoutName}>{workoutTitle(workout)}</Text>
            </View>

            <View style={styles.statRow}>
              <Card style={styles.statCard}>
                <Clock color="#4C91FF" size={22} />
                <Text style={styles.statValue}>{formatDurationMinutes(workout.duration_minutes)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </Card>
              <Card style={styles.statCard}>
                <Zap color="#FFB547" size={22} />
                <Text style={styles.statValue}>+{workout.xp_earned}</Text>
                <Text style={styles.statLabel}>Points (XP)</Text>
              </Card>
              <Card style={styles.statCard}>
                <Flame color="#FF6B6B" size={22} />
                <Text style={styles.statValue}>{workout.calories_burned}</Text>
                <Text style={styles.statLabel}>Calories</Text>
              </Card>
            </View>

            <Card style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>Session summary</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryValue}>{workout.total_sets}</Text>
                  <Text style={styles.summaryLabel}>Total sets</Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryValue}>{workout.total_reps}</Text>
                  <Text style={styles.summaryLabel}>Total reps</Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryValue}>{workout.exercises?.length ?? 0}</Text>
                  <Text style={styles.summaryLabel}>Exercises</Text>
                </View>
              </View>
            </Card>

            {prCount > 0 && (
              <Card style={styles.prBanner}>
                <Trophy color="#FFB547" size={22} />
                <View style={styles.prBannerText}>
                  <Text style={styles.prBannerTitle}>Personal records</Text>
                  <Text style={styles.prBannerSub}>
                    {prCount} exercise{prCount === 1 ? '' : 's'} with a new PR this session
                  </Text>
                </View>
              </Card>
            )}

            <Card style={styles.exercisesCard}>
              <View style={styles.exercisesHeader}>
                <Text style={styles.exercisesSectionTitle}>Exercises</Text>
                <Award color="#999999" size={18} />
              </View>
              {(workout.exercises?.length ?? 0) === 0 ? (
                <Text style={styles.muted}>No exercise breakdown saved for this workout.</Text>
              ) : (
                workout.exercises!.map((ex, i) => (
                  <View
                    key={`${ex.name}-${i}`}
                    style={[styles.exerciseRow, i > 0 && styles.exerciseRowBorder]}
                  >
                    <View style={styles.exerciseMain}>
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      <Text style={styles.exerciseMeta}>{formatExerciseLine(ex)}</Text>
                    </View>
                    {ex.is_new_pr ? (
                      <View style={styles.prPill}>
                        <Text style={styles.prPillText}>PR</Text>
                      </View>
                    ) : (
                      <View style={styles.prPillPlaceholder} />
                    )}
                  </View>
                ))
              )}
            </Card>

            {workout.notes?.trim() && workoutTitle(workout) !== workout.notes.trim() && (
              <Card style={styles.card}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.notesBody}>{workout.notes}</Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2B2B2B',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  centered: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
    paddingVertical: 4,
  },
  errorText: {
    color: '#CCCCCC',
    fontSize: 16,
    marginBottom: 12,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#4C91FF',
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  hero: {
    marginBottom: 20,
  },
  dateLabel: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  workoutName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 8,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  statLabel: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCell: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  summaryValue: {
    color: '#4C91FF',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    color: '#777777',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  prBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 71, 0.35)',
  },
  prBannerText: {
    flex: 1,
  },
  prBannerTitle: {
    color: '#FFB547',
    fontSize: 16,
    fontWeight: '800',
  },
  prBannerSub: {
    color: '#AAAAAA',
    fontSize: 13,
    marginTop: 2,
  },
  exercisesCard: {
    marginBottom: 16,
  },
  exercisesSectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  exercisesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  muted: {
    color: '#777777',
    fontSize: 14,
    marginTop: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  exerciseRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  exerciseMain: {
    flex: 1,
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  exerciseMeta: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '500',
  },
  prPill: {
    backgroundColor: 'rgba(255, 181, 71, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 71, 0.45)',
  },
  prPillText: {
    color: '#FFB547',
    fontSize: 12,
    fontWeight: '800',
  },
  prPillPlaceholder: {
    minWidth: 40,
  },
  notesBody: {
    color: '#CCCCCC',
    fontSize: 15,
    lineHeight: 22,
  },
});
