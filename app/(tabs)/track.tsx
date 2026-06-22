import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Linking,
  Pressable,
  Animated,
  Easing as RNEasing,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { usePremiumGate } from '@/contexts/PremiumGateContext';
import { useCloseModalsWhenPaywallOpens, usePaywall } from '@/contexts/PaywallContext';
import {
  PLACEMENT_AI_PERSONALIZED_WORKOUT,
  PLACEMENT_CUSTOM_TEMPLATE,
} from '@/lib/placements';
import { useSession } from '@/contexts/SessionContext';
import { WorkoutRestTimerBar } from '@/components/WorkoutRestTimerBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { AchievementUnlockedModal } from '@/components/AchievementUnlockedModal';
import {
  apiGetTemplates,
  apiDeleteTemplate,
  apiCreateWorkout,
  apiGetWorkouts,
  apiCheckPR,
  apiGetPersonalRecords,
  apiGetTemplateLibrary,
  apiCopyLibraryTemplate,
} from '@/lib/api';
import { queueChallengeCelebrations } from '@/lib/challengeCelebrationStorage';
import {
  Plus,
  X,
  Play,
  Check,
  CheckCircle,
  Trophy,
  Timer,
  Dumbbell,
  Trash2,
  Edit3,
  ChevronLeft,
  Zap,
  Crown,
  Star,
  Search,
  Sparkles,
  List,
  Eye,
  ExternalLink,
} from 'lucide-react-native';
// Simple staggered fade-in component to replace reanimated entering animations
function FadeInView({ delay = 0, duration = 500, style, children }: {
  delay?: number;
  duration?: number;
  style?: any;
  children: React.ReactNode;
}) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(12)).current;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          easing: RNEasing.bezier(0.25, 0.1, 0.25, 1.0),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          easing: RNEasing.bezier(0.25, 0.1, 0.25, 1.0),
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────
interface TemplateExercise {
  id?: string;
  name: string;
  default_sets: number;
  default_reps: number;
  order: number;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  color: string;
  icon: string;
  exercises: TemplateExercise[];
  exercise_count: number;
}

interface WorkoutLibraryTemplate {
  id: string;
  name: string;
  category: string;
  subtitle: string;
  source_name: string;
  source_url: string;
  color: string;
  icon: string;
  exercises: TemplateExercise[];
  exercise_count: number;
}

interface SessionExercise {
  name: string;
  targetSets: number;
  targetReps: number;
  weight: string;
  prReps: string;
  completed: boolean;
  isNewPR: boolean;
}

interface PersonalRecord {
  weight: number;
  reps: number;
}

type Screen = 'templates' | 'session' | 'achievements';
type TemplateTab = 'my_workouts' | 'library';

export default function TrackScreen() {
  const { profile, refreshProfile } = useAuth();
  const { registerGated } = usePremiumGate();
  const showPaywall = usePaywall();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Navigation
  const [screen, setScreen] = useState<Screen>('templates');

  // Templates
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [libraryTemplates, setLibraryTemplates] = useState<WorkoutLibraryTemplate[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [loadingMoreLibrary, setLoadingMoreLibrary] = useState(false);
  const [copyingLibraryId, setCopyingLibraryId] = useState<string | null>(null);
  const [libraryPreview, setLibraryPreview] = useState<WorkoutLibraryTemplate | null>(null);
  const [activeTemplateTab, setActiveTemplateTab] = useState<TemplateTab>('my_workouts');
  const [libraryCategory, setLibraryCategory] = useState<string>('all');
  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySearchInput, setLibrarySearchInput] = useState('');
  const [libraryHasMore, setLibraryHasMore] = useState(false);
  const [libraryNextOffset, setLibraryNextOffset] = useState(0);
  const LIBRARY_PAGE_SIZE = 12;

  // Session context (global, persisted)
  const session = useSession();

  // Active session (local UI state derived from global context)
  const [activeTemplate, setActiveTemplate] = useState<WorkoutTemplate | null>(null);
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
  const [prs, setPrs] = useState<Record<string, PersonalRecord>>({});
  const [showSetPrModal, setShowSetPrModal] = useState(false);
  const [activePrExerciseIdx, setActivePrExerciseIdx] = useState<number | null>(null);
  const [prModalWeight, setPrModalWeight] = useState('');
  const [prModalReps, setPrModalReps] = useState('');
  /** Bumps when an exercise is newly checked off — drives optional rest timer auto-start */
  const [restExerciseTick, setRestExerciseTick] = useState(0);

  // Exit session modal
  const [showExitModal, setShowExitModal] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<WorkoutTemplate | null>(null);

  // Create workout: manual vs AI path
  const [showCreateChoiceModal, setShowCreateChoiceModal] = useState(false);

  // Completion
  const [completionData, setCompletionData] = useState<{
    xp: number;
    exercises: number;
    duration: number;
    newPRs: string[];
    totalSets: number;
    totalReps: number;
  } | null>(null);

  const [earnedBadges, setEarnedBadges] = useState<
    { id: string; name: string; description: string; icon: string; xp_reward: number }[]
  >([]);

  const closeAllTrackModals = useCallback(() => {
    setLibraryPreview(null);
    setShowCreateChoiceModal(false);
    setDeleteTarget(null);
    setShowExitModal(false);
    setShowSetPrModal(false);
    setEarnedBadges([]);
  }, []);

  useCloseModalsWhenPaywallOpens(closeAllTrackModals);

  // Use elapsed from session context (persisted timer)
  const elapsed = session.elapsed;

  // Restore session state if we navigate back to Track with an active session
  useEffect(() => {
    if (session.isActive && screen !== 'session' && screen !== 'achievements') {
      // Reconstruct activeTemplate from the session context
      setActiveTemplate({
        id: session.templateId!,
        name: session.templateName!,
        color: session.templateColor!,
        icon: 'dumbbell',
        exercises: [],
        exercise_count: session.exercises.length,
      });
      setSessionExercises(
        session.exercises.map((ex) => ({
          ...ex,
          prReps: ex.prReps || String(ex.targetReps || 1),
        }))
      );
      setScreen('session');
    }
  }, [session.isActive]);

  // Reload templates every time the tab is focused (e.g. after copying from Groups)
  useFocusEffect(
    useCallback(() => {
      loadTemplates();
      loadLibraryTemplates(true);
      loadPRs();
    }, [])
  );

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data } = await apiGetTemplates();
      if (data) setTemplates(data);
    } catch (e) {
      console.error('Error loading templates:', e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadPRs = async () => {
    try {
      const { data } = await apiGetPersonalRecords();
      if (data) {
        const map: Record<string, PersonalRecord> = {};
        data.forEach((pr: any) => {
          const weight = parseFloat(pr.weight);
          const reps = parseInt(pr.reps, 10);
          map[pr.exercise_name] = {
            weight: Number.isFinite(weight) ? weight : 0,
            reps: Number.isFinite(reps) && reps > 0 ? reps : 1,
          };
        });
        setPrs(map);
      }
    } catch (e) {
      console.error('Error loading PRs:', e);
    }
  };

  const loadLibraryTemplates = async (reset = false) => {
    if (reset) {
      setLoadingLibrary(true);
    } else {
      if (!libraryHasMore || loadingMoreLibrary || loadingLibrary) return;
      setLoadingMoreLibrary(true);
    }
    try {
      const offset = reset ? 0 : libraryNextOffset;
      const { data } = await apiGetTemplateLibrary({
        category: libraryCategory === 'all' ? undefined : libraryCategory,
        q: librarySearch || undefined,
        limit: LIBRARY_PAGE_SIZE,
        offset,
      });
      if (data) {
        setLibraryTemplates((prev) => (reset ? data.results : [...prev, ...data.results]));
        setLibraryHasMore(data.has_more);
        setLibraryNextOffset(data.next_offset);
      } else if (reset) {
        setLibraryTemplates([]);
        setLibraryHasMore(false);
        setLibraryNextOffset(0);
      }
    } catch (e) {
      console.error('Error loading workout library:', e);
    } finally {
      if (reset) setLoadingLibrary(false);
      else setLoadingMoreLibrary(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLibrarySearch(librarySearchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [librarySearchInput]);

  useEffect(() => {
    if (activeTemplateTab === 'library') {
      void loadLibraryTemplates(true);
    }
  }, [activeTemplateTab, libraryCategory, librarySearch]);

  // ─── Format time ──────────────────────────────────
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatPRDisplay = (pr: PersonalRecord) => {
    const repLabel = pr.reps === 1 ? 'rep' : 'reps';
    return `${pr.weight} lbs x ${pr.reps} ${repLabel}`;
  };

  // ─── Template CRUD ────────────────────────────────
  const enterManualCreateWizard = () => {
    router.push('/create-workout');
  };

  const openCreateTemplate = () => {
    if (profile?.is_pro || templates.length === 0) {
      enterManualCreateWizard();
      return;
    }
    void registerGated(PLACEMENT_CUSTOM_TEMPLATE, enterManualCreateWizard);
  };

  const openCreateWorkoutChooser = () => {
    setShowCreateChoiceModal(true);
  };

  const chooseManualCreate = () => {
    setShowCreateChoiceModal(false);
    openCreateTemplate();
  };

  const startAiPersonalizedFlow = () => {
    setShowCreateChoiceModal(false);
    router.push({ pathname: '/create-workout', params: { mode: 'ai' } });
  };

  const openAiPersonalizedWorkout = () => {
    setShowCreateChoiceModal(false);
    void registerGated(PLACEMENT_AI_PERSONALIZED_WORKOUT, startAiPersonalizedFlow);
  };

  const openEditTemplate = (t: WorkoutTemplate) => {
    router.push({ pathname: '/create-workout', params: { templateId: String(t.id) } });
  };

  const deleteTemplate = (t: WorkoutTemplate) => {
    setDeleteTarget(t);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDeleteTemplate(deleteTarget.id);
      await loadTemplates();
    } catch {
      Alert.alert('Error', 'Failed to delete workout');
    } finally {
      setDeleteTarget(null);
    }
  };

  const copyLibraryWorkout = async (libraryTemplateId: string): Promise<boolean> => {
    setCopyingLibraryId(libraryTemplateId);
    try {
      const { error } = await apiCopyLibraryTemplate(libraryTemplateId);
      if (error) {
        if (error?.code === 'template_limit') {
          showPaywall(() => void copyLibraryWorkout(libraryTemplateId));
          return false;
        }
        Alert.alert('Error', 'Could not copy this workout right now.');
        return false;
      }
      await loadTemplates();
      Alert.alert('Added', 'Workout added to your workouts.');
      return true;
    } catch {
      Alert.alert('Error', 'Could not copy this workout right now.');
      return false;
    } finally {
      setCopyingLibraryId(null);
    }
  };

  const handleLibraryScroll = ({
    nativeEvent,
  }: {
    nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } };
  }) => {
    if (activeTemplateTab !== 'library') return;
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    if (distanceFromBottom < 220) {
      void loadLibraryTemplates(false);
    }
  };

  // ─── Session ──────────────────────────────────────
  const beginSession = async (template: WorkoutTemplate) => {
    const exercises = template.exercises.map((e) => ({
      name: e.name,
      targetSets: e.default_sets,
      targetReps: e.default_reps,
      weight: '',
      prReps: String(e.default_reps),
      completed: false,
      isNewPR: false,
    }));
    setActiveTemplate(template);
    setSessionExercises(exercises);
    setRestExerciseTick(0);
    setScreen('session');

    // Persist to global context (survives background/tab switching)
    await session.startSession({
      templateId: template.id,
      templateName: template.name,
      templateColor: template.color,
      exercises,
    });
  };

  const checkAndSavePR = async (
    exercises: SessionExercise[],
    idx: number,
  ): Promise<SessionExercise[]> => {
    const updated = [...exercises];
    const ex = updated[idx];
    if (!ex.weight) return updated;
    const w = parseFloat(ex.weight);
    if (!(w > 0)) return updated;

    const reps = parseInt(ex.prReps, 10) || ex.targetReps || 1;
    try {
      const { data } = await apiCheckPR(ex.name, w, reps);
      if (data?.is_new_pr) {
        updated[idx] = { ...ex, isNewPR: true };
        setPrs((prev) => ({ ...prev, [ex.name]: { weight: w, reps } }));
      }
    } catch {
      // network issue — will still try on finish
    }
    return updated;
  };

  const toggleExercise = async (idx: number) => {
    let updated = [...sessionExercises];
    const wasComplete = updated[idx].completed;
    updated[idx] = { ...updated[idx], completed: !updated[idx].completed };

    // Check for PR when marking as complete
    if (updated[idx].completed && updated[idx].weight) {
      updated = await checkAndSavePR(updated, idx);
    }

    if (!wasComplete && updated[idx].completed) {
      setRestExerciseTick((t) => t + 1);
    }

    setSessionExercises(updated);
    session.updateExercises(updated);
  };

  const openSetPrModal = (idx: number) => {
    const ex = sessionExercises[idx];
    setActivePrExerciseIdx(idx);
    setPrModalWeight(ex.weight);
    setPrModalReps(ex.prReps || String(ex.targetReps));
    setShowSetPrModal(true);
  };

  const saveSetPrModal = () => {
    if (activePrExerciseIdx == null) return;
    const sanitizedWeight = prModalWeight.replace(/[^0-9.]/g, '');
    const sanitizedReps = prModalReps.replace(/[^0-9]/g, '');
    const updated = [...sessionExercises];
    updated[activePrExerciseIdx] = {
      ...updated[activePrExerciseIdx],
      weight: sanitizedWeight,
      prReps: sanitizedReps || '1',
    };
    setSessionExercises(updated);
    session.updateExercises(updated);
    setShowSetPrModal(false);
    setActivePrExerciseIdx(null);
  };

  const finishSession = async () => {
    const completedExercises = sessionExercises.filter((e) => e.completed);
    if (completedExercises.length === 0) {
      Alert.alert('No exercises completed', 'Complete at least one exercise before finishing.');
      return;
    }

    try {
      // Save PRs for all completed exercises that have a weight entered
      const prPromises = completedExercises
        .filter((e) => e.weight && parseFloat(e.weight) > 0)
        .map((e) =>
          apiCheckPR(e.name, parseFloat(e.weight), parseInt(e.prReps, 10) || e.targetReps || 1).catch(() => null)
        );
      const prResults = await Promise.all(prPromises);

      // Collect names of new PRs (including ones detected during session)
      const prNamesFromFinish = new Set<string>();
      completedExercises
        .filter((e) => e.weight && parseFloat(e.weight) > 0)
        .forEach((e, i) => {
          const result = prResults[i];
          if (result?.data?.is_new_pr) {
            prNamesFromFinish.add(e.name);
          }
        });

      // Merge with PRs already detected during the session
      completedExercises.forEach((e) => {
        if (e.isNewPR) prNamesFromFinish.add(e.name);
      });

      const totalSets = completedExercises.reduce((s, e) => s + e.targetSets, 0);
      const totalReps = completedExercises.reduce((s, e) => s + e.targetSets * e.targetReps, 0);
      const durationMin = Math.max(1, Math.floor(elapsed / 60));
      const xp = Math.floor(totalSets * 5 + totalReps * 0.5 + durationMin * 2);
      const calories = Math.floor(totalSets * 15 + durationMin * 3);
      const newPRs = Array.from(prNamesFromFinish);

      const exercises = completedExercises.map((e) => ({
        name: e.name,
        sets: e.targetSets,
        reps: e.targetReps,
        weight: e.weight ? parseFloat(e.weight) : undefined,
        is_new_pr: prNamesFromFinish.has(e.name),
      }));

      const { data: workoutResult } = await apiCreateWorkout({
        workout_date: new Date().toISOString().split('T')[0],
        exercises,
        total_sets: totalSets,
        total_reps: totalReps,
        duration_minutes: durationMin,
        calories_burned: calories,
        xp_earned: xp,
        notes: activeTemplate?.name || '',
      });

      const nc = workoutResult?.newly_completed_challenges ?? [];
      if (nc.length > 0) {
        await queueChallengeCelebrations(nc);
      }

      const newBadges = workoutResult?.newly_earned_badges ?? [];
      if (newBadges.length > 0) {
        setEarnedBadges(newBadges);
      }

      setCompletionData({
        xp,
        exercises: completedExercises.length,
        duration: durationMin,
        newPRs,
        totalSets,
        totalReps,
      });

      // End the global session (clears storage/banner)
      await session.endSession();

      const navData = {
        xp,
        exercises: completedExercises.length,
        duration: durationMin,
        totalSets,
        totalReps,
        newPRs,
        templateName: activeTemplate?.name || 'Workout',
      };

      if (newBadges.length > 0) {
        setScreen('achievements');
      } else {
        navigateToCompletion(navData);
      }

      await refreshProfile();
      // Reload PRs so they're up-to-date for the next session
      await loadPRs();
    } catch (e) {
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  const navigateToCompletion = (data?: {
    xp: number;
    exercises: number;
    duration: number;
    totalSets: number;
    totalReps: number;
    newPRs: string[];
    templateName: string;
  }) => {
    const d = data || (completionData ? { ...completionData, templateName: activeTemplate?.name || 'Workout' } : null);
    if (!d) return;
    const params: Record<string, string> = {
      xp: String(d.xp),
      exercises: String(d.exercises),
      duration: String(d.duration),
      totalSets: String(d.totalSets),
      totalReps: String(d.totalReps),
      templateName: d.templateName,
    };
    if (d.newPRs.length > 0) {
      params.newPRs = JSON.stringify(d.newPRs);
    }
    setCompletionData(null);
    setEarnedBadges([]);
    setActiveTemplate(null);
    setSessionExercises([]);
    setScreen('templates');
    router.push({ pathname: '/workout-complete', params });
  };

  const onAchievementsDismissed = () => {
    setEarnedBadges([]);
    navigateToCompletion();
  };

  // ─── Animated styles (no longer using spring) ─────

  // ─── Loading / Auth guard ─────────────────────────
  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }


  // ═══════════════════════════════════════════════════
  //  SCREEN: ACTIVE SESSION
  // ═══════════════════════════════════════════════════
  if (screen === 'session' && activeTemplate) {
    const completedCount = sessionExercises.filter((e) => e.completed).length;
    const progress = sessionExercises.length > 0
      ? completedCount / sessionExercises.length
      : 0;

    return (
      <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
        <View style={styles.sessionLayoutRoot}>
          {/* Session Header */}
          <View style={styles.sessionHeader}>
            <View style={styles.sessionHeaderTop}>
              <TouchableOpacity onPress={() => setShowExitModal(true)}>
                <X color="#999999" size={24} />
              </TouchableOpacity>
              <View style={styles.timerContainer}>
                <Timer color="#4C91FF" size={18} />
                <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
              </View>
            </View>

            <Text style={[styles.sessionName, { color: activeTemplate.color }]}>
              {activeTemplate.name}
            </Text>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor: activeTemplate.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {completedCount} of {sessionExercises.length} exercises
            </Text>
          </View>

          {/* Exercise list — scrolls above the fixed bottom dock (no overlap) */}
          <ScrollView
            style={styles.sessionScrollView}
            contentContainerStyle={styles.sessionScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {sessionExercises.map((ex, idx) => {
            const currentPR = prs[ex.name];
            const enteredWeight = ex.weight ? parseFloat(ex.weight) : 0;
            const wouldBePR = currentPR != null && enteredWeight > currentPR.weight;
            const enteredReps = parseInt(ex.prReps, 10) || ex.targetReps || 1;

            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() => toggleExercise(idx)}
                style={[
                  styles.sessionExCard,
                  ex.completed && styles.sessionExCompleted,
                ]}
              >
                {/* Left: check circle */}
                <View style={styles.sessionExLeft}>
                  <View
                    style={[
                      styles.checkCircle,
                      ex.completed && {
                        backgroundColor: activeTemplate.color,
                        borderColor: activeTemplate.color,
                      },
                    ]}
                  >
                    {ex.completed && <Check color="#FFFFFF" size={16} />}
              </View>
                </View>

                {/* Middle: info */}
                <View style={styles.sessionExMid}>
                  <View style={styles.sessionExNameRow}>
                    <Text
                      style={[
                        styles.sessionExName,
                        ex.completed && styles.sessionExNameDone,
                      ]}
                    >
                      {ex.name}
                    </Text>
                    {ex.isNewPR && (
                      <View style={styles.prBadge}>
                        <Crown color="#FFB547" size={12} />
                        <Text style={styles.prBadgeText}>NEW PR!</Text>
              </View>
                    )}
                  </View>
                  <Text style={styles.sessionExMeta}>
                    {ex.targetSets} sets × {ex.targetReps} reps
                  </Text>
                  <View style={styles.currentPrRow}>
                    <Trophy color={currentPR ? '#FFB547' : '#444'} size={12} />
                    <Text style={[styles.currentPrText, currentPR != null && styles.currentPrTextActive]}>
                      {currentPR ? `PR: ${formatPRDisplay(currentPR)}` : 'No PR yet'}
                    </Text>
              </View>
            </View>

                {/* Right: set PR action */}
                <View style={styles.sessionExRight}>
                  <TouchableOpacity
                    style={[
                      styles.setPrButton,
                      (ex.weight || wouldBePR) && styles.setPrButtonActive,
                      wouldBePR && styles.setPrButtonPR,
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      openSetPrModal(idx);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.setPrButtonText}>
                      {ex.weight ? `${ex.weight} x ${enteredReps}` : 'Set PR'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.weightInputLabel}>Weight x Reps</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          </ScrollView>

          {/* Fixed dock: rest timer + finish — not stacked over exercise cards */}
          <View
            style={[styles.sessionBottomDock, { paddingBottom: 10 + insets.bottom }]}
          >
            <WorkoutRestTimerBar
              accentColor={activeTemplate.color}
              completedExerciseTick={restExerciseTick}
            />
            <TouchableOpacity
              style={[
                styles.finishButton,
                { backgroundColor: activeTemplate.color },
                completedCount === 0 && { opacity: 0.4 },
              ]}
              onPress={finishSession}
              disabled={completedCount === 0}
              activeOpacity={0.9}
            >
              <Check color="#FFFFFF" size={22} />
              <Text style={styles.finishButtonText}>Finish Workout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={showSetPrModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSetPrModal(false)}
        >
          <Pressable style={styles.deleteModalOverlay} onPress={() => setShowSetPrModal(false)}>
            <Pressable style={styles.prModalBox} onPress={() => null}>
              <Text style={styles.prModalTitle}>Set Personal Record</Text>
              <Text style={styles.prModalSubtitle}>Log your best lift as weight x reps</Text>
              <View style={styles.wizardPRInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wizardPRInputLabel}>Weight (lbs)</Text>
                  <TextInput
                    style={styles.wizardPRInput}
                    placeholder="145"
                    placeholderTextColor="#555"
                    value={prModalWeight}
                    onChangeText={setPrModalWeight}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wizardPRInputLabel}>Reps</Text>
                  <TextInput
                    style={styles.wizardPRInput}
                    placeholder="1"
                    placeholderTextColor="#555"
                    value={prModalReps}
                    onChangeText={setPrModalReps}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.prModalButtons}>
                <TouchableOpacity
                  style={styles.deleteModalCancel}
                  onPress={() => setShowSetPrModal(false)}
                >
                  <Text style={styles.deleteModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.prModalSaveButton}
                  onPress={saveSetPrModal}
                >
                  <Text style={styles.deleteModalConfirmText}>Save PR</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Exit Session Modal */}
        <Modal
          visible={showExitModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowExitModal(false)}
        >
          <View style={styles.deleteModalOverlay}>
            <View style={styles.deleteModalBox}>
              <Text style={styles.deleteModalTitle}>End Workout?</Text>
              <Text style={styles.deleteModalMsg}>
                Are you sure you want to end your workout session? Your progress will be lost.
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={styles.deleteModalCancel}
                  onPress={() => setShowExitModal(false)}
                >
                  <Text style={styles.deleteModalCancelText}>Keep Going</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteModalConfirm}
                  onPress={async () => {
                    setShowExitModal(false);
                    await session.endSession();
                    setScreen('templates');
                  }}
                >
                  <Text style={styles.deleteModalConfirmText}>End Workout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    );
  }

  // ═══════════════════════════════════════════════════
  //  SCREEN: ACHIEVEMENTS (before completion)
  // ═══════════════════════════════════════════════════
  if (screen === 'achievements' && earnedBadges.length > 0) {
    return (
      <View style={[styles.container, { backgroundColor: '#0D0D0D' }]}>
        <AchievementUnlockedModal
          badges={earnedBadges}
          onDismiss={onAchievementsDismissed}
        />
      </View>
    );
  }

  // ═══════════════════════════════════════════════════
  //  SCREEN: TEMPLATE LIST (default)
  // ═══════════════════════════════════════════════════
  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleLibraryScroll}
        scrollEventThrottle={120}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.title, { flex: 1 }]} numberOfLines={1}>
              Track
            </Text>
            <TouchableOpacity
              style={styles.historyHeaderBtn}
              onPress={() => router.push('/workout-history')}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="View all logged workouts"
            >
              <List color="#4C91FF" size={20} />
              <Text style={styles.historyHeaderBtnText}>History</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            {activeTemplateTab === 'my_workouts'
              ? templates.length > 0
                ? 'Your saved workouts'
                : 'Create your first workout'
              : 'Explore the premade workout library'}
          </Text>
        </View>

        <View style={styles.tabSwitchWrap}>
          <TouchableOpacity
            style={[
              styles.tabSwitchBtn,
              activeTemplateTab === 'my_workouts' && styles.tabSwitchBtnActive,
            ]}
            onPress={() => setActiveTemplateTab('my_workouts')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabSwitchText,
                activeTemplateTab === 'my_workouts' && styles.tabSwitchTextActive,
              ]}
            >
              My Workouts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabSwitchBtn,
              activeTemplateTab === 'library' && styles.tabSwitchBtnActive,
            ]}
            onPress={() => setActiveTemplateTab('library')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabSwitchText,
                activeTemplateTab === 'library' && styles.tabSwitchTextActive,
              ]}
            >
              Library
            </Text>
          </TouchableOpacity>
        </View>

        {activeTemplateTab === 'my_workouts' ? (
          <>
            {templates.map((t) => (
              <Card key={t.id} style={styles.templateCard}>
                <View style={styles.templateRow}>
                  <View
                    style={[
                      styles.templateIcon,
                      { backgroundColor: t.color + '20' },
                    ]}
                  >
                    <Dumbbell color={t.color} size={24} />
                  </View>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>{t.name}</Text>
                    <Text style={styles.templateMeta}>
                      {t.exercise_count} exercise{t.exercise_count !== 1 ? 's' : ''}
                    </Text>
                    {t.exercises.length > 0 && (
                      <Text style={styles.templateExerciseList} numberOfLines={1}>
                        {t.exercises.map((e) => e.name).join(' · ')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.templateActions}>
                    <TouchableOpacity
                      onPress={() => openEditTemplate(t)}
                      style={styles.templateActionBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Edit3 color="#666" size={16} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteTemplate(t)}
                      style={styles.templateActionBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 color="#FF4C4C" size={16} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.startButton, { backgroundColor: t.color }]}
                  onPress={() => beginSession(t)}
                  activeOpacity={0.8}
                >
                  <Play color="#FFFFFF" size={16} fill="#FFFFFF" />
                  <Text style={styles.startButtonText}>Start Workout</Text>
                </TouchableOpacity>
              </Card>
            ))}

            <TouchableOpacity onPress={openCreateWorkoutChooser}>
              <Card style={styles.addTemplateCard}>
                <Plus color="#4C91FF" size={28} />
                <Text style={styles.addTemplateText}>Create New Workout</Text>
              </Card>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.librarySearchWrap}>
              <Search color="#7A7A7A" size={16} />
              <TextInput
                style={styles.librarySearchInput}
                placeholder="Search workouts, creators, styles..."
                placeholderTextColor="#666"
                value={librarySearchInput}
                onChangeText={setLibrarySearchInput}
              />
              {librarySearchInput.length > 0 && (
                <TouchableOpacity onPress={() => setLibrarySearchInput('')}>
                  <X color="#777" size={16} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.libraryFilterRow}
            >
              {[
                { key: 'all', label: 'All' },
                { key: 'influencer', label: 'Influencer' },
                { key: 'technical', label: 'Technical' },
                { key: 'strength', label: 'Strength' },
                { key: 'hypertrophy', label: 'Hypertrophy' },
                { key: 'conditioning', label: 'Conditioning' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.libraryFilterPill,
                    libraryCategory === item.key && styles.libraryFilterPillActive,
                  ]}
                  onPress={() => setLibraryCategory(item.key)}
                >
                  <Text
                    style={[
                      styles.libraryFilterText,
                      libraryCategory === item.key && styles.libraryFilterTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loadingLibrary ? (
              <Card style={styles.libraryEmptyCard}>
                <Text style={styles.libraryEmptyText}>Loading library workouts...</Text>
              </Card>
            ) : libraryTemplates.length === 0 ? (
              <Card style={styles.libraryEmptyCard}>
                <Text style={styles.libraryEmptyText}>No workouts in this category yet.</Text>
              </Card>
            ) : (
              libraryTemplates.map((t) => (
                <Card key={t.id} style={styles.libraryCard}>
                  <View style={styles.templateRow}>
                    <View
                      style={[
                        styles.templateIcon,
                        { backgroundColor: t.color + '20' },
                      ]}
                    >
                      <Dumbbell color={t.color} size={22} />
                    </View>
                    <View style={styles.templateInfo}>
                      <Text style={styles.templateName}>{t.name}</Text>
                      <Text style={styles.templateMeta}>
                        {t.category.toUpperCase()} {t.source_name ? `· ${t.source_name}` : ''}
                      </Text>
                      {!!t.subtitle && (
                        <Text style={styles.templateExerciseList} numberOfLines={1}>
                          {t.subtitle}
                        </Text>
                      )}
                      <Text style={styles.templateExerciseList} numberOfLines={1}>
                        {t.exercises.map((e) => e.name).join(' · ')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.libraryCardActions}>
                    <TouchableOpacity
                      style={[styles.libraryViewButton, { borderColor: `${t.color}AA` }]}
                      onPress={() => setLibraryPreview(t)}
                      activeOpacity={0.85}
                    >
                      <Eye color={t.color} size={16} style={styles.libraryActionIcon} />
                      <Text
                        style={[styles.libraryViewButtonText, { color: t.color }]}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.82}
                      >
                        View workout
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.libraryAddButton, { backgroundColor: t.color }]}
                      onPress={() => copyLibraryWorkout(t.id)}
                      activeOpacity={0.85}
                      disabled={copyingLibraryId === t.id}
                    >
                      <Plus color="#FFFFFF" size={16} style={styles.libraryActionIcon} />
                      <Text
                        style={styles.copyButtonText}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                      >
                        {copyingLibraryId === t.id ? 'Adding...' : 'Add to My Workouts'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))
            )}
            {loadingMoreLibrary && (
              <Text style={styles.libraryLoadingMoreText}>Loading more workouts...</Text>
            )}
            {!loadingMoreLibrary && !libraryHasMore && libraryTemplates.length > 0 && (
              <Text style={styles.libraryLoadingMoreText}>You reached the end</Text>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={showCreateChoiceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateChoiceModal(false)}
      >
        <Pressable
          style={styles.deleteModalOverlay}
          onPress={() => setShowCreateChoiceModal(false)}
        >
          <Pressable style={styles.createChoiceBox} onPress={() => null}>
            <Text style={styles.createChoiceTitle}>Create workout</Text>
            <Text style={styles.createChoiceSubtitle}>
              Start from scratch or let us draft a session from your habits.
            </Text>

            <TouchableOpacity
              style={styles.createChoicePrimary}
              onPress={chooseManualCreate}
              activeOpacity={0.88}
            >
              <Plus color="#FFFFFF" size={20} />
              <Text style={styles.createChoicePrimaryText}>Build from scratch</Text>
            </TouchableOpacity>

            <Text style={styles.createChoiceOr}>OR</Text>

            <TouchableOpacity
              style={styles.createChoiceAi}
              onPress={openAiPersonalizedWorkout}
              activeOpacity={0.88}
            >
              <Sparkles color="#C4B5FD" size={20} />
              <View style={styles.createChoiceAiTextCol}>
                <Text style={styles.createChoiceAiTitle}>Personalized with AI</Text>
                <Text style={styles.createChoiceAiSub}>
                  Short quiz → custom exercises & volume
                </Text>
              </View>
              {!profile?.is_pro ? (
                <View style={styles.createChoiceProPill}>
                  <Crown color="#FFB547" size={12} />
                  <Text style={styles.createChoiceProPillText}>Pro</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createChoiceDismiss}
              onPress={() => setShowCreateChoiceModal(false)}
            >
              <Text style={styles.createChoiceDismissText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Library workout preview */}
      <Modal
        visible={!!libraryPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setLibraryPreview(null)}
      >
        <Pressable style={styles.deleteModalOverlay} onPress={() => setLibraryPreview(null)}>
          <Pressable
            style={[styles.libraryPreviewBox, { maxHeight: SCREEN_HEIGHT * 0.78 }]}
            onPress={() => null}
          >
            {libraryPreview && (
              <>
                <View style={styles.libraryPreviewHeader}>
                  <View
                    style={[
                      styles.templateIcon,
                      { backgroundColor: libraryPreview.color + '20' },
                    ]}
                  >
                    <Dumbbell color={libraryPreview.color} size={22} />
                  </View>
                  <View style={styles.libraryPreviewTitleBlock}>
                    <Text style={styles.libraryPreviewTitle} numberOfLines={2}>
                      {libraryPreview.name}
                    </Text>
                    <Text style={styles.libraryPreviewMeta}>
                      {libraryPreview.category.toUpperCase()}
                      {libraryPreview.source_name ? ` · ${libraryPreview.source_name}` : ''}
                    </Text>
                    {!!libraryPreview.subtitle && (
                      <Text style={styles.libraryPreviewSubtitle}>{libraryPreview.subtitle}</Text>
                    )}
                  </View>
                </View>
                {!!libraryPreview.source_url?.trim() && (
                  <TouchableOpacity
                    style={styles.libraryPreviewSourceLink}
                    onPress={() => Linking.openURL(libraryPreview.source_url)}
                    activeOpacity={0.8}
                  >
                    <ExternalLink color="#4C91FF" size={14} />
                    <Text style={styles.libraryPreviewSourceLinkText}>Open source</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.libraryPreviewSectionLabel}>Exercises</Text>
                <ScrollView
                  style={[styles.libraryPreviewScroll, { maxHeight: SCREEN_HEIGHT * 0.4 }]}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {[...(libraryPreview.exercises || [])]
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((ex, idx) => (
                      <View key={`${ex.name}-${idx}`} style={styles.libraryPreviewRow}>
                        <Text style={styles.libraryPreviewIdx}>{idx + 1}</Text>
                        <View style={styles.libraryPreviewExBody}>
                          <Text style={styles.libraryPreviewExName}>{ex.name}</Text>
                          <Text style={styles.libraryPreviewExSets}>
                            {typeof ex.default_sets === 'number' ? ex.default_sets : '—'} sets ×{' '}
                            {typeof ex.default_reps === 'number' ? ex.default_reps : '—'} reps
                          </Text>
                        </View>
                      </View>
                    ))}
                </ScrollView>
                <View style={styles.libraryPreviewFooter}>
                  <TouchableOpacity
                    style={styles.libraryPreviewCloseBtn}
                    onPress={() => setLibraryPreview(null)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.libraryPreviewCloseText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.libraryPreviewAddBtn,
                      { backgroundColor: libraryPreview.color },
                    ]}
                    onPress={async () => {
                      const id = libraryPreview.id;
                      const ok = await copyLibraryWorkout(id);
                      if (ok) setLibraryPreview(null);
                    }}
                    activeOpacity={0.85}
                    disabled={copyingLibraryId === libraryPreview.id}
                  >
                    <Plus color="#FFFFFF" size={16} style={styles.libraryActionIcon} />
                    <Text
                      style={styles.libraryPreviewAddText}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.78}
                    >
                      {copyingLibraryId === libraryPreview.id ? 'Adding...' : 'Add to My Workouts'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteModalTitle}>Delete Workout</Text>
            <Text style={styles.deleteModalMsg}>
              Delete "{deleteTarget?.name}"? This can't be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancel}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirm}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exit Session Modal */}
      <Modal
        visible={showExitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExitModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteModalTitle}>End Workout?</Text>
            <Text style={styles.deleteModalMsg}>
              Are you sure you want to end your workout session? Your progress will be lost.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancel}
                onPress={() => setShowExitModal(false)}
              >
                <Text style={styles.deleteModalCancelText}>Keep Going</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirm}
                onPress={async () => {
                  setShowExitModal(false);
                  await session.endSession();
                  setScreen('templates');
                }}
              >
                <Text style={styles.deleteModalConfirmText}>End Workout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// ═══════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
  },
  loadingText: { color: '#FFFFFF', fontSize: 18 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: { marginBottom: 28 },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4C91FF18',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4C91FF44',
  },
  historyHeaderBtnText: {
    color: '#CFE2FF',
    fontSize: 14,
    fontWeight: '700',
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
  tabSwitchWrap: {
    flexDirection: 'row',
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 4,
    marginBottom: 16,
  },
  tabSwitchBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 10,
  },
  tabSwitchBtnActive: {
    backgroundColor: '#4C91FF20',
    borderWidth: 1,
    borderColor: '#4C91FF55',
  },
  tabSwitchText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '700',
  },
  tabSwitchTextActive: {
    color: '#CFE2FF',
  },

  // ── Template Cards ──
  templateCard: { marginBottom: 14 },
  libraryCard: { marginBottom: 12 },
  librarySearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#2B2B2B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  librarySearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  libraryFilterRow: {
    paddingBottom: 10,
    gap: 8,
  },
  libraryFilterPill: {
    backgroundColor: '#202020',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  libraryFilterPillActive: {
    backgroundColor: '#4C91FF20',
    borderColor: '#4C91FF55',
  },
  libraryFilterText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  libraryFilterTextActive: {
    color: '#CFE2FF',
  },
  libraryEmptyCard: {
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  libraryEmptyText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  libraryLoadingMoreText: {
    color: '#777',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    fontWeight: '600',
  },
  libraryPreviewBox: {
    width: '88%',
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  libraryPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  libraryPreviewTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  libraryPreviewTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
  },
  libraryPreviewMeta: {
    color: '#999999',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  libraryPreviewSubtitle: {
    color: '#777777',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  libraryPreviewSourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  libraryPreviewSourceLinkText: {
    color: '#4C91FF',
    fontSize: 14,
    fontWeight: '600',
  },
  libraryPreviewSectionLabel: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
  },
  libraryPreviewScroll: {
    flexGrow: 0,
  },
  libraryPreviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333333',
  },
  libraryPreviewIdx: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '700',
    width: 26,
    paddingTop: 2,
  },
  libraryPreviewExBody: {
    flex: 1,
    minWidth: 0,
  },
  libraryPreviewExName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  libraryPreviewExSets: {
    color: '#888888',
    fontSize: 13,
    marginTop: 4,
  },
  libraryPreviewFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  libraryPreviewCloseBtn: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryPreviewCloseText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  libraryPreviewAddBtn: {
    flex: 1.2,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  libraryPreviewAddText: {
    flex: 1,
    minWidth: 0,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateInfo: {
    flex: 1,
    marginLeft: 14,
  },
  templateName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  templateMeta: {
    color: '#999999',
    fontSize: 13,
    marginTop: 2,
  },
  templateExerciseList: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  templateActions: {
    flexDirection: 'column',
    gap: 8,
  },
  templateActionBtn: {
    padding: 4,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  libraryCardActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 14,
  },
  libraryActionIcon: {
    flexShrink: 0,
  },
  libraryViewButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  libraryViewButtonText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  libraryAddButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  copyButtonText: {
    flex: 1,
    minWidth: 0,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Add Template ──
  addTemplateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#2A2A2A',
    backgroundColor: 'transparent',
  },
  addTemplateText: {
    color: '#4C91FF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },

  // ── Create / Edit Screen ──
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 8,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  templateExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  templateExInfo: { flex: 1 },
  templateExName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  templateExMeta: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  addExCard: {
    marginTop: 8,
    marginBottom: 16,
    overflow: 'visible',
    zIndex: 10,
  },
  addExRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  exerciseSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  exerciseSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  exerciseDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#252525',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 4,
    zIndex: 999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  exerciseDropdownScroll: {
    maxHeight: 250,
  },
  exerciseDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  exerciseDropdownName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  exerciseDropdownCategory: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  exerciseDropdownCustom: {
    borderBottomWidth: 0,
  },
  exerciseDropdownCustomText: {
    color: '#4C91FF',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryPillsContainer: {
    marginTop: 10,
    marginBottom: 4,
  },
  categoryPillsScroll: {
    gap: 8,
  },
  categoryPill: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryPillText: {
    color: '#CCCCCC',
    fontSize: 13,
    fontWeight: '600',
  },
  addExField: { flex: 1 },
  addExLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 6,
  },
  miniInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    textAlign: 'center',
  },
  addExButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#4C91FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    marginTop: 8,
  },

  // ── Session ──
  sessionHeader: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sessionHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E2A3A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    color: '#4C91FF',
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sessionName: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 14,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: '#999',
    fontSize: 13,
    marginTop: 8,
  },
  sessionLayoutRoot: {
    flex: 1,
  },
  sessionScrollView: {
    flex: 1,
  },
  sessionScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexGrow: 1,
  },
  sessionBottomDock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2F2F2F',
    backgroundColor: '#101010',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  sessionExCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sessionExCompleted: {
    backgroundColor: '#0D2818',
    borderColor: '#1A5C2E',
  },
  sessionExLeft: {
    marginRight: 14,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionExMid: { flex: 1 },
  sessionExNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionExName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionExNameDone: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  sessionExMeta: {
    color: '#777',
    fontSize: 13,
    marginTop: 3,
  },
  currentPrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  currentPrText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
  },
  currentPrTextActive: {
    color: '#FFB547',
  },
  sessionExRight: {
    marginLeft: 10,
    alignItems: 'center',
  },
  setPrButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    color: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setPrButtonActive: {
    backgroundColor: '#25344A',
    borderWidth: 1,
    borderColor: '#4C91FF66',
  },
  setPrButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  weightInputLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setPrButtonPR: {
    borderWidth: 1,
    borderColor: '#FFB547',
    backgroundColor: '#2A2200',
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2A2200',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  prBadgeText: {
    color: '#FFB547',
    fontSize: 11,
    fontWeight: '700',
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Wizard ──
  wizardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  wizardStepInfo: {
    flex: 1,
    alignItems: 'center',
  },
  wizardStepLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  wizardStepTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  wizardProgressBg: {
    height: 4,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  wizardProgressFill: {
    height: '100%',
    backgroundColor: '#4C91FF',
    borderRadius: 2,
  },
  wizardContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  wizardQuestion: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  wizardSubtext: {
    color: '#777',
    fontSize: 14,
    marginTop: -12,
    marginBottom: 20,
  },
  wizardNextBtn: {
    backgroundColor: '#4C91FF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  wizardNextBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  wizardCreateBtn: {
    backgroundColor: '#51CF66',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  wizardBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto' as any,
  },
  wizardBackBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardBackBtnText: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '600',
  },
  wizardExRow: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  wizardExTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  wizardExNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4C91FF20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  wizardExNumberText: {
    color: '#4C91FF',
    fontSize: 12,
    fontWeight: '700',
  },
  wizardExName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  wizardExRemove: {
    padding: 6,
    marginLeft: 8,
  },
  wizardExControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  wizardStepperGroup: {
    alignItems: 'center',
  },
  wizardStepperLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  wizardStepperX: {
    color: '#555',
    fontSize: 16,
    marginTop: 16,
  },
  wizardStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    overflow: 'hidden',
  },
  wizardStepperBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardStepperBtnText: {
    color: '#4C91FF',
    fontSize: 18,
    fontWeight: '700',
  },
  wizardStepperValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 10,
    minWidth: 36,
    textAlign: 'center',
  },
  wizardPRRow: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  wizardPRHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  wizardPRName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  wizardPRBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2A2200',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  wizardPRBadgeText: {
    color: '#FFB547',
    fontSize: 12,
    fontWeight: '600',
  },
  wizardPRInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  wizardPRInputLabel: {
    color: '#777',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  wizardPRInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 10,
    paddingHorizontal: 14,
    textAlign: 'center',
  },
  prModalBox: {
    width: '88%',
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  prModalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  prModalSubtitle: {
    color: '#999',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  prModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  prModalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#4C91FF',
    alignItems: 'center',
  },

  // ── Delete confirmation modal ──
  deleteModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  deleteModalBox: {
    width: '80%',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  deleteModalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  deleteModalMsg: {
    color: '#CCCCCC',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#444444',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#FF4C4C',
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  createChoiceBox: {
    width: '88%',
    maxWidth: 400,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  createChoiceTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  createChoiceSubtitle: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 22,
  },
  createChoicePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4C91FF',
    paddingVertical: 16,
    borderRadius: 14,
  },
  createChoicePrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  createChoiceOr: {
    color: '#555',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginVertical: 16,
  },
  createChoiceAi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#2B2248',
    borderWidth: 1,
    borderColor: '#5B4D9A88',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  createChoiceAiTextCol: {
    flex: 1,
  },
  createChoiceAiTitle: {
    color: '#E9D5FF',
    fontSize: 16,
    fontWeight: '700',
  },
  createChoiceAiSub: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 3,
    fontWeight: '500',
  },
  createChoiceProPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 181, 71, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  createChoiceProPillText: {
    color: '#FFB547',
    fontSize: 11,
    fontWeight: '800',
  },
  createChoiceDismiss: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 10,
  },
  createChoiceDismissText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },

  aiQuizContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    flexGrow: 1,
  },
  aiQuizBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  aiQuizBadgeText: {
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: '700',
  },
  aiOptionsCol: {
    gap: 10,
    marginBottom: 28,
  },
  aiOptionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  aiOptionCardSelected: {
    borderColor: '#845EF7',
    backgroundColor: '#2B2248',
  },
  aiOptionLabel: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '600',
  },
  aiOptionLabelSelected: {
    color: '#FFFFFF',
  },
  aiOptionBlurb: {
    color: '#8B8B8B',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontWeight: '500',
  },
  aiGeneratingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  aiGeneratingTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  aiGeneratingSub: {
    color: '#888',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
});
