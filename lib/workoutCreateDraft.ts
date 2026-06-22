export interface TemplateExercise {
  id?: string;
  name: string;
  default_sets: number;
  default_reps: number;
  order: number;
}

export interface WorkoutCreateDraft {
  name?: string;
  color?: string;
  exercises?: TemplateExercise[];
  startStep?: number;
  editingTemplateId?: string;
}

let pendingDraft: WorkoutCreateDraft | null = null;

export function setWorkoutCreateDraft(draft: WorkoutCreateDraft): void {
  pendingDraft = draft;
}

export function consumeWorkoutCreateDraft(): WorkoutCreateDraft | null {
  const draft = pendingDraft;
  pendingDraft = null;
  return draft;
}
