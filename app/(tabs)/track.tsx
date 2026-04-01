import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
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
  Pressable,
  Animated,
  Easing as RNEasing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { usePremiumGate } from '@/contexts/PremiumGateContext';
import { PLACEMENT_CUSTOM_TEMPLATE } from '@/lib/placements';
import { useSession } from '@/contexts/SessionContext';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import {
  apiGetTemplates,
  apiCreateTemplate,
  apiUpdateTemplate,
  apiDeleteTemplate,
  apiCreateWorkout,
  apiGetWorkouts,
  apiCheckPR,
  apiGetPersonalRecords,
  apiGetTemplateLibrary,
  apiCopyLibraryTemplate,
} from '@/lib/api';
import {
  Plus,
  X,
  Play,
  Check,
  CheckCircle,
  Trophy,
  Flame,
  Timer,
  Dumbbell,
  Trash2,
  Edit3,
  ChevronLeft,
  Zap,
  Crown,
  Star,
  Search,
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

const TEMPLATE_COLORS = [
  '#4C91FF', '#FF6B6B', '#51CF66', '#FFB547',
  '#CC5DE8', '#FF922B', '#20C997', '#845EF7',
];

// ─── Predefined common gym exercises ─────────────────
const COMMON_EXERCISES: { category: string; exercises: string[] }[] = [
  {
    category: 'Chest',
    exercises: [
      'Bench Press', 'Incline Bench Press', 'Decline Bench Press',
      'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Dumbbell Fly',
      'Incline Dumbbell Fly', 'Cable Fly', 'Cable Crossover',
      'Machine Chest Press', 'Pec Deck', 'Push-Up',
      'Chest Dip', 'Landmine Press', 'Floor Press',
    ],
  },
  {
    category: 'Back',
    exercises: [
      'Deadlift', 'Pull-Up', 'Chin-Up', 'Lat Pulldown',
      'Barbell Row', 'Dumbbell Row', 'Seated Cable Row',
      'T-Bar Row', 'Pendlay Row', 'Machine Row',
      'Face Pull', 'Straight-Arm Pulldown', 'Rack Pull',
      'Meadows Row', 'Chest-Supported Row', 'Inverted Row',
      'Cable Pullover', 'Single-Arm Lat Pulldown',
    ],
  },
  {
    category: 'Shoulders',
    exercises: [
      'Overhead Press', 'Military Press', 'Dumbbell Shoulder Press',
      'Arnold Press', 'Lateral Raise', 'Front Raise',
      'Reverse Fly', 'Cable Lateral Raise', 'Upright Row',
      'Machine Shoulder Press', 'Behind-the-Neck Press',
      'Lu Raise', 'Shrug', 'Barbell Shrug', 'Dumbbell Shrug',
      'Face Pull', 'Cable Front Raise', 'Plate Front Raise',
    ],
  },
  {
    category: 'Biceps',
    exercises: [
      'Barbell Curl', 'Dumbbell Curl', 'Hammer Curl',
      'Preacher Curl', 'Incline Dumbbell Curl', 'Concentration Curl',
      'Cable Curl', 'EZ-Bar Curl', 'Spider Curl',
      'Reverse Curl', 'Bayesian Curl', 'Drag Curl',
      'Machine Curl', '21s',
    ],
  },
  {
    category: 'Triceps',
    exercises: [
      'Tricep Pushdown', 'Overhead Tricep Extension',
      'Skull Crusher', 'Close-Grip Bench Press',
      'Dumbbell Tricep Extension', 'Cable Overhead Extension',
      'Tricep Dip', 'Diamond Push-Up', 'Tricep Kickback',
      'JM Press', 'French Press', 'Single-Arm Pushdown',
    ],
  },
  {
    category: 'Legs',
    exercises: [
      'Squat', 'Front Squat', 'Leg Press', 'Hack Squat',
      'Romanian Deadlift', 'Stiff-Leg Deadlift',
      'Leg Extension', 'Leg Curl', 'Seated Leg Curl',
      'Bulgarian Split Squat', 'Lunge', 'Walking Lunge',
      'Goblet Squat', 'Hip Thrust', 'Glute Bridge',
      'Sumo Deadlift', 'Good Morning', 'Box Squat',
      'Step-Up', 'Sissy Squat', 'Belt Squat',
      'Calf Raise', 'Seated Calf Raise', 'Smith Machine Squat',
      'Pendulum Squat', 'Leg Press Calf Raise',
    ],
  },
  {
    category: 'Core',
    exercises: [
      'Crunch', 'Plank', 'Hanging Leg Raise', 'Cable Crunch',
      'Ab Rollout', 'Russian Twist', 'Sit-Up',
      'Bicycle Crunch', 'Leg Raise', 'Side Plank',
      'Woodchop', 'Pallof Press', 'Dead Bug',
      'Decline Sit-Up', 'Dragon Flag', 'Toe Touch',
    ],
  },
  {
    category: 'Cardio',
    exercises: [
      'Treadmill Run', 'Cycling', 'Rowing Machine',
      'Stairmaster', 'Elliptical', 'Jump Rope',
      'Battle Ropes', 'Box Jump', 'Burpee',
      'Mountain Climber', 'Sled Push', 'Sled Pull',
      'Assault Bike', 'Farmer Walk', 'Kettlebell Swing',
    ],
  },
];

// Flatten into a single sorted list for search
const ALL_EXERCISES = COMMON_EXERCISES.flatMap((cat) =>
  cat.exercises.map((name) => ({ name, category: cat.category }))
);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

type Screen = 'templates' | 'create' | 'session' | 'complete';
type TemplateTab = 'my_workouts' | 'library';

const WORKOUT_NAME_SUGGESTIONS = [
  'Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body',
  'Full Body', 'Chest & Triceps', 'Back & Biceps', 'Shoulders & Arms',
  'Arms Day', 'Cardio', 'HIIT', 'Core & Abs',
];

export default function TrackScreen() {
  const { profile, refreshProfile } = useAuth();
  const { registerGated } = usePremiumGate();

  // Navigation
  const [screen, setScreen] = useState<Screen>('templates');

  // Templates
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [libraryTemplates, setLibraryTemplates] = useState<WorkoutLibraryTemplate[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [loadingMoreLibrary, setLoadingMoreLibrary] = useState(false);
  const [copyingLibraryId, setCopyingLibraryId] = useState<string | null>(null);
  const [activeTemplateTab, setActiveTemplateTab] = useState<TemplateTab>('my_workouts');
  const [libraryCategory, setLibraryCategory] = useState<string>('all');
  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySearchInput, setLibrarySearchInput] = useState('');
  const [libraryHasMore, setLibraryHasMore] = useState(false);
  const [libraryNextOffset, setLibraryNextOffset] = useState(0);
  const LIBRARY_PAGE_SIZE = 12;

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateColor, setTemplateColor] = useState(TEMPLATE_COLORS[0]);
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([]);
  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState('3');
  const [newExReps, setNewExReps] = useState('10');
  const [saving, setSaving] = useState(false);
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const [exerciseSearchResults, setExerciseSearchResults] = useState<{ name: string; category: string }[]>([]);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [nameSearchResults, setNameSearchResults] = useState<string[]>([]);
  const [wizardPRs, setWizardPRs] = useState<Record<string, { weight: string; reps: string }>>({});
  const wizardProgressAnim = useRef(new Animated.Value(0)).current;
  const wizardSlideAnim = useRef(new Animated.Value(0)).current;

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

  // Exit session modal
  const [showExitModal, setShowExitModal] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<WorkoutTemplate | null>(null);

  // Completion
  const [completionData, setCompletionData] = useState<{
    xp: number;
    exercises: number;
    duration: number;
    newPRs: string[];
    totalSets: number;
    totalReps: number;
  } | null>(null);

  const [displayXp, setDisplayXp] = useState(0);

  // Use elapsed from session context (persisted timer)
  const elapsed = session.elapsed;

  // Restore session state if we navigate back to Track with an active session
  useEffect(() => {
    if (session.isActive && screen !== 'session' && screen !== 'complete') {
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
  const openCreateTemplate = () => {
    const run = () => {
      setEditingTemplate(null);
      setTemplateName('');
      setTemplateColor(TEMPLATE_COLORS[0]);
      setTemplateExercises([]);
      setNewExName('');
      setNewExSets('3');
      setNewExReps('10');
      setWizardStep(1);
      setWizardPRs({});
      setShowNameDropdown(false);
      wizardProgressAnim.setValue(0.33);
      wizardSlideAnim.setValue(0);
      setScreen('create');
    };
    if (profile?.is_pro || templates.length === 0) {
      run();
      return;
    }
    void registerGated(PLACEMENT_CUSTOM_TEMPLATE, run);
  };

  const openEditTemplate = (t: WorkoutTemplate) => {
    setEditingTemplate(t);
    setTemplateName(t.name);
    setTemplateColor(t.color);
    setTemplateExercises(
      t.exercises.map((e, i) => ({ ...e, order: i }))
    );
    setWizardStep(1);
    setWizardPRs({});
    wizardProgressAnim.setValue(0.33);
    wizardSlideAnim.setValue(0);
    setScreen('create');
  };

  const goToWizardStep = (step: number) => {
    setWizardStep(step);
    Animated.timing(wizardProgressAnim, {
      toValue: step / 3,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleNameSearch = (text: string) => {
    setTemplateName(text);
    if (text.trim().length === 0) {
      setNameSearchResults(WORKOUT_NAME_SUGGESTIONS);
      setShowNameDropdown(true);
      return;
    }
    const q = text.toLowerCase();
    const results = WORKOUT_NAME_SUGGESTIONS.filter(n => n.toLowerCase().includes(q));
    setNameSearchResults(results);
    setShowNameDropdown(results.length > 0);
  };

  const handleExerciseSearch = (text: string) => {
    setNewExName(text);
    if (text.trim().length === 0) {
      // Show all exercises grouped when input is empty but focused
      setExerciseSearchResults([]);
      setShowExerciseDropdown(false);
      return;
    }
    const query = text.toLowerCase();
    const results = ALL_EXERCISES.filter(
      (e) => e.name.toLowerCase().includes(query)
    );
    setExerciseSearchResults(results.slice(0, 15)); // Cap at 15 results
    setShowExerciseDropdown(results.length > 0);
  };

  const selectExercise = (name: string) => {
    setNewExName(name);
    setShowExerciseDropdown(false);
  };

  const showAllExercises = () => {
    setExerciseSearchResults(ALL_EXERCISES.slice(0, 30));
    setShowExerciseDropdown(true);
  };

  const addExerciseToTemplate = () => {
    if (!newExName.trim()) {
      Alert.alert('Error', 'Enter an exercise name');
      return;
    }
    setTemplateExercises([
      ...templateExercises,
      {
        name: newExName.trim(),
        default_sets: parseInt(newExSets) || 3,
        default_reps: parseInt(newExReps) || 10,
        order: templateExercises.length,
      },
    ]);
    setNewExName('');
    setNewExSets('3');
    setNewExReps('10');
    setShowExerciseDropdown(false);
  };

  const removeExerciseFromTemplate = (idx: number) => {
    setTemplateExercises(templateExercises.filter((_, i) => i !== idx));
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Error', 'Enter a workout name');
      return;
    }
    if (templateExercises.length === 0) {
      Alert.alert('Error', 'Add at least one exercise');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: templateName.trim(),
        color: templateColor,
        icon: 'dumbbell',
        exercises: templateExercises.map((e) => ({
          name: e.name,
          default_sets: e.default_sets,
          default_reps: e.default_reps,
        })),
      };

      if (editingTemplate) {
        await apiUpdateTemplate(editingTemplate.id, payload);
      } else {
        await apiCreateTemplate(payload);
      }

      // Save PRs from wizard step 3
      const prPromises = Object.entries(wizardPRs)
        .filter(([_, v]) => v.weight && parseFloat(v.weight) > 0)
        .map(([name, v]) =>
          apiCheckPR(name, parseFloat(v.weight), parseInt(v.reps) || 1).catch(() => null)
        );
      await Promise.all(prPromises);

      await loadTemplates();
      await loadPRs();
      setScreen('templates');
    } catch (e) {
      Alert.alert('Error', 'Failed to save workout template');
    } finally {
      setSaving(false);
    }
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

  const copyLibraryWorkout = async (libraryTemplateId: string) => {
    setCopyingLibraryId(libraryTemplateId);
    try {
      const { error } = await apiCopyLibraryTemplate(libraryTemplateId);
      if (error) {
        if (error?.code === 'template_limit') {
          Alert.alert(
            'Template Limit Reached',
            error?.detail || 'Upgrade to add more saved workouts from the library.'
          );
          return;
        }
        Alert.alert('Error', 'Could not copy this workout right now.');
        return;
      }
      await loadTemplates();
      Alert.alert('Added', 'Workout added to your workouts.');
    } catch {
      Alert.alert('Error', 'Could not copy this workout right now.');
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
    updated[idx] = { ...updated[idx], completed: !updated[idx].completed };

    // Check for PR when marking as complete
    if (updated[idx].completed && updated[idx].weight) {
      updated = await checkAndSavePR(updated, idx);
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
      }));

      await apiCreateWorkout({
        workout_date: new Date().toISOString().split('T')[0],
        exercises,
        total_sets: totalSets,
        total_reps: totalReps,
        duration_minutes: durationMin,
        calories_burned: calories,
        xp_earned: xp,
        notes: activeTemplate?.name || '',
      });

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

      // Animate XP count-up
      setDisplayXp(0);
      setScreen('complete');

      // Delay the XP animation so it starts after the title fades in
      setTimeout(() => {
        const step = Math.max(1, Math.ceil(xp / 60));
        let current = 0;
        const interval = setInterval(() => {
          current = Math.min(current + step, xp);
          setDisplayXp(current);
          if (current >= xp) clearInterval(interval);
        }, 25);
      }, 600);

      await refreshProfile();
      // Reload PRs so they're up-to-date for the next session
      await loadPRs();
    } catch (e) {
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  const finishCompletion = () => {
    setCompletionData(null);
    setActiveTemplate(null);
    setSessionExercises([]);
    setScreen('templates');
    loadTemplates();
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
  //  SCREEN: CREATE / EDIT TEMPLATE (STEP-BY-STEP WIZARD)
  // ═══════════════════════════════════════════════════
  if (screen === 'create') {
    const canGoNext1 = templateName.trim().length > 0;
    const canGoNext2 = templateExercises.length > 0;

    return (
      <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
        {/* Wizard Header */}
        <View style={styles.wizardHeader}>
          <TouchableOpacity
            onPress={() => {
              if (wizardStep > 1) {
                goToWizardStep(wizardStep - 1);
              } else {
                setScreen('templates');
              }
            }}
            style={styles.backButton}
          >
            <ChevronLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>
          <View style={styles.wizardStepInfo}>
            <Text style={styles.wizardStepLabel}>Step {wizardStep} of 3</Text>
            <Text style={styles.wizardStepTitle}>
              {wizardStep === 1 ? 'Name Your Workout' : wizardStep === 2 ? 'Add Exercises' : 'Set Your PRs'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setScreen('templates')}
            style={styles.backButton}
          >
            <X color="#999" size={20} />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.wizardProgressBg}>
          <Animated.View
            style={[
              styles.wizardProgressFill,
              {
                width: wizardProgressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* STEP 1: Workout Name & Color */}
        {wizardStep === 1 && (
          <ScrollView
            contentContainerStyle={styles.wizardContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.wizardQuestion}>What do you want to call this workout?</Text>

            <View style={{ position: 'relative', zIndex: 10 }}>
              <View style={styles.exerciseSearchWrapper}>
                <Search color="#666" size={18} style={{ marginLeft: 14 }} />
                <TextInput
                  style={styles.exerciseSearchInput}
                  placeholder="e.g. Push Day, Leg Day..."
                  placeholderTextColor="#666"
                  value={templateName}
                  onChangeText={handleNameSearch}
                  onFocus={() => {
                    const q = templateName.toLowerCase();
                    const results = templateName.trim().length === 0
                      ? WORKOUT_NAME_SUGGESTIONS
                      : WORKOUT_NAME_SUGGESTIONS.filter(n => n.toLowerCase().includes(q));
                    setNameSearchResults(results);
                    setShowNameDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowNameDropdown(false), 200)}
                />
                {templateName.length > 0 && (
                  <TouchableOpacity
                    onPress={() => { setTemplateName(''); setShowNameDropdown(false); }}
                    style={{ marginRight: 12 }}
                  >
                    <X color="#666" size={18} />
                  </TouchableOpacity>
                )}
              </View>
              {showNameDropdown && nameSearchResults.length > 0 && (
                <View style={styles.exerciseDropdown}>
                  <ScrollView style={styles.exerciseDropdownScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                    {nameSearchResults.map((name, idx) => (
                      <TouchableOpacity
                        key={`${name}-${idx}`}
                        style={styles.exerciseDropdownItem}
                        onPress={() => { setTemplateName(name); setShowNameDropdown(false); }}
                      >
                        <Text style={styles.exerciseDropdownName}>{name}</Text>
                      </TouchableOpacity>
                    ))}
                    {templateName.trim().length > 0 && !nameSearchResults.some(
                      n => n.toLowerCase() === templateName.trim().toLowerCase()
                    ) && (
                      <TouchableOpacity
                        style={[styles.exerciseDropdownItem, styles.exerciseDropdownCustom]}
                        onPress={() => { setShowNameDropdown(false); }}
                      >
                        <Text style={styles.exerciseDropdownCustomText}>
                          Use "{templateName.trim()}"
                        </Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            <Text style={[styles.wizardQuestion, { marginTop: 32 }]}>Pick a color</Text>
            <View style={styles.colorRow}>
              {TEMPLATE_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setTemplateColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    templateColor === c && styles.colorDotSelected,
                  ]}
                />
              ))}
            </View>

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              style={[styles.wizardNextBtn, !canGoNext1 && { opacity: 0.4 }]}
              onPress={() => canGoNext1 && goToWizardStep(2)}
              disabled={!canGoNext1}
              activeOpacity={0.8}
            >
              <Text style={styles.wizardNextBtnText}>Next</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* STEP 2: Exercises */}
        {wizardStep === 2 && (
          <ScrollView
            contentContainerStyle={styles.wizardContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => setShowExerciseDropdown(false)}
          >
            <Text style={styles.wizardQuestion}>Add exercises to your workout</Text>

            {templateExercises.map((ex, idx) => (
              <View key={idx} style={styles.wizardExRow}>
                <View style={styles.wizardExTopRow}>
                  <View style={styles.wizardExNumber}>
                    <Text style={styles.wizardExNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.wizardExName} numberOfLines={1}>{ex.name}</Text>
                  <TouchableOpacity onPress={() => removeExerciseFromTemplate(idx)} style={styles.wizardExRemove}>
                    <X color="#FF4C4C" size={16} />
                  </TouchableOpacity>
                </View>
                <View style={styles.wizardExControls}>
                  <View style={styles.wizardStepperGroup}>
                    <Text style={styles.wizardStepperLabel}>Sets</Text>
                    <View style={styles.wizardStepper}>
                      <TouchableOpacity
                        onPress={() => {
                          const updated = [...templateExercises];
                          updated[idx] = { ...ex, default_sets: Math.max(1, ex.default_sets - 1) };
                          setTemplateExercises(updated);
                        }}
                        style={styles.wizardStepperBtn}
                      >
                        <Text style={styles.wizardStepperBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.wizardStepperValue}>{ex.default_sets}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          const updated = [...templateExercises];
                          updated[idx] = { ...ex, default_sets: ex.default_sets + 1 };
                          setTemplateExercises(updated);
                        }}
                        style={styles.wizardStepperBtn}
                      >
                        <Text style={styles.wizardStepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.wizardStepperX}>×</Text>
                  <View style={styles.wizardStepperGroup}>
                    <Text style={styles.wizardStepperLabel}>Reps</Text>
                    <View style={styles.wizardStepper}>
                      <TouchableOpacity
                        onPress={() => {
                          const updated = [...templateExercises];
                          updated[idx] = { ...ex, default_reps: Math.max(1, ex.default_reps - 1) };
                          setTemplateExercises(updated);
                        }}
                        style={styles.wizardStepperBtn}
                      >
                        <Text style={styles.wizardStepperBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.wizardStepperValue}>{ex.default_reps}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          const updated = [...templateExercises];
                          updated[idx] = { ...ex, default_reps: ex.default_reps + 1 };
                          setTemplateExercises(updated);
                        }}
                        style={styles.wizardStepperBtn}
                      >
                        <Text style={styles.wizardStepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {/* Add exercise */}
            <Card style={styles.addExCard}>
              <View style={{ position: 'relative', zIndex: 10 }}>
                <View style={styles.exerciseSearchWrapper}>
                  <Search color="#666" size={18} style={{ marginLeft: 14 }} />
                  <TextInput
                    style={styles.exerciseSearchInput}
                    placeholder="Search exercises..."
                    placeholderTextColor="#666"
                    value={newExName}
                    onChangeText={handleExerciseSearch}
                    onFocus={() => {
                      if (newExName.trim().length === 0) showAllExercises();
                      else handleExerciseSearch(newExName);
                    }}
                  />
                  {newExName.length > 0 && (
                    <TouchableOpacity
                      onPress={() => { setNewExName(''); setShowExerciseDropdown(false); }}
                      style={{ marginRight: 12 }}
                    >
                      <X color="#666" size={18} />
                    </TouchableOpacity>
                  )}
                </View>
                {showExerciseDropdown && exerciseSearchResults.length > 0 && (
                  <View style={styles.exerciseDropdown}>
                    <ScrollView style={styles.exerciseDropdownScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                      {exerciseSearchResults.map((item, idx) => (
                        <TouchableOpacity
                          key={`${item.name}-${idx}`}
                          style={styles.exerciseDropdownItem}
                          onPress={() => {
                            selectExercise(item.name);
                            setTemplateExercises([
                              ...templateExercises,
                              {
                                name: item.name,
                                default_sets: parseInt(newExSets) || 3,
                                default_reps: parseInt(newExReps) || 10,
                                order: templateExercises.length,
                              },
                            ]);
                            setNewExName('');
                            setShowExerciseDropdown(false);
                          }}
                        >
                          <Text style={styles.exerciseDropdownName}>{item.name}</Text>
                          <Text style={styles.exerciseDropdownCategory}>{item.category}</Text>
                        </TouchableOpacity>
                      ))}
                      {newExName.trim().length > 0 && !exerciseSearchResults.some(
                        (e) => e.name.toLowerCase() === newExName.trim().toLowerCase()
                      ) && (
                        <TouchableOpacity
                          style={[styles.exerciseDropdownItem, styles.exerciseDropdownCustom]}
                          onPress={() => {
                            setTemplateExercises([
                              ...templateExercises,
                              {
                                name: newExName.trim(),
                                default_sets: parseInt(newExSets) || 3,
                                default_reps: parseInt(newExReps) || 10,
                                order: templateExercises.length,
                              },
                            ]);
                            setNewExName('');
                            setShowExerciseDropdown(false);
                          }}
                        >
                          <Text style={styles.exerciseDropdownCustomText}>
                            + Add "{newExName.trim()}"
                          </Text>
                        </TouchableOpacity>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {!showExerciseDropdown && newExName.trim().length === 0 && (
                <View style={styles.categoryPillsContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPillsScroll}>
                    {COMMON_EXERCISES.map((cat) => (
                      <TouchableOpacity
                        key={cat.category}
                        style={styles.categoryPill}
                        onPress={() => {
                          setExerciseSearchResults(cat.exercises.map(name => ({ name, category: cat.category })));
                          setShowExerciseDropdown(true);
                        }}
                      >
                        <Text style={styles.categoryPillText}>{cat.category}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </Card>

            <View style={{ height: 80 }} />

            <View style={styles.wizardBtnRow}>
              <TouchableOpacity
                style={styles.wizardBackBtn}
                onPress={() => goToWizardStep(1)}
              >
                <Text style={styles.wizardBackBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.wizardNextBtn, { flex: 1 }, !canGoNext2 && { opacity: 0.4 }]}
                onPress={() => {
                  if (canGoNext2) {
                    const existingPRs = { ...wizardPRs };
                    templateExercises.forEach(ex => {
                      if (!existingPRs[ex.name]) {
                        const currentPR = prs[ex.name];
                        existingPRs[ex.name] = {
                          weight: currentPR ? String(currentPR.weight) : '',
                          reps: String(ex.default_reps),
                        };
                      }
                    });
                    setWizardPRs(existingPRs);
                    goToWizardStep(3);
                  }
                }}
                disabled={!canGoNext2}
                activeOpacity={0.8}
              >
                <Text style={styles.wizardNextBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* STEP 3: Personal Records */}
        {wizardStep === 3 && (
          <ScrollView
            contentContainerStyle={styles.wizardContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.wizardQuestion}>Set your personal records</Text>
            <Text style={styles.wizardSubtext}>Optional — track your best lifts for each exercise</Text>

            {templateExercises.map((ex, idx) => {
              const currentPR = prs[ex.name];
              const prEntry = wizardPRs[ex.name] || { weight: '', reps: '' };
              return (
                <View key={idx} style={styles.wizardPRRow}>
                  <View style={styles.wizardPRHeader}>
                    <View style={styles.wizardExNumber}>
                      <Text style={styles.wizardExNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.wizardPRName}>{ex.name}</Text>
                    {currentPR ? (
                      <View style={styles.wizardPRBadge}>
                        <Trophy color="#FFB547" size={12} />
                        <Text style={styles.wizardPRBadgeText}>{formatPRDisplay(currentPR)}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.wizardPRInputs}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.wizardPRInputLabel}>Weight (lbs)</Text>
                      <TextInput
                        style={styles.wizardPRInput}
                        placeholder={currentPR ? String(currentPR.weight) : '0'}
                        placeholderTextColor="#555"
                        value={prEntry.weight}
                        onChangeText={(t) => setWizardPRs({ ...wizardPRs, [ex.name]: { ...prEntry, weight: t } })}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.wizardPRInputLabel}>Reps</Text>
                      <TextInput
                        style={styles.wizardPRInput}
                        placeholder={String(ex.default_reps)}
                        placeholderTextColor="#555"
                        value={prEntry.reps}
                        onChangeText={(t) => setWizardPRs({ ...wizardPRs, [ex.name]: { ...prEntry, reps: t } })}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              );
            })}

            <View style={{ height: 80 }} />

            <View style={styles.wizardBtnRow}>
              <TouchableOpacity
                style={styles.wizardBackBtn}
                onPress={() => goToWizardStep(2)}
              >
                <Text style={styles.wizardBackBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.wizardCreateBtn, { flex: 1 }]}
                onPress={saveTemplate}
                activeOpacity={0.8}
                disabled={saving}
              >
                {saving ? (
                  <Text style={styles.wizardNextBtnText}>Saving...</Text>
                ) : (
                  <>
                    <Check color="#FFFFFF" size={20} />
                    <Text style={styles.wizardNextBtnText}>
                      {editingTemplate ? 'Save Changes' : 'Create Workout'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </LinearGradient>
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

          {/* Progress Bar */}
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

        {/* Exercise List */}
        <ScrollView
          contentContainerStyle={styles.sessionScroll}
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

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Finish Button */}
        <View style={styles.finishButtonContainer}>
          <TouchableOpacity
            style={[
              styles.finishButton,
              { backgroundColor: activeTemplate.color },
              completedCount === 0 && { opacity: 0.4 },
            ]}
            onPress={finishSession}
            disabled={completedCount === 0}
          >
            <Check color="#FFFFFF" size={22} />
            <Text style={styles.finishButtonText}>Finish Workout</Text>
          </TouchableOpacity>
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
  //  SCREEN: COMPLETION (premium staggered fade-in)
  // ═══════════════════════════════════════════════════
  if (screen === 'complete' && completionData) {
    const DURATION = 500;
    const BASE_DELAY = 0;

    return (
      <LinearGradient colors={['#0D0D0D', '#141414', '#1A1A1A']} style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.completionContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Checkmark / Trophy icon */}
          <FadeInView delay={BASE_DELAY} duration={DURATION} style={styles.trophyCircle}>
            <Trophy color="#FFB547" size={44} />
          </FadeInView>

          {/* Title */}
          <FadeInView delay={BASE_DELAY + 200} duration={DURATION}>
            <Text style={styles.completionTitle}>Workout Complete</Text>
          </FadeInView>

          {/* Subtitle with template name */}
          {activeTemplate && (
            <FadeInView delay={BASE_DELAY + 300} duration={DURATION}>
              <Text style={styles.completionSubtitle}>{activeTemplate.name}</Text>
            </FadeInView>
          )}

          {/* XP count-up */}
          <FadeInView delay={BASE_DELAY + 450} duration={DURATION} style={styles.xpRow}>
            <Zap color="#FFB547" size={26} />
            <Text style={styles.xpAmount}>+{displayXp}</Text>
            <Text style={styles.xpLabel}>XP</Text>
          </FadeInView>

          {/* Divider */}
          <FadeInView delay={BASE_DELAY + 600} duration={300} style={styles.divider}>
            <View />
          </FadeInView>

          {/* Stats cards – staggered 100ms apart */}
          <FadeInView delay={BASE_DELAY + 700} duration={DURATION} style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Dumbbell color="#4C91FF" size={22} />
              <Text style={styles.statNumber}>{completionData.exercises}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
            <View style={styles.statBox}>
              <Timer color="#51CF66" size={22} />
              <Text style={styles.statNumber}>{completionData.duration}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
            <View style={styles.statBox}>
              <Flame color="#FF6B6B" size={22} />
              <Text style={styles.statNumber}>{completionData.totalSets}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
          </FadeInView>

          <FadeInView delay={BASE_DELAY + 800} duration={DURATION} style={styles.statsGrid}>
            <View style={[styles.statBox, styles.statBoxWide]}>
              <Text style={styles.statNumber}>{completionData.totalReps}</Text>
              <Text style={styles.statLabel}>Total Reps</Text>
            </View>
          </FadeInView>

          {/* PRs section */}
          {completionData.newPRs.length > 0 && (
            <FadeInView delay={BASE_DELAY + 1000} duration={DURATION} style={styles.prSection}>
              <View style={styles.prHeader}>
                <Crown color="#FFB547" size={20} />
                <Text style={styles.prTitle}>New Personal Records</Text>
              </View>
              {completionData.newPRs.map((name, idx) => (
                <FadeInView
                  key={name}
                  delay={BASE_DELAY + 1100 + idx * 100}
                  duration={400}
                  style={styles.prItemRow}
                >
                  <View style={styles.prDot} />
                  <Text style={styles.prItem}>{name}</Text>
                </FadeInView>
              ))}
            </FadeInView>
          )}

          {/* Streak */}
          {profile && profile.current_streak > 0 && (
            <FadeInView delay={BASE_DELAY + 1200} duration={DURATION} style={styles.streakRow}>
              <Flame color="#FF922B" size={20} />
              <Text style={styles.streakText}>
                {profile.current_streak} day streak
                  </Text>
            </FadeInView>
          )}

          {/* Done button – fades in last */}
          <FadeInView delay={BASE_DELAY + 1400} duration={DURATION} style={{ width: '100%', paddingHorizontal: 24, marginTop: 20 }}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={finishCompletion}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </FadeInView>

          <View style={{ height: 60 }} />
        </ScrollView>
      </LinearGradient>
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
          <Text style={styles.title}>Track</Text>
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

            <TouchableOpacity onPress={openCreateTemplate}>
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
                  <TouchableOpacity
                    style={[styles.copyButton, { backgroundColor: t.color }]}
                    onPress={() => copyLibraryWorkout(t.id)}
                    activeOpacity={0.85}
                    disabled={copyingLibraryId === t.id}
                  >
                    <Plus color="#FFFFFF" size={16} />
                    <Text style={styles.copyButtonText}>
                      {copyingLibraryId === t.id ? 'Adding...' : 'Add to My Workouts'}
                    </Text>
                  </TouchableOpacity>
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
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
  sessionScroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
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
  finishButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
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

  // ── Completion (premium staggered fade-in) ──
  completionContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  trophyCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 181, 71, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 71, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  completionTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  completionSubtitle: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 20,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 24,
  },
  xpAmount: {
    color: '#FFB547',
    fontSize: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'] as any,
  },
  xpLabel: {
    color: '#FFB547',
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.8,
  },
  divider: {
    width: '60%',
    height: 1,
    backgroundColor: '#2A2A2A',
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#222',
  },
  statBoxWide: {
    flex: 1,
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'] as any,
  },
  statLabel: {
    color: '#777',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase' as any,
    letterSpacing: 0.5,
  },
  prSection: {
    width: '100%',
    backgroundColor: 'rgba(255, 181, 71, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 71, 0.15)',
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    marginBottom: 14,
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
  prItem: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 146, 43, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginTop: 10,
  },
  streakText: {
    color: '#FF922B',
    fontSize: 15,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#4C91FF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
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
});
