import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import {
  Trophy,
  Zap,
  Dumbbell,
  Timer,
  Flame,
  Crown,
  TrendingUp,
} from 'lucide-react-native';

/** Expo Router params are strings; duplicate keys can become string[]. */
function firstParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function parseRouteInt(v: string | string[] | undefined, fallback = 0): number {
  const s = firstParam(v);
  if (s == null || s === '') return fallback;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseNewPRsParam(v: string | string[] | undefined): string[] {
  const raw = firstParam(v);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function FadeInView({
  delay = 0,
  duration = 500,
  style,
  children,
}: {
  delay?: number;
  duration?: number;
  style?: any;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

function ScaleInView({
  delay = 0,
  duration = 600,
  style,
  children,
}: {
  delay?: number;
  duration?: number;
  style?: any;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: duration * 0.5,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}

function PulseView({ style, children }: { style?: any; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}

export default function WorkoutCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{
    xp?: string | string[];
    exercises?: string | string[];
    duration?: string | string[];
    totalSets?: string | string[];
    totalReps?: string | string[];
    newPRs?: string | string[];
    templateName?: string | string[];
  }>();

  const xp = parseRouteInt(params.xp, 0);
  const exercises = parseRouteInt(params.exercises, 0);
  const duration = parseRouteInt(params.duration, 0);
  const totalSets = parseRouteInt(params.totalSets, 0);
  const totalReps = parseRouteInt(params.totalReps, 0);
  const newPRs: string[] = parseNewPRsParam(params.newPRs);
  const templateName = firstParam(params.templateName)?.trim() || 'Workout';

  const [displayXp, setDisplayXp] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(xp) || xp <= 0) {
      setDisplayXp(Math.max(0, xp));
      return;
    }
    let interval: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      const step = Math.max(1, Math.ceil(xp / 60));
      let current = 0;
      interval = setInterval(() => {
        current = Math.min(current + step, xp);
        setDisplayXp(current);
        if (current >= xp && interval) clearInterval(interval);
      }, 25);
    }, 800);
    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [xp]);

  const handleDone = () => {
    router.replace('/(tabs)/track');
  };

  const DURATION = 500;

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={['#0A0F1A', '#0D1117', '#111827']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Trophy with glow */}
        <ScaleInView delay={100} style={s.trophyWrapper}>
          <PulseView style={s.trophyGlowOuter}>
            <View style={s.trophyGlowInner}>
              <View style={s.trophyCircle}>
                <Trophy color="#FFB547" size={48} />
              </View>
            </View>
          </PulseView>
        </ScaleInView>

        {/* Title */}
        <FadeInView delay={300} duration={DURATION}>
          <Text style={s.title}>Workout Complete!</Text>
        </FadeInView>

        <FadeInView delay={450} duration={DURATION}>
          <Text style={s.subtitle}>{templateName}</Text>
        </FadeInView>

        {/* XP earned - hero stat */}
        <FadeInView delay={600} duration={DURATION} style={s.xpContainer}>
          <LinearGradient
            colors={['rgba(255,181,71,0.12)', 'rgba(255,181,71,0.04)']}
            style={s.xpCard}
          >
            <Zap color="#FFB547" size={28} />
            <Text style={s.xpAmount}>+{displayXp}</Text>
            <Text style={s.xpLabel}>XP EARNED</Text>
          </LinearGradient>
        </FadeInView>

        {/* Stats grid */}
        <FadeInView delay={800} duration={DURATION} style={s.statsRow}>
          <View style={s.statCard}>
            <View style={[s.statIconCircle, { backgroundColor: 'rgba(76,145,255,0.12)' }]}>
              <Dumbbell color="#4C91FF" size={20} />
            </View>
            <Text style={s.statValue}>{exercises}</Text>
            <Text style={s.statLabel}>Exercises</Text>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIconCircle, { backgroundColor: 'rgba(81,207,102,0.12)' }]}>
              <Timer color="#51CF66" size={20} />
            </View>
            <Text style={s.statValue}>{duration}</Text>
            <Text style={s.statLabel}>Minutes</Text>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIconCircle, { backgroundColor: 'rgba(255,107,107,0.12)' }]}>
              <Flame color="#FF6B6B" size={20} />
            </View>
            <Text style={s.statValue}>{totalSets}</Text>
            <Text style={s.statLabel}>Sets</Text>
          </View>
        </FadeInView>

        {/* Total reps */}
        <FadeInView delay={950} duration={DURATION} style={s.totalRepsWrapper}>
          <View style={s.totalRepsCard}>
            <View style={[s.statIconCircle, { backgroundColor: 'rgba(132,94,247,0.12)' }]}>
              <TrendingUp color="#845EF7" size={20} />
            </View>
            <View>
              <Text style={s.totalRepsValue}>{totalReps}</Text>
              <Text style={s.totalRepsLabel}>Total Reps</Text>
            </View>
          </View>
        </FadeInView>

        {/* New PRs */}
        {newPRs.length > 0 && (
          <FadeInView delay={1100} duration={DURATION} style={s.prSection}>
            <LinearGradient
              colors={['rgba(255,181,71,0.1)', 'rgba(255,181,71,0.03)']}
              style={s.prCard}
            >
              <View style={s.prHeader}>
                <Crown color="#FFB547" size={20} />
                <Text style={s.prTitle}>New Personal Records</Text>
              </View>
              {newPRs.map((name, idx) => (
                <FadeInView
                  key={name}
                  delay={1200 + idx * 100}
                  duration={400}
                  style={s.prItemRow}
                >
                  <View style={s.prDot} />
                  <Text style={s.prItemText}>{name}</Text>
                </FadeInView>
              ))}
            </LinearGradient>
          </FadeInView>
        )}

        {/* Streak */}
        {profile &&
          Number.isFinite(profile.current_streak) &&
          profile.current_streak > 0 && (
          <FadeInView delay={1300} duration={DURATION}>
            <View style={s.streakPill}>
              <Flame color="#FF922B" size={18} />
              <Text style={s.streakText}>
                {profile.current_streak} day streak
              </Text>
            </View>
          </FadeInView>
        )}

        {/* Spacer before button */}
        <View style={{ height: 32 }} />

        {/* Done button */}
        <FadeInView delay={1500} duration={DURATION} style={s.doneWrapper}>
          <TouchableOpacity
            style={s.doneButton}
            onPress={handleDone}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#4C91FF', '#3B7AE8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.doneGradient}
            >
              <Text style={s.doneText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </FadeInView>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0F1A',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },

  trophyWrapper: {
    marginBottom: 24,
  },
  trophyGlowOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,181,71,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyGlowInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,181,71,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,181,71,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,181,71,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 28,
    textAlign: 'center',
  },

  xpContainer: {
    width: '100%',
    marginBottom: 24,
  },
  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,181,71,0.15)',
  },
  xpAmount: {
    color: '#FFB547',
    fontSize: 42,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  xpLabel: {
    color: 'rgba(255,181,71,0.7)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  totalRepsWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  totalRepsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  totalRepsValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  totalRepsLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  prSection: {
    width: '100%',
    marginBottom: 16,
  },
  prCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,181,71,0.15)',
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  prTitle: {
    color: '#FFB547',
    fontSize: 15,
    fontWeight: '700',
  },
  prItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  prDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFB547',
  },
  prItemText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },

  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,146,43,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,146,43,0.15)',
  },
  streakText: {
    color: '#FF922B',
    fontSize: 15,
    fontWeight: '600',
  },

  doneWrapper: {
    width: '100%',
  },
  doneButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  doneGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 16,
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
