import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Check, Trophy } from 'lucide-react-native';
import type { TemplateExercise } from '@/lib/workoutCreateDraft';
import { wizardStyles as s } from '@/components/workout-create/wizardStyles';

type PersonalRecord = { weight: number; reps: number };

type Props = {
  exercises: TemplateExercise[];
  wizardPRs: Record<string, { weight: string; reps: string }>;
  prs: Record<string, PersonalRecord>;
  saving: boolean;
  editing: boolean;
  onPRChange: (name: string, field: 'weight' | 'reps', value: string) => void;
  onBack: () => void;
  onSave: () => void;
  footerPad: number;
  formatPRDisplay: (pr: PersonalRecord) => string;
};

export function WizardStepPRs({
  exercises,
  wizardPRs,
  prs,
  saving,
  editing,
  onPRChange,
  onBack,
  onSave,
  footerPad,
  formatPRDisplay,
}: Props) {
  return (
    <KeyboardAvoidingView
      style={s.stepBody}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.wizardQuestion}>Set your personal records</Text>
        <Text style={s.wizardSubtext}>Optional — track your best lifts for each exercise</Text>

        {exercises.map((ex, idx) => {
          const currentPR = prs[ex.name];
          const prEntry = wizardPRs[ex.name] || { weight: '', reps: '' };
          return (
            <View key={idx} style={s.wizardPRRow}>
              <View style={s.wizardPRHeader}>
                <View style={s.wizardExNumber}>
                  <Text style={s.wizardExNumberText}>{idx + 1}</Text>
                </View>
                <Text style={s.wizardPRName}>{ex.name}</Text>
                {currentPR ? (
                  <View style={s.wizardPRBadge}>
                    <Trophy color="#FFB547" size={12} />
                    <Text style={s.wizardPRBadgeText}>{formatPRDisplay(currentPR)}</Text>
                  </View>
                ) : null}
              </View>
              <View style={s.wizardPRInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={s.wizardPRInputLabel}>Weight (lbs)</Text>
                  <TextInput
                    style={s.wizardPRInput}
                    placeholder={currentPR ? String(currentPR.weight) : '0'}
                    placeholderTextColor="#555"
                    value={prEntry.weight}
                    onChangeText={(t) => onPRChange(ex.name, 'weight', t)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.wizardPRInputLabel}>Reps</Text>
                  <TextInput
                    style={s.wizardPRInput}
                    placeholder={String(ex.default_reps)}
                    placeholderTextColor="#555"
                    value={prEntry.reps}
                    onChangeText={(t) => onPRChange(ex.name, 'reps', t)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[s.fixedFooter, { paddingBottom: footerPad }]}>
        <View style={s.wizardBtnRow}>
          <TouchableOpacity style={s.wizardBackBtn} onPress={onBack}>
            <Text style={s.wizardBackBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.wizardCreateBtn, { flex: 1 }]}
            onPress={onSave}
            activeOpacity={0.8}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Check color="#FFFFFF" size={20} />
                <Text style={s.wizardNextBtnText}>
                  {editing ? 'Save Changes' : 'Create Workout'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
