import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { apiUpdateProfile } from '@/lib/api';
import { markPostOnboardingPaywallPending } from '@/lib/postRegisterFlow';
import { Target, TrendingUp, Dumbbell, Activity } from 'lucide-react-native';

const { width } = Dimensions.get('window');

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
  { id: 1, label: '1-2 days/week' },
  { id: 3, label: '3-4 days/week' },
  { id: 5, label: '5+ days/week' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedExperience, setSelectedExperience] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState(0);
  const [loading, setLoading] = useState(false);

  const progress = useRef(new Animated.Value((1 / 3) * 100)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: (step / 3) * 100,
      damping: 15,
      stiffness: 100,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await apiUpdateProfile({
        goal: selectedGoal,
        experience_level: selectedExperience,
        workout_frequency: selectedFrequency,
      });

      if (error) throw new Error(error.detail || 'Failed to update profile');

      await refreshProfile();
      await markPostOnboardingPaywallPending();
      router.replace('/paywall');
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    if (step === 1) return selectedGoal !== '';
    if (step === 2) return selectedExperience !== '';
    if (step === 3) return selectedFrequency > 0;
    return false;
  };

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressContainer}>
          <AppLogo size={40} containerStyle={styles.onboardingLogo} />
          <Text style={styles.stepText}>Step {step} of 3</Text>
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
            <Text style={styles.title}>What's your goal?</Text>
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

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Experience level?</Text>
            <Text style={styles.subtitle}>
              Tell us about your fitness background
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

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Workout frequency?</Text>
            <Text style={styles.subtitle}>
              How often do you plan to work out?
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

        <View style={styles.buttonContainer}>
          <Button
            title={step === 3 ? 'Complete' : 'Next'}
            onPress={handleNext}
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
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#999999',
    fontSize: 16,
    marginBottom: 32,
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
  buttonContainer: {
    gap: 12,
  },
});
