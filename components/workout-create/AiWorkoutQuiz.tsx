import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import {
  buildPersonalizedWorkout,
  EQUIPMENT_PICKS,
  EXPERIENCE_PICKS,
  getAiQuizPhases,
  PROGRAM_DAY_OPTIONS,
  PROGRAM_STYLE_META,
  type AiQuizPhase,
  type Equipment,
  type Experience,
  type ProgramDay,
  type ProgramStyle,
} from '@/lib/personalizedWorkoutGenerator';
import type { WorkoutCreateDraft } from '@/lib/workoutCreateDraft';
import { wizardStyles as s } from '@/components/workout-create/wizardStyles';

type Props = {
  onComplete: (draft: WorkoutCreateDraft) => void;
  onCancel: () => void;
};

export function AiWorkoutQuiz({ onComplete, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const [aiPhase, setAiPhase] = useState<AiQuizPhase>('style');
  const [aiProgramStyle, setAiProgramStyle] = useState<ProgramStyle | null>(null);
  const [aiProgramDay, setAiProgramDay] = useState<ProgramDay | null>(null);
  const [aiEquipment, setAiEquipment] = useState<Equipment | null>(null);
  const [aiExperience, setAiExperience] = useState<Experience | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  const aiQuizPhases = useMemo(() => getAiQuizPhases(aiProgramStyle), [aiProgramStyle]);
  const aiStepIndex = Math.max(0, aiQuizPhases.indexOf(aiPhase)) + 1;
  const aiStepTotal = aiQuizPhases.length;

  const dayChoices =
    aiProgramStyle && aiPhase === 'day' ? PROGRAM_DAY_OPTIONS[aiProgramStyle] : null;

  const goBackAiQuiz = () => {
    if (aiPhase === 'style') {
      onCancel();
      return;
    }
    if (aiPhase === 'experience') {
      setAiPhase('equipment');
      return;
    }
    if (aiPhase === 'equipment') {
      if (aiProgramStyle === 'full_body') {
        setAiPhase('style');
        setAiEquipment(null);
        setAiProgramDay(null);
      } else {
        setAiPhase('day');
        setAiEquipment(null);
      }
      return;
    }
    if (aiPhase === 'day') {
      setAiPhase('style');
      setAiProgramDay(null);
    }
  };

  const goNextAiQuiz = () => {
    if (aiPhase === 'style') {
      if (!aiProgramStyle) return;
      if (aiProgramStyle === 'full_body') {
        setAiProgramDay('full_body_only');
        setAiPhase('equipment');
      } else {
        setAiPhase('day');
      }
      return;
    }
    if (aiPhase === 'day') {
      if (!aiProgramDay) return;
      setAiPhase('equipment');
      return;
    }
    if (aiPhase === 'equipment') {
      if (!aiEquipment) return;
      setAiPhase('experience');
      return;
    }
    if (aiPhase === 'experience') {
      if (!aiProgramStyle || !aiProgramDay || !aiEquipment || !aiExperience) return;
      setAiGenerating(true);
      setTimeout(() => {
        const gen = buildPersonalizedWorkout({
          programStyle: aiProgramStyle,
          programDay: aiProgramDay,
          equipment: aiEquipment,
          experience: aiExperience,
        });
        onComplete({
          name: gen.name,
          color: gen.color,
          exercises: gen.exercises.map((e, i) => ({
            name: e.name,
            default_sets: e.default_sets,
            default_reps: e.default_reps,
            order: i,
          })),
          startStep: 2,
        });
      }, 900);
    }
  };

  const aiPhaseTitle = (() => {
    switch (aiPhase) {
      case 'style':
        return 'Choose a split';
      case 'day':
        return 'Which day is this?';
      case 'equipment':
        return 'What equipment do you have?';
      case 'experience':
        return 'How long have you trained?';
      default:
        return '';
    }
  })();

  const aiPhaseSubtitle = (() => {
    switch (aiPhase) {
      case 'style':
        return 'Real program names — tap one that sounds like you.';
      case 'day':
        return 'Save one workout at a time (e.g. your push day). Add another template later for pull, etc.';
      case 'equipment':
        return 'We only show moves you can actually do.';
      case 'experience':
        return 'Sets and reps adjust automatically — you can edit after.';
      default:
        return '';
    }
  })();

  const canGoNextAiQuiz = (() => {
    if (aiGenerating) return false;
    switch (aiPhase) {
      case 'style':
        return aiProgramStyle != null;
      case 'day':
        return aiProgramDay != null;
      case 'equipment':
        return aiEquipment != null;
      case 'experience':
        return aiExperience != null;
      default:
        return false;
    }
  })();

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={s.container}>
      <View style={[s.wizardHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={goBackAiQuiz} style={s.backButton}>
          <ChevronLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <View style={s.wizardStepInfo}>
          <Text style={s.wizardStepLabel}>
            Step {aiStepIndex} of {aiStepTotal}
          </Text>
          <Text style={s.wizardStepTitle}>Workout builder</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.wizardProgressBg}>
        <View
          style={[
            s.wizardProgressFill,
            { width: `${(aiStepIndex / Math.max(1, aiStepTotal)) * 100}%` },
          ]}
        />
      </View>

      {aiGenerating ? (
        <View style={s.aiGeneratingWrap}>
          <ActivityIndicator size="large" color="#845EF7" />
          <Text style={s.aiGeneratingTitle}>Building your workout</Text>
          <Text style={s.aiGeneratingSub}>Lining up exercises for the split you picked…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.aiQuizContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.aiQuizBadgeRow}>
            <Sparkles color="#C4B5FD" size={18} />
            <Text style={s.aiQuizBadgeText}>Classic splits · plain English</Text>
          </View>

          <Text style={s.wizardQuestion}>{aiPhaseTitle}</Text>
          <Text style={s.wizardSubtext}>{aiPhaseSubtitle}</Text>

          {aiPhase === 'style' ? (
            <View style={s.aiOptionsCol}>
              {PROGRAM_STYLE_META.map((opt) => {
                const selected = aiProgramStyle === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.aiOptionCard, selected && s.aiOptionCardSelected]}
                    onPress={() => {
                      setAiProgramStyle(opt.value);
                      setAiProgramDay(null);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.aiOptionLabel, selected && s.aiOptionLabelSelected]}>
                      {opt.title}
                    </Text>
                    <Text style={s.aiOptionBlurb}>{opt.blurb}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {aiPhase === 'day' && dayChoices ? (
            <View style={s.aiOptionsCol}>
              {dayChoices.map((opt) => {
                const selected = aiProgramDay === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.aiOptionCard, selected && s.aiOptionCardSelected]}
                    onPress={() => setAiProgramDay(opt.value)}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.aiOptionLabel, selected && s.aiOptionLabelSelected]}>
                      {opt.title}
                    </Text>
                    <Text style={s.aiOptionBlurb}>{opt.blurb}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {aiPhase === 'equipment' ? (
            <View style={s.aiOptionsCol}>
              {EQUIPMENT_PICKS.map((opt) => {
                const selected = aiEquipment === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.aiOptionCard, selected && s.aiOptionCardSelected]}
                    onPress={() => setAiEquipment(opt.value)}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.aiOptionLabel, selected && s.aiOptionLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={s.aiOptionBlurb}>{opt.blurb}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {aiPhase === 'experience' ? (
            <View style={s.aiOptionsCol}>
              {EXPERIENCE_PICKS.map((opt) => {
                const selected = aiExperience === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.aiOptionCard, selected && s.aiOptionCardSelected]}
                    onPress={() => setAiExperience(opt.value)}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.aiOptionLabel, selected && s.aiOptionLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={s.aiOptionBlurb}>{opt.blurb}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.wizardNextBtn, !canGoNextAiQuiz && { opacity: 0.4 }]}
            onPress={goNextAiQuiz}
            disabled={!canGoNextAiQuiz}
            activeOpacity={0.8}
          >
            <Text style={s.wizardNextBtnText}>
              {aiPhase === 'experience' ? 'Generate my workout' : 'Next'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </LinearGradient>
  );
}
