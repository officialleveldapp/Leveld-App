import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { apiGetWorkouts, apiGetPersonalRecords } from '@/lib/api';
import { Workout, PersonalRecord } from '@/types/database';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Shield,
  Calendar,
  Swords,
  Crown,
  Star,
  Diamond,
  Gem,
  Trophy,
  Zap,
  ChevronDown,
  Timer,
  TrendingUp,
} from 'lucide-react-native';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { BodyModelWebView } from '@/components/BodyModelWebView';
import { MUSCLE_SLUGS, MUSCLE_DISPLAY_NAMES, MUSCLE_BENCHMARKS, type MuscleSlug } from '@/lib/modelViewerHtml';
import {
  STRENGTH_TIERS,
  getAllMuscleTiers,
  getOverallTier,
  buildTierColorMap,
  type AllMuscleTiers,
  type StrengthTier,
  type MuscleTierInfo,
} from '@/lib/strengthTiers';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Short labels for chart axis (distinct Sun vs Sat). */
const WEEKDAY_AXIS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type ProgressMode = 'strength' | 'calendar';

const TIER_ICONS: Record<number, React.ComponentType<{ color: string; size: number }>> = {
  0: Shield,
  1: Swords,
  2: Shield,
  3: Star,
  4: Crown,
  5: Gem,
  6: Diamond,
  7: Trophy,
};

function TierIcon({ rank, size = 18, color }: { rank: number; size?: number; color: string }) {
  const Icon = TIER_ICONS[rank] ?? Shield;
  return <Icon color={color} size={size} />;
}

function MuscleRow({
  slug,
  info,
  isSelected,
  onPress,
}: {
  slug: MuscleSlug;
  info: MuscleTierInfo;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { tier, bestWeight, bestExercise, nextTier, nextThreshold, progressToNext } = info;

  return (
    <TouchableOpacity
      style={[rowStyles.container, isSelected && rowStyles.containerSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={rowStyles.main}>
        <View style={[rowStyles.tierDot, { backgroundColor: tier.hex + '30' }]}>
          <TierIcon rank={tier.rank} size={14} color={tier.hex} />
        </View>
        <View style={rowStyles.nameCol}>
          <Text style={rowStyles.muscleName}>{MUSCLE_DISPLAY_NAMES[slug]}</Text>
          <Text style={rowStyles.benchmark}>{MUSCLE_BENCHMARKS[slug]}</Text>
        </View>
        <View style={rowStyles.rightCol}>
          <Text style={[rowStyles.tierName, { color: tier.hex }]}>{tier.name}</Text>
          <Text style={rowStyles.weight}>
            {bestWeight > 0 ? `${bestWeight} lbs` : '—'}
          </Text>
        </View>
        <ChevronDown
          color={isSelected ? '#4C91FF' : '#444'}
          size={14}
          style={{ transform: [{ rotate: isSelected ? '180deg' : '0deg' }] }}
        />
      </View>

      {isSelected && (
        <View style={rowStyles.expanded}>
          {bestWeight > 0 ? (
            <>
              {bestExercise && (
                <Text style={rowStyles.exerciseDetail}>
                  PR: {bestExercise} — {bestWeight} lbs
                </Text>
              )}
              {nextTier && nextThreshold ? (
                <View style={rowStyles.progressSection}>
                  <View style={rowStyles.progressTrack}>
                    <View
                      style={[
                        rowStyles.progressFill,
                        {
                          width: `${Math.round(progressToNext * 100)}%`,
                          backgroundColor: tier.hex,
                        },
                      ]}
                    />
                  </View>
                  <Text style={rowStyles.progressLabel}>
                    {bestWeight} / {nextThreshold} lbs to{' '}
                    <Text style={{ color: nextTier.hex, fontWeight: '700' }}>
                      {nextTier.name}
                    </Text>
                  </Text>
                </View>
              ) : (
                <Text style={rowStyles.maxLabel}>MAX RANK ACHIEVED</Text>
              )}
            </>
          ) : (
            <Text style={rowStyles.noData}>
              Log a {MUSCLE_BENCHMARKS[slug]} to start ranking
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function LineGraph({
  values,
  labels,
  color,
}: {
  values: number[];
  labels: string[];
  color: string;
}) {
  const pointCount = values.length;
  const maxValue = Math.max(1, ...values);
  const chartHeight = 78;
  const chartTopPad = 14;
  const chartBottomPad = 12;
  const xPad = 14;
  const spacing = 38;
  const plotHeight = chartHeight - chartTopPad - chartBottomPad;
  const viewWidth = xPad * 2 + Math.max(1, pointCount - 1) * spacing;
  const points = values.map((value, i) => {
    const x = xPad + i * spacing;
    const scaled = (value / maxValue) * plotHeight;
    const y = chartTopPad + (plotHeight - scaled);
    return { x, y, value };
  });
  const pointPath = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.lineChartWrap}>
      <Svg width="100%" height={chartHeight} viewBox={`0 0 ${viewWidth} ${chartHeight}`}>
        <Polyline
          points={`${xPad},${chartHeight - chartBottomPad} ${viewWidth - xPad},${chartHeight - chartBottomPad}`}
          stroke="#232323"
          strokeWidth={1}
          fill="none"
        />
        <Polyline
          points={pointPath}
          stroke={color}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
        {points.map((p, i) => (
          <React.Fragment key={`pt-${i}`}>
            <Circle cx={p.x} cy={p.y} r={4} fill={color} />
            <Circle cx={p.x} cy={p.y} r={7} fill={color} opacity={0.2} />
            <SvgText
              x={p.x}
              y={Math.max(10, p.y - 10)}
              fill="#9A9A9A"
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
            >
              {String(p.value)}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
      <View style={styles.lineChartAxisRow}>
        {labels.map((label) => (
          <Text key={label} style={styles.lineChartAxisLabel}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  containerSelected: {
    backgroundColor: '#1A1D24',
    borderBottomColor: '#2A2D34',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tierDot: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameCol: {
    flex: 1,
  },
  muscleName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  benchmark: {
    color: '#666',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  rightCol: {
    alignItems: 'flex-end',
    marginRight: 4,
  },
  tierName: {
    fontSize: 12,
    fontWeight: '800',
  },
  weight: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  expanded: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  exerciseDetail: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressSection: {
    gap: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressLabel: {
    color: '#777',
    fontSize: 11,
    fontWeight: '600',
  },
  maxLabel: {
    color: '#9B30FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  noData: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
});

/** Horizontal padding: ScrollView 20+20 + Card 16+16 */
const CALENDAR_GRID_H_INSET = 40 + 32;
const CALENDAR_ROW_GAP = 8;

export default function ProgressScreen() {
  const { profile } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const [mode, setMode] = useState<ProgressMode>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleSlug | null>(null);

  useEffect(() => {
    loadWorkouts();
  }, [currentDate]);

  useEffect(() => {
    loadPRs();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
      loadPRs();
    }, [currentDate, profile])
  );

  const loadWorkouts = async () => {
    if (!profile) return;
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
      const { data } = await apiGetWorkouts({ date_from: firstDay, date_to: lastDay });
      if (data) setWorkouts(data);
    } catch (error) {
      console.error('Error loading workouts:', error);
    }
  };

  const loadPRs = async () => {
    try {
      const { data } = await apiGetPersonalRecords();
      if (data) setPrs(data);
    } catch (error) {
      console.error('Error loading PRs:', error);
    }
  };

  const muscleTiers = useMemo(() => getAllMuscleTiers(prs), [prs]);
  const overallTier = useMemo(() => getOverallTier(muscleTiers), [muscleTiers]);
  const tierColorMap = useMemo(() => buildTierColorMap(muscleTiers), [muscleTiers]);

  const handleMusclePress = (slug: MuscleSlug) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedMuscle((prev) => (prev === slug ? null : slug));
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const hasWorkout = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0];
    return workouts.some((w) => w.workout_date === dateStr);
  };

  const handleDayPress = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0];
    const workout = workouts.find((w) => w.workout_date === dateStr);
    if (!workout) return;
    router.push({
      pathname: '/(tabs)/calendar-workout',
      params: { workoutId: workout.id, workoutDate: dateStr },
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthXp = useMemo(
    () => workouts.reduce((sum, w) => sum + w.xp_earned, 0),
    [workouts],
  );
  const monthSets = useMemo(
    () => workouts.reduce((sum, w) => sum + w.total_sets, 0),
    [workouts],
  );

  /** Minutes per ~7-day band within the visible month (for volume trend). */
  const weeklyMinutes = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const buckets = [0, 0, 0, 0, 0];
    for (const w of workouts) {
      const raw = w.workout_date.split('T')[0];
      const parts = raw.split('-').map(Number);
      if (parts.length < 3) continue;
      const [py, pm, pd] = parts;
      if (py !== year || pm !== month + 1) continue;
      const weekIdx = Math.min(4, Math.floor((pd - 1) / 7));
      buckets[weekIdx] += w.duration_minutes || 0;
    }
    return buckets;
  }, [workouts, currentDate]);

  /** Session count per weekday (Sun–Sat) for the visible month. */
  const weekdaySessionCounts = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const w of workouts) {
      const raw = w.workout_date.split('T')[0];
      const parts = raw.split('-').map(Number);
      if (parts.length < 3) continue;
      const [py, pm, pd] = parts;
      if (py !== year || pm !== month + 1) continue;
      const dow = new Date(year, month, pd).getDay();
      counts[dow] += 1;
    }
    return counts;
  }, [workouts, currentDate]);

  const days = getDaysInMonth();
  const calendarNumRows = Math.ceil(days.length / 7);
  const calendarGridLayout = useMemo(() => {
    const gridW = Math.max(0, windowWidth - CALENDAR_GRID_H_INSET);
    const cellSize = gridW / 7;
    const gridHeight =
      calendarNumRows * cellSize + Math.max(0, calendarNumRows - 1) * CALENDAR_ROW_GAP;
    return { cellSize, gridHeight };
  }, [windowWidth, calendarNumRows]);
  const today = new Date().toISOString().split('T')[0];

  const rankedCount = useMemo(() => {
    return MUSCLE_SLUGS.filter((s) => muscleTiers[s].tier.rank > 0).length;
  }, [muscleTiers]);

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <Text style={styles.subtitle}>Your strength journey</Text>
        </View>

        {/* Mode Toggle */}
        <Card style={styles.modeCard}>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'calendar' && styles.modeButtonActive]}
              onPress={() => setMode('calendar')}
            >
              <Calendar color={mode === 'calendar' ? '#FFFFFF' : '#999999'} size={16} />
              <Text style={[styles.modeText, mode === 'calendar' && styles.modeTextActive]}>
                Calendar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'strength' && styles.modeButtonActive]}
              onPress={() => setMode('strength')}
            >
              <Zap color={mode === 'strength' ? '#FFFFFF' : '#999999'} size={16} />
              <Text style={[styles.modeText, mode === 'strength' && styles.modeTextActive]}>
                Strength Map
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {mode === 'strength' ? (
          <>
            {/* Overall Rank + Stats Row */}
            <Card style={styles.rankCard}>
              <View style={styles.rankRow}>
                <View style={[styles.rankIcon, { backgroundColor: overallTier.hex + '22' }]}>
                  <TierIcon rank={overallTier.rank} size={28} color={overallTier.hex} />
                </View>
                <View style={styles.rankInfo}>
                  <Text style={styles.rankLabel}>Overall Rank</Text>
                  <Text style={[styles.rankName, { color: overallTier.hex }]}>
                    {overallTier.name}
                  </Text>
                </View>
                <View style={styles.rankStats}>
                  <Text style={styles.rankStatValue}>{rankedCount}/12</Text>
                  <Text style={styles.rankStatLabel}>Ranked</Text>
                </View>
              </View>
            </Card>

            {/* 3D Model — compact */}
            <Card style={styles.modelCard}>
              <View style={styles.modelContainer}>
                <BodyModelWebView highlight={selectedMuscle} muscleTiers={tierColorMap} />
              </View>
              {selectedMuscle && (
                <TouchableOpacity
                  style={styles.modelOverlayBadge}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSelectedMuscle(null);
                  }}
                >
                  <Text style={styles.modelOverlayText}>
                    {MUSCLE_DISPLAY_NAMES[selectedMuscle]} — Tap to deselect
                  </Text>
                </TouchableOpacity>
              )}
            </Card>

            {/* Tier Progression Bar */}
            <Card style={styles.tierBarCard}>
              <Text style={styles.tierBarTitle}>Strength Tiers</Text>
              <View style={styles.tierBar}>
                {STRENGTH_TIERS.map((t, i) => (
                  <View
                    key={t.rank}
                    style={[
                      styles.tierSegment,
                      {
                        backgroundColor: t.hex,
                        opacity: t.rank <= overallTier.rank ? 1 : 0.2,
                      },
                      i === 0 && { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
                      i === STRENGTH_TIERS.length - 1 && { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
                    ]}
                  />
                ))}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tierLabelsRow}
              >
                {STRENGTH_TIERS.map((t) => (
                  <View
                    key={t.rank}
                    style={[
                      styles.tierLabel,
                      overallTier.rank === t.rank && styles.tierLabelActive,
                    ]}
                  >
                    <View style={[styles.tierLabelDot, { backgroundColor: t.hex }]} />
                    <Text
                      style={[
                        styles.tierLabelText,
                        overallTier.rank === t.rank && { color: t.hex, fontWeight: '800' },
                      ]}
                    >
                      {t.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </Card>

            {/* Muscle Group List */}
            <Card style={styles.muscleListCard}>
              <Text style={styles.muscleListTitle}>Muscle Groups</Text>
              {MUSCLE_SLUGS.map((slug) => (
                <MuscleRow
                  key={slug}
                  slug={slug}
                  info={muscleTiers[slug]}
                  isSelected={selectedMuscle === slug}
                  onPress={() => handleMusclePress(slug)}
                />
              ))}
            </Card>
          </>
        ) : (
          <>
            {/* Calendar View */}
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
                  <Text key={day} style={styles.dayLabel}>{day}</Text>
                ))}
              </View>

              <View
                style={[
                  styles.daysGrid,
                  { height: calendarGridLayout.gridHeight },
                ]}
              >
                {days.map((day, index) => {
                  const row = Math.floor(index / 7);
                  const isLastCalendarRow = row === calendarNumRows - 1;
                  const dayCellStyle = [
                    styles.dayCell,
                    {
                      width: calendarGridLayout.cellSize,
                      height: calendarGridLayout.cellSize,
                    },
                    !isLastCalendarRow && styles.dayCellRowGap,
                    day !== null && hasWorkout(day) && styles.dayCellWithWorkout,
                  ];
                  if (day === null) {
                    return <View key={`empty-${index}`} style={dayCellStyle} />;
                  }
                  const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                    .toISOString().split('T')[0];
                  const hasWorkoutDay = hasWorkout(day);
                  const isToday = dateStr === today;

                  return (
                    <TouchableOpacity
                      key={day}
                      style={dayCellStyle}
                      onPress={() => handleDayPress(day)}
                    >
                      <Text style={[
                        styles.dayText,
                        hasWorkoutDay && styles.dayTextWithWorkout,
                        isToday && styles.dayTextToday,
                      ]}>
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

            {/* Monthly Stats */}
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

              <View style={styles.chartsDivider} />

              <View style={styles.chartSection}>
                <View style={styles.chartHeaderRow}>
                  <Timer color="#4C91FF" size={18} />
                  <View style={styles.chartHeaderText}>
                    <Text style={styles.chartTitle}>Training time by week</Text>
                    <Text style={styles.chartSubtitle}>
                      Minutes logged each week of this month — heavier weeks stand out.
                    </Text>
                  </View>
                </View>
                <LineGraph
                  values={weeklyMinutes}
                  labels={weeklyMinutes.map((_, i) => `W${i + 1}`)}
                  color="#4C91FF"
                />
              </View>

              <View style={styles.chartsDivider} />

              <View style={styles.chartSection}>
                <View style={styles.chartHeaderRow}>
                  <TrendingUp color="#51CF66" size={18} />
                  <View style={styles.chartHeaderText}>
                    <Text style={styles.chartTitle}>Sessions by weekday</Text>
                    <Text style={styles.chartSubtitle}>
                      How often you trained on each day — your weekly rhythm.
                    </Text>
                  </View>
                </View>
                <LineGraph
                  values={weekdaySessionCounts}
                  labels={WEEKDAY_AXIS}
                  color="#51CF66"
                />
              </View>
            </Card>
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

  // Mode toggle
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

  // Overall Rank
  rankCard: {
    marginBottom: 12,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankInfo: {
    flex: 1,
  },
  rankLabel: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  rankName: {
    fontSize: 22,
    fontWeight: '900',
  },
  rankStats: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
  },
  rankStatValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  rankStatLabel: {
    color: '#777',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },

  // 3D Model
  modelCard: {
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  modelContainer: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F0F10',
  },
  modelOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(76,145,255,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modelOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Tier Bar
  tierBarCard: {
    marginBottom: 12,
  },
  tierBarTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  tierBar: {
    flexDirection: 'row',
    height: 8,
    gap: 2,
    marginBottom: 10,
  },
  tierSegment: {
    flex: 1,
  },
  tierLabelsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  tierLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  tierLabelActive: {
    borderColor: '#4C91FF',
    backgroundColor: '#1A2A3A',
  },
  tierLabelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierLabelText: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
  },

  // Muscle List
  muscleListCard: {
    marginBottom: 16,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  muscleListTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    paddingHorizontal: 16,
  },

  // Calendar
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
    alignContent: 'flex-start',
    width: '100%',
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  /** Space between week rows only — avoids a dead strip under the last row. */
  dayCellRowGap: {
    marginBottom: CALENDAR_ROW_GAP,
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

  // Stats
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
  chartsDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginTop: 20,
    marginBottom: 4,
  },
  chartSection: {
    marginTop: 16,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  chartHeaderText: {
    flex: 1,
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  chartSubtitle: {
    color: '#777777',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 17,
  },
  lineChartWrap: {
    minHeight: 104,
  },
  lineChartAxisRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  lineChartAxisLabel: {
    color: '#666666',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});
