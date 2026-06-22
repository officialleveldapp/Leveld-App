import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AiWorkoutQuiz } from '@/components/workout-create/AiWorkoutQuiz';
import { WorkoutCreateWizard } from '@/components/workout-create/WorkoutCreateWizard';
import {
  consumeWorkoutCreateDraft,
  type WorkoutCreateDraft,
} from '@/lib/workoutCreateDraft';

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; templateId?: string }>();

  const [draft, setDraft] = useState<WorkoutCreateDraft | null>(() => consumeWorkoutCreateDraft());
  const [phase, setPhase] = useState<'ai' | 'wizard'>(() =>
    params.mode === 'ai' && !draft ? 'ai' : 'wizard',
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/track');
    }
  };

  if (phase === 'ai') {
    return (
      <AiWorkoutQuiz
        onComplete={(generated) => {
          setDraft(generated);
          setPhase('wizard');
        }}
        onCancel={goBack}
      />
    );
  }

  return (
    <WorkoutCreateWizard
      initialDraft={draft}
      templateId={params.templateId}
      onDone={goBack}
      onCancel={goBack}
    />
  );
}
