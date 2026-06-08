import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { apiUpdateProfile } from '@/lib/api';
import { markPostOnboardingPaywallPending } from '@/lib/postRegisterFlow';
import { Target, TrendingUp, Dumbbell, Activity } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const TOTAL_STEPS = 7;

const goals = [
  { id: 'strength', label: 'Strength', icon: Dumbbell },
  { id: 'endurance', label: 'Endurance', icon: Activity },
  { id: 'weight_loss', label: 'Weight Loss', icon: TrendingUp },
  { id: 'general', label: 'General Fitness', icon: Target },
];

const experienceLevels = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const workoutFrequencies = [
  { id: 1, label: '1–2 days/week' },
  { id: 3, label: '3–4 days/week' },
  { id: 5, label: '5+ days/week' },
];

const trainingEnvironments = [
  { id: 'home', label: 'Home gym' },
  { id: 'gym', label: 'Commercial gym' },
  { id: 'both', label: 'Both' },
];

const sessionLengths = [
  { id: 30, label: '~30 min' },
  { id: 45, label: '~45 min' },
  { id: 60, label: '60+ min' },
];

const GOAL_LABEL: Record<string, string> = Object.fromEntries(
  goals.map((g) => [g.id, g.label]),
);
const EXP_LABEL: Record<string, string> = Object.fromEntries(
  experienceLevels.map((e) => [e.id, e.label]),
);
const ENV_LABEL: Record<string, string> = Object.fromEntries(
  trainingEnvironments.map((e) => [e.id, e.label]),
);

function formatHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const inch = Math.round(inches % 12);
  return `${ft}'${inch}"`;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [weightLbs, setWeightLbs] = useState(180);
  const [heightIn, setHeightIn] = useState(70);
  const [benchLbs, setBenchLbs] = useState(135);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedExperience, setSelectedExperience] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState(0);
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState(45);
  const [loading, setLoading] = useState(false);

  const progress = useRef(new Animated.Value((1 / TOTAL_STEPS) * 100)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: (step / TOTAL_STEPS) * 100,
      damping: 15,
      stiffness: 100,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const previewSummary = useMemo(() => {
    const freqLabel =
      workoutFrequencies.find((f) => f.id === selectedFrequency)?.label ?? '';
    return {
      body: `${Math.round(weightLbs)} lb · ${formatHeight(heightIn)}`,
      bench: `${Math.round(benchLbs)} lb bench (starting point)`,
      goal: GOAL_LABEL[selectedGoal] ?? selectedGoal,
      experience: EXP_LABEL[selectedExperience] ?? selectedExperience,
      frequency: freqLabel,
      place:
        ENV_LABEL[selectedEnvironment] ??
        trainingEnvironments.find((e) => e.id === selectedEnvironment)?.label ??
        '',
      session: `~${sessionMinutes} min sessions`,
    };
  }, [
    weightLbs,
    heightIn,
    benchLbs,
    selectedGoal,
    selectedExperience,
    selectedFrequency,
    selectedEnvironment,
    sessionMinutes,
  ]);

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await apiUpdateProfile({
        onboarding_completed: true,
        body_weight_lbs: Math.round(weightLbs),
        height_inches: Math.round(heightIn),
        starting_bench_lbs: Math.round(benchLbs),
        goal: selectedGoal,
        experience_level: selectedExperience,
        workout_frequency: selectedFrequency,
        training_environment: selectedEnvironment,
        session_length_minutes: sessionMinutes,
      });

      if (error) throw new Error(error.detail || 'Failed to update profile');

      await refreshProfile();
      await markPostOnboardingPaywallPending();
      router.replace({
        pathname: '/paywall',
        params: { source: 'onboarding' },
      });
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const isStepValid = () => {
    if (step === 1) return true;
    if (step === 2) return true;
    if (step === 3) return selectedGoal !== '';
    if (step === 4) return selectedExperience !== '';
    if (step === 5) return selectedFrequency > 0;
    if (step === 6) return selectedEnvironment !== '';
    if (step === 7) return true;
    return false;
  };

  const primaryLabel = step === TOTAL_STEPS ? 'Continue' : 'Next';

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressContainer}>
          <AppLogo size={40} containerStyle={styles.onboardingLogo} />
          <Text style={styles.stepText}>
            Step {step} of {TOTAL_STEPS}
          </Text>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
              <LinearGradient
                colors={['#4C91FF', '#FFB547']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
              />
            </Animated.View>
          </View>
        </View>

        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Your starting point</Text>
            <Text style={styles.subtitle}>
              Baseline stats help us personalize progress — not judgments, just
              data.
            </Text>

            <Text style={styles.metricLabel}>Body weight</Text>
            <Text style={styles.metricValue}>{Math.round(weightLbs)} lb</Text>
            <Slider
              style={styles.slider}
              minimumValue={90}
              maximumValue={400}
              step={1}
              value={weightLbs}
              onValueChange={setWeightLbs}
              minimumTrackTintColor="#4C91FF"
              maximumTrackTintColor="#2A2A2A"
              thumbTintColor="#FFB547"
            />

            <Text style={[styles.metricLabel, styles.metricLabelSpaced]}>
              Height
            </Text>
            <Text style={styles.metricValue}>
              {formatHeight(heightIn)}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={54}
              maximumValue={84}
              step={1}
              value={heightIn}
              onValueChange={setHeightIn}
              minimumTrackTintColor="#4C91FF"
              maximumTrackTintColor="#2A2A2A"
              thumbTintColor="#FFB547"
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Bench press baseline</Text>
            <Text style={styles.subtitle}>
              Best single rep you could do today with good form (approximate is
              fine).
            </Text>
            <Text style={styles.metricValueLarge}>{Math.round(benchLbs)} lb</Text>
            <Slider
              style={styles.slider}
              minimumValue={45}
              maximumValue={405}
              step={5}
              value={benchLbs}
              onValueChange={setBenchLbs}
              minimumTrackTintColor="#4C91FF"
              maximumTrackTintColor="#2A2A2A"
              thumbTintColor="#FFB547"
            />
            <Text style={styles.hintMuted}>
              This anchors strength progress — you can update it anytime in the
              app.
            </Text>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>What&apos;s your goal?</Text>
            <Text style={styles.subtitle}>
              Choose your primary fitness objective
            </Text>
            <View style={styles.optionsGrid}>
              {goals.map((goal) => {
                const IconComponent = goal.icon;
                const isSelected = selectedGoal === goal.id;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    onPress={() => setSelectedGoal(goal.id)}
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                    ]}
                  >
                    <IconComponent
                      color={isSelected ? '#4C91FF' : '#999999'}
                      size={32}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {goal.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Experience level</Text>
            <Text style={styles.subtitle}>
              Tell us about your training background
            </Text>
            <View style={styles.optionsList}>
              {experienceLevels.map((level) => {
                const isSelected = selectedExperience === level.id;
                return (
                  <TouchableOpacity
                    key={level.id}
                    onPress={() => setSelectedExperience(level.id)}
                    style={[
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionRowText,
                        isSelected && styles.optionRowTextSelected,
                      ]}
                    >
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {step === 5 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>How often will you train?</Text>
            <Text style={styles.subtitle}>
              Realistic weekly frequency keeps plans sustainable
            </Text>
            <View style={styles.optionsList}>
              {workoutFrequencies.map((freq) => {
                const isSelected = selectedFrequency === freq.id;
                return (
                  <TouchableOpacity
                    key={freq.id}
                    onPress={() => setSelectedFrequency(freq.id)}
                    style={[
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionRowText,
                        isSelected && styles.optionRowTextSelected,
                      ]}
                    >
                      {freq.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {step === 6 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Where do you train?</Text>
            <Text style={styles.subtitle}>
              We&apos;ll tailor exercises to your setup
            </Text>
            <View style={styles.optionsList}>
              {trainingEnvironments.map((env) => {
                const isSelected = selectedEnvironment === env.id;
                return (
                  <TouchableOpacity
                    key={env.id}
                    onPress={() => setSelectedEnvironment(env.id)}
                    style={[
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionRowText,
                        isSelected && styles.optionRowTextSelected,
                      ]}
                    >
                      {env.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, styles.sessionLabel]}>
              Typical session length
            </Text>
            <View style={styles.sessionRow}>
              {sessionLengths.map((s) => {
                const isSelected = sessionMinutes === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setSessionMinutes(s.id)}
                    style={[
                      styles.sessionChip,
                      isSelected && styles.sessionChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sessionChipText,
                        isSelected && styles.sessionChipTextSelected,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {step === 7 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>You&apos;re all set</Text>
            <Text style={styles.subtitle}>
              Here&apos;s your profile summary. Leveld Pro unlocks the full workout
              library, 3D body graphics, and other premium features.
            </Text>

            <View style={styles.summaryCard}>
              <SummaryRow label="Baseline" value={previewSummary.body} />
              <SummaryRow label="Strength" value={previewSummary.bench} />
              <SummaryRow label="Goal" value={previewSummary.goal} />
              <SummaryRow label="Experience" value={previewSummary.experience} />
              <SummaryRow label="Frequency" value={previewSummary.frequency} />
              <SummaryRow label="Gym" value={previewSummary.place} />
              <SummaryRow label="Sessions" value={previewSummary.session} />
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button
            title={primaryLabel}
            onPress={step === TOTAL_STEPS ? handleComplete : handleNext}
            disabled={!isStepValid()}
            loading={loading}
          />
          {step > 1 && (
            <Button
              title="Back"
              variant="outline"
              onPress={() => setStep(step - 1)}
            />
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  progressContainer: {
    marginBottom: 40,
  },
  onboardingLogo: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  stepText: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  gradient: {
    flex: 1,
  },
  stepContainer: {
    marginBottom: 40,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#999999',
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  metricLabel: {
    color: '#AAAAAA',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricLabelSpaced: {
    marginTop: 20,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  metricValueLarge: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 44,
  },
  hintMuted: {
    color: '#666666',
    fontSize: 13,
    marginTop: 16,
    lineHeight: 18,
  },
  sectionLabel: {
    color: '#AAAAAA',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionLabel: {
    marginTop: 28,
    marginBottom: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sessionChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  sessionChipSelected: {
    borderColor: '#4C91FF',
    backgroundColor: '#1E2A3A',
  },
  sessionChipText: {
    color: '#999999',
    fontSize: 15,
    fontWeight: '600',
  },
  sessionChipTextSelected: {
    color: '#4C91FF',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  optionCardSelected: {
    borderColor: '#4C91FF',
    backgroundColor: '#1E2A3A',
  },
  optionText: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#4C91FF',
  },
  optionsList: {
    gap: 12,
  },
  optionRow: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  optionRowSelected: {
    borderColor: '#4C91FF',
    backgroundColor: '#1E2A3A',
  },
  optionRowText: {
    color: '#999999',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionRowTextSelected: {
    color: '#4C91FF',
  },
  summaryCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2F2F2F',
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  summaryLabel: {
    color: '#777777',
    fontSize: 13,
    fontWeight: '600',
    width: 96,
  },
  summaryValue: {
    flex: 1,
    color: '#EEEEEE',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  buttonContainer: {
    gap: 12,
  },
});
