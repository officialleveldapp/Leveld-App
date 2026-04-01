import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Asset } from 'expo-asset';
import { WebView } from 'react-native-webview';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { apiGetWorkouts } from '@/lib/api';
import { Workout } from '@/types/database';
import { ChevronLeft, ChevronRight, Check, Activity, Calendar } from 'lucide-react-native';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type ProgressMode = 'calendar' | 'body';

export default function ProgressScreen() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<ProgressMode>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [modelUri, setModelUri] = useState<string | null>(null);
  const [modelFileName, setModelFileName] = useState<string | null>(null);
  const [modelBaseUrl, setModelBaseUrl] = useState<string | undefined>(undefined);
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkouts();
  }, [currentDate]);

  useEffect(() => {
    let mounted = true;

    const loadLocalModel = async () => {
      try {
        const asset = Asset.fromModule(require('../../Cesium_Man.glb'));
        await asset.downloadAsync();
        const local = asset.localUri ?? null;
        const fileName = local?.split('/').pop() ?? null;
        const baseUrl = local ? local.slice(0, local.lastIndexOf('/') + 1) : undefined;

        if (!local || !fileName || !baseUrl) {
          throw new Error('Local GLB asset URI is unavailable');
        }

        if (mounted) {
          setModelUri(local);
          setModelFileName(fileName);
          setModelBaseUrl(baseUrl);
          setModelError(null);
        }
      } catch (error) {
        console.error('Error loading local GLB asset:', error);
        if (mounted) {
          setModelError('Unable to load local body model.');
        }
      }
    };

    loadLocalModel();

    return () => {
      mounted = false;
    };
  }, []);

  const loadWorkouts = async () => {
    if (!profile) return;

    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const { data } = await apiGetWorkouts({
        date_from: firstDay,
        date_to: lastDay,
      });

      if (data) setWorkouts(data);
    } catch (error) {
      console.error('Error loading workouts:', error);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const hasWorkout = (day: number) => {
    const dateStr = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    )
      .toISOString()
      .split('T')[0];
    return workouts.some((w) => w.workout_date === dateStr);
  };

  const handleDayPress = (day: number) => {
    const dateStr = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    )
      .toISOString()
      .split('T')[0];
    setSelectedDate(dateStr);
    const workout = workouts.find((w) => w.workout_date === dateStr);
    setSelectedWorkout(workout || null);
  };

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const monthXp = useMemo(
    () => workouts.reduce((sum, workout) => sum + workout.xp_earned, 0),
    [workouts]
  );
  const monthSets = useMemo(
    () => workouts.reduce((sum, workout) => sum + workout.total_sets, 0),
    [workouts]
  );
  const monthVolume = useMemo(
    () => workouts.reduce((sum, workout) => sum + workout.total_reps * workout.total_sets, 0),
    [workouts]
  );

  // Map monthly training volume into a 1-10 "strength level".
  const strengthLevel = Math.max(1, Math.min(10, Math.ceil(monthVolume / 250)));
  const strengthPercent = Math.round((strengthLevel / 10) * 100);

  const modelViewerHtml = `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
    <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
    <style>
      html, body { margin: 0; padding: 0; background: #0f0f10; overflow: hidden; }
      model-viewer { width: 100vw; height: 100vh; --progress-bar-color: #4C91FF; }
      .status {
        position: fixed;
        bottom: 10px;
        left: 10px;
        right: 10px;
        color: #b6b6b6;
        font: 12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
        text-align: center;
        opacity: 0.9;
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <model-viewer
      src="${modelFileName ?? ''}"
      camera-controls
      auto-rotate
      shadow-intensity="1"
      exposure="1"
      environment-image="neutral"
      disable-tap
    ></model-viewer>
    <div class="status" id="status">Loading model...</div>
    <script>
      const mv = document.querySelector('model-viewer');
      const status = document.getElementById('status');
      mv.addEventListener('load', () => {
        status.textContent = 'Model loaded';
        setTimeout(() => { status.style.display = 'none'; }, 1200);
      });
      mv.addEventListener('error', () => {
        status.textContent = 'Failed to load model';
      });
    </script>
  </body>
</html>`;

  const days = getDaysInMonth();
  const today = new Date().toISOString().split('T')[0];

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <Text style={styles.subtitle}>Track progress by calendar or 3D body model</Text>
        </View>

        <Card style={styles.modeCard}>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'calendar' && styles.modeButtonActive]}
              onPress={() => setMode('calendar')}
            >
              <Calendar color={mode === 'calendar' ? '#FFFFFF' : '#999999'} size={16} />
              <Text style={[styles.modeText, mode === 'calendar' && styles.modeTextActive]}>
                Calendar Tracking
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'body' && styles.modeButtonActive]}
              onPress={() => setMode('body')}
            >
              <Activity color={mode === 'body' ? '#FFFFFF' : '#999999'} size={16} />
              <Text style={[styles.modeText, mode === 'body' && styles.modeTextActive]}>
                Body Model
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {mode === 'calendar' ? (
          <>
            <Card style={styles.calendarCard}>
              <View style={styles.monthHeader}>
                <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
                  <ChevronLeft color="#FFFFFF" size={24} />
                </TouchableOpacity>
                <Text style={styles.monthText}>
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
                  <ChevronRight color="#FFFFFF" size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.daysHeader}>
                {DAYS.map((day) => (
                  <Text key={day} style={styles.dayLabel}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {days.map((day, index) => {
                  if (day === null) {
                    return <View key={`empty-${index}`} style={styles.dayCell} />;
                  }

                  const dateStr = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    day
                  )
                    .toISOString()
                    .split('T')[0];
                  const hasWorkoutDay = hasWorkout(day);
                  const isSelected = selectedDate === dateStr;
                  const isToday = dateStr === today;

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayCell,
                        hasWorkoutDay && styles.dayCellWithWorkout,
                        isSelected && styles.dayCellSelected,
                      ]}
                      onPress={() => handleDayPress(day)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          hasWorkoutDay && styles.dayTextWithWorkout,
                          isSelected && styles.dayTextSelected,
                          isToday && styles.dayTextToday,
                        ]}
                      >
                        {day}
                      </Text>
                      {hasWorkoutDay && (
                        <View style={styles.workoutIndicator}>
                          <Check color="#4C91FF" size={12} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {selectedWorkout && (
              <Card style={styles.detailsCard}>
                <Text style={styles.detailsTitle}>Workout Details</Text>
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Sets</Text>
                    <Text style={styles.detailValue}>
                      {selectedWorkout.total_sets}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Reps</Text>
                    <Text style={styles.detailValue}>
                      {selectedWorkout.total_reps}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>XP</Text>
                    <Text style={styles.detailValue}>
                      +{selectedWorkout.xp_earned}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Calories</Text>
                    <Text style={styles.detailValue}>
                      {selectedWorkout.calories_burned}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>
                      {selectedWorkout.duration_minutes}m
                    </Text>
                  </View>
                </View>
                {selectedWorkout.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.notesText}>{selectedWorkout.notes}</Text>
                  </View>
                )}
              </Card>
            )}
          </>
        ) : (
          <Card style={styles.bodyCard}>
            <Text style={styles.bodyTitle}>3D Strength Body</Text>
            <Text style={styles.bodySubtitle}>
              Using your local `Cesium_Man.glb` model. Rotate to inspect overall strength progress.
            </Text>

            <View style={styles.modelContainer}>
              {modelUri && modelBaseUrl ? (
                <WebView
                  originWhitelist={['*']}
                  source={{ html: modelViewerHtml, baseUrl: modelBaseUrl }}
                  style={styles.webview}
                  allowsInlineMediaPlayback
                  javaScriptEnabled
                  scrollEnabled={false}
                  allowFileAccess
                  allowingReadAccessToURL={modelBaseUrl}
                  allowFileAccessFromFileURLs
                />
              ) : (
                <View style={styles.modelLoading}>
                  <Text style={styles.modelLoadingText}>
                    {modelError ?? 'Loading local body model...'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.strengthHeader}>
              <Text style={styles.strengthTitle}>Strength Level</Text>
              <Text style={styles.strengthValue}>Lv {strengthLevel}/10</Text>
            </View>
            <View style={styles.strengthBarTrack}>
              <View style={[styles.strengthBarFill, { width: `${strengthPercent}%` }]} />
            </View>
            <Text style={styles.strengthHint}>
              Based on this month&apos;s volume ({monthVolume.toLocaleString()} total reps x sets)
            </Text>
          </Card>
        )}

        <Card style={styles.statsCard}>
          <Text style={styles.statsTitle}>This Month</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{workouts.length}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{monthXp}</Text>
              <Text style={styles.statLabel}>XP Earned</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{monthSets}</Text>
              <Text style={styles.statLabel}>Total Sets</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: '#999999',
    fontSize: 16,
    marginTop: 4,
  },
  modeCard: {
    marginBottom: 16,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2F2F2F',
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#151515',
  },
  modeButtonActive: {
    backgroundColor: '#4C91FF',
    borderColor: '#4C91FF',
  },
  modeText: {
    color: '#999999',
    fontSize: 13,
    fontWeight: '700',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  calendarCard: {
    marginBottom: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dayLabel: {
    flex: 1,
    color: '#999999',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  dayCellWithWorkout: {
    backgroundColor: '#1E2A3A',
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: '#4C91FF',
    borderRadius: 8,
  },
  dayText: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextWithWorkout: {
    color: '#FFFFFF',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#FFB547',
    fontWeight: '700',
  },
  workoutIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  detailsCard: {
    marginBottom: 16,
  },
  detailsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  detailLabel: {
    color: '#999999',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    color: '#4C91FF',
    fontSize: 18,
    fontWeight: '700',
  },
  notesSection: {
    marginTop: 8,
  },
  notesText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4,
  },
  bodyCard: {
    marginBottom: 16,
  },
  bodyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  bodySubtitle: {
    color: '#A0A0A0',
    fontSize: 13,
    marginBottom: 12,
  },
  modelContainer: {
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 14,
    backgroundColor: '#0F0F10',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0F0F10',
  },
  modelLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modelLoadingText: {
    color: '#A0A0A0',
    fontSize: 13,
    textAlign: 'center',
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  strengthTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  strengthValue: {
    color: '#4C91FF',
    fontSize: 15,
    fontWeight: '800',
  },
  strengthBarTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#222222',
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4C91FF',
  },
  strengthHint: {
    color: '#9A9A9A',
    fontSize: 12,
  },
  statsCard: {
    marginBottom: 16,
  },
  statsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: '#999999',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
