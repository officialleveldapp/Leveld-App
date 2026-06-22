import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, X } from 'lucide-react-native';
import {
  apiCheckPR,
  apiCreateTemplate,
  apiGetPersonalRecords,
  apiGetTemplates,
  apiUpdateTemplate,
} from '@/lib/api';
import type { TemplateExercise, WorkoutCreateDraft } from '@/lib/workoutCreateDraft';
import { TEMPLATE_COLORS } from '@/components/workout-create/exerciseData';
import { WizardStepName } from '@/components/workout-create/WizardStepName';
import { WizardStepExercises } from '@/components/workout-create/WizardStepExercises';
import { WizardStepPRs } from '@/components/workout-create/WizardStepPRs';
import { wizardStyles as s } from '@/components/workout-create/wizardStyles';

type PersonalRecord = { weight: number; reps: number };

type EditingTemplate = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  initialDraft?: WorkoutCreateDraft | null;
  templateId?: string;
  onDone: () => void;
  onCancel: () => void;
};

export function WorkoutCreateWizard({
  initialDraft,
  templateId,
  onDone,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const footerPad = Math.max(insets.bottom, 16);

  const [wizardStep, setWizardStep] = useState(initialDraft?.startStep ?? 1);
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(
    initialDraft?.editingTemplateId
      ? {
          id: initialDraft.editingTemplateId,
          name: initialDraft.name ?? '',
          color: initialDraft.color ?? TEMPLATE_COLORS[0],
        }
      : null,
  );
  const [templateName, setTemplateName] = useState(initialDraft?.name ?? '');
  const [templateColor, setTemplateColor] = useState(initialDraft?.color ?? TEMPLATE_COLORS[0]);
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>(
    initialDraft?.exercises ?? [],
  );
  const [wizardPRs, setWizardPRs] = useState<Record<string, { weight: string; reps: string }>>({});
  const [prs, setPrs] = useState<Record<string, PersonalRecord>>({});
  const [saving, setSaving] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(!!templateId && !initialDraft);

  const wizardProgressAnim = useRef(new Animated.Value((initialDraft?.startStep ?? 1) / 3)).current;

  useEffect(() => {
    loadPRs();
  }, []);

  useEffect(() => {
    if (!templateId || initialDraft) return;
    (async () => {
      setLoadingTemplate(true);
      try {
        const { data } = await apiGetTemplates();
        const t = data?.find((item: any) => String(item.id) === String(templateId));
        if (t) {
          setEditingTemplate({ id: t.id, name: t.name, color: t.color });
          setTemplateName(t.name);
          setTemplateColor(t.color);
          setTemplateExercises(
            t.exercises.map((e: TemplateExercise, i: number) => ({ ...e, order: i })),
          );
        }
      } catch {
        Alert.alert('Error', 'Could not load workout');
        onCancel();
      } finally {
        setLoadingTemplate(false);
      }
    })();
  }, [templateId, initialDraft]);

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
    } catch {
      /* non-fatal */
    }
  };

  const goToWizardStep = (step: number) => {
    setWizardStep(step);
    Animated.timing(wizardProgressAnim, {
      toValue: step / 3,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const formatPRDisplay = (pr: PersonalRecord) => {
    const repLabel = pr.reps === 1 ? 'rep' : 'reps';
    return `${pr.weight} lbs x ${pr.reps} ${repLabel}`;
  };

  const handleNextFromExercises = () => {
    const existingPRs = { ...wizardPRs };
    templateExercises.forEach((ex) => {
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

      const prPromises = Object.entries(wizardPRs)
        .filter(([_, v]) => v.weight && parseFloat(v.weight) > 0)
        .map(([name, v]) =>
          apiCheckPR(name, parseFloat(v.weight), parseInt(v.reps) || 1).catch(() => null),
        );
      await Promise.all(prPromises);

      onDone();
    } catch {
      Alert.alert('Error', 'Failed to save workout template');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (wizardStep > 1) {
      goToWizardStep(wizardStep - 1);
    } else {
      onCancel();
    }
  };

  const stepTitle =
    wizardStep === 1 ? 'Name Your Workout' : wizardStep === 2 ? 'Add Exercises' : 'Set Your PRs';

  if (loadingTemplate) {
    return (
      <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#999' }}>Loading workout…</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={s.container}>
      <View style={[s.wizardHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleBack} style={s.backButton}>
          <ChevronLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <View style={s.wizardStepInfo}>
          <Text style={s.wizardStepLabel}>Step {wizardStep} of 3</Text>
          <Text style={s.wizardStepTitle}>{stepTitle}</Text>
        </View>
        <TouchableOpacity onPress={onCancel} style={s.backButton}>
          <X color="#999" size={20} />
        </TouchableOpacity>
      </View>

      <View style={s.wizardProgressBg}>
        <Animated.View
          style={[
            s.wizardProgressFill,
            {
              width: wizardProgressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {wizardStep === 1 ? (
        <WizardStepName
          templateName={templateName}
          templateColor={templateColor}
          onNameChange={setTemplateName}
          onColorChange={setTemplateColor}
          onNext={() => goToWizardStep(2)}
          footerPad={footerPad}
        />
      ) : null}

      {wizardStep === 2 ? (
        <WizardStepExercises
          exercises={templateExercises}
          onChange={setTemplateExercises}
          onBack={() => goToWizardStep(1)}
          onNext={handleNextFromExercises}
          footerPad={footerPad}
        />
      ) : null}

      {wizardStep === 3 ? (
        <WizardStepPRs
          exercises={templateExercises}
          wizardPRs={wizardPRs}
          prs={prs}
          saving={saving}
          editing={!!editingTemplate}
          onPRChange={(name, field, value) => {
            const entry = wizardPRs[name] || { weight: '', reps: '' };
            setWizardPRs({ ...wizardPRs, [name]: { ...entry, [field]: value } });
          }}
          onBack={() => goToWizardStep(2)}
          onSave={saveTemplate}
          footerPad={footerPad}
          formatPRDisplay={formatPRDisplay}
        />
      ) : null}
    </LinearGradient>
  );
}
