import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Plus, X, Dumbbell } from 'lucide-react-native';
import type { TemplateExercise } from '@/lib/workoutCreateDraft';
import { ExercisePickerModal } from '@/components/workout-create/ExercisePickerModal';
import { wizardStyles as s } from '@/components/workout-create/wizardStyles';

type Props = {
  exercises: TemplateExercise[];
  onChange: (exercises: TemplateExercise[]) => void;
  onBack: () => void;
  onNext: () => void;
  footerPad: number;
};

export function WizardStepExercises({
  exercises,
  onChange,
  onBack,
  onNext,
  footerPad,
}: Props) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const addedNames = useMemo(
    () => new Set(exercises.map((e) => e.name.toLowerCase())),
    [exercises],
  );

  const canGoNext = exercises.length > 0;

  const addExercise = (name: string) => {
    if (addedNames.has(name.toLowerCase())) return;
    onChange([
      ...exercises,
      {
        name,
        default_sets: 3,
        default_reps: 10,
        order: exercises.length,
      },
    ]);
  };

  const removeExercise = (idx: number) => {
    onChange(exercises.filter((_, i) => i !== idx));
  };

  const updateExercise = (idx: number, patch: Partial<TemplateExercise>) => {
    const updated = [...exercises];
    updated[idx] = { ...updated[idx], ...patch };
    onChange(updated);
  };

  const renderExercise = ({ item: ex, index: idx }: { item: TemplateExercise; index: number }) => (
    <View style={s.wizardExRow}>
      <View style={s.wizardExTopRow}>
        <View style={s.wizardExNumber}>
          <Text style={s.wizardExNumberText}>{idx + 1}</Text>
        </View>
        <Text style={s.wizardExName} numberOfLines={1}>
          {ex.name}
        </Text>
        <TouchableOpacity onPress={() => removeExercise(idx)} style={s.wizardExRemove}>
          <X color="#FF4C4C" size={16} />
        </TouchableOpacity>
      </View>
      <View style={s.wizardExControls}>
        <View style={s.wizardStepperGroup}>
          <Text style={s.wizardStepperLabel}>Sets</Text>
          <View style={s.wizardStepper}>
            <TouchableOpacity
              onPress={() =>
                updateExercise(idx, { default_sets: Math.max(1, ex.default_sets - 1) })
              }
              style={s.wizardStepperBtn}
            >
              <Text style={s.wizardStepperBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={s.wizardStepperValue}>{ex.default_sets}</Text>
            <TouchableOpacity
              onPress={() => updateExercise(idx, { default_sets: ex.default_sets + 1 })}
              style={s.wizardStepperBtn}
            >
              <Text style={s.wizardStepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={s.wizardStepperX}>×</Text>
        <View style={s.wizardStepperGroup}>
          <Text style={s.wizardStepperLabel}>Reps</Text>
          <View style={s.wizardStepper}>
            <TouchableOpacity
              onPress={() =>
                updateExercise(idx, { default_reps: Math.max(1, ex.default_reps - 1) })
              }
              style={s.wizardStepperBtn}
            >
              <Text style={s.wizardStepperBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={s.wizardStepperValue}>{ex.default_reps}</Text>
            <TouchableOpacity
              onPress={() => updateExercise(idx, { default_reps: ex.default_reps + 1 })}
              style={s.wizardStepperBtn}
            >
              <Text style={s.wizardStepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={s.stepBody}>
      <FlatList
        data={exercises}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={renderExercise}
        contentContainerStyle={[s.scrollContent, exercises.length === 0 && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Text style={s.wizardQuestion}>Add exercises to your workout</Text>
        }
        ListEmptyComponent={
          <TouchableOpacity style={s.emptyState} onPress={() => setPickerVisible(true)} activeOpacity={0.8}>
            <Dumbbell color="#4C91FF" size={32} />
            <Text style={s.emptyStateText}>Tap to add your first exercise</Text>
          </TouchableOpacity>
        }
      />

      <View style={[s.fixedFooter, { paddingBottom: footerPad }]}>
        <TouchableOpacity
          style={s.addExerciseBtn}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.8}
        >
          <Plus color="#4C91FF" size={20} />
          <Text style={s.addExerciseBtnText}>Add exercise</Text>
        </TouchableOpacity>

        <View style={s.wizardBtnRow}>
          <TouchableOpacity style={s.wizardBackBtn} onPress={onBack}>
            <Text style={s.wizardBackBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.wizardNextBtn, { flex: 1 }, !canGoNext && { opacity: 0.4 }]}
            onPress={() => canGoNext && onNext()}
            disabled={!canGoNext}
            activeOpacity={0.8}
          >
            <Text style={s.wizardNextBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ExercisePickerModal
        visible={pickerVisible}
        addedNames={addedNames}
        onAdd={addExercise}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}
