import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { apiGetWorkouts } from '@/lib/api';
import { Workout } from '@/types/database';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react-native';

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

export default function CalendarScreen() {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    loadWorkouts();
  }, [currentDate]);

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
    const workout = workouts.find((w) => w.workout_date === dateStr);
    if (!workout) return;
    router.push({
      pathname: '/(tabs)/calendar-workout',
      params: { workoutId: workout.id, workoutDate: dateStr },
    });
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
          <Text style={styles.title}>Calendar</Text>
          <Text style={styles.subtitle}>Track your workout history</Text>
        </View>

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
              const isToday = dateStr === today;

              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayCell,
                    hasWorkoutDay && styles.dayCellWithWorkout,
                  ]}
                  onPress={() => handleDayPress(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      hasWorkoutDay && styles.dayTextWithWorkout,
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

        <Card style={styles.statsCard}>
          <Text style={styles.statsTitle}>This Month</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{workouts.length}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {workouts.reduce((sum, w) => sum + w.xp_earned, 0)}
              </Text>
              <Text style={styles.statLabel}>XP Earned</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {workouts.reduce((sum, w) => sum + w.total_sets, 0)}
              </Text>
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
    marginBottom: 24,
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
  dayText: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextWithWorkout: {
    color: '#FFFFFF',
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
