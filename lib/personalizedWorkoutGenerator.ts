/**
 * Rule-based workout builder: user picks a named split (PPL, Arnold, etc.) and day,
 * then equipment + experience — no guessing from unrelated quiz answers.
 */

export type ProgramStyle = 'full_body' | 'upper_lower' | 'ppl' | 'arnold' | 'bro_split';

/** For `full_body` style, always use `full_body_only` (no separate day). */
export type ProgramDay =
  | 'full_body_only'
  | 'upper' | 'lower'
  | 'push' | 'pull' | 'legs'
  | 'arnold_chest_back' | 'arnold_shoulders_arms' | 'arnold_legs'
  | 'bro_chest' | 'bro_back' | 'bro_shoulders' | 'bro_arms' | 'bro_legs';

export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'full_gym' | 'dumbbells' | 'bodyweight' | 'mixed';

export interface ProgramWorkoutInput {
  programStyle: ProgramStyle;
  programDay: ProgramDay;
  equipment: Equipment;
  experience: Experience;
}

export interface GeneratedExercise {
  name: string;
  default_sets: number;
  default_reps: number;
  order: number;
}

export interface GeneratedTemplate {
  name: string;
  color: string;
  exercises: GeneratedExercise[];
}

/** Pool id inside each equipment map — one list per real-world training day. */
type PoolId =
  | 'fb'
  | 'ul_u'
  | 'ul_l'
  | 'ppl_p'
  | 'ppl_pl'
  | 'ppl_l'
  | 'ar_cb'
  | 'ar_sa'
  | 'ar_l'
  | 'br_ch'
  | 'br_bk'
  | 'br_sh'
  | 'br_ar'
  | 'br_l';

const ACCENTS = ['#845EF7', '#4C91FF', '#20C997', '#CC5DE8', '#FF922B'];

export const PROGRAM_STYLE_META: {
  value: ProgramStyle;
  title: string;
  blurb: string;
}[] = [
  {
    value: 'full_body',
    title: 'Full body',
    blurb: 'Every session hits all major muscles. Simple if you train 2–3 days a week.',
  },
  {
    value: 'upper_lower',
    title: 'Upper / lower',
    blurb: 'Upper-body days and lower-body days. Common 4-day routine: upper, lower, rest, repeat.',
  },
  {
    value: 'ppl',
    title: 'Push, pull, legs (PPL)',
    blurb: 'Push = chest, shoulders, triceps. Pull = back, biceps. Legs = legs & glutes. Often 6 days or 3.',
  },
  {
    value: 'arnold',
    title: 'Arnold split',
    blurb: 'Classic 3-way: chest & back together, then shoulders & arms, then legs.',
  },
  {
    value: 'bro_split',
    title: 'Bro split',
    blurb: 'One main focus per day (chest day, back day, etc.). Popular 5-day gym schedule.',
  },
];

/** UI progress: full body skips the “day” step. */
export type AiQuizPhase = 'style' | 'day' | 'equipment' | 'experience';

export function getAiQuizPhases(style: ProgramStyle | null): AiQuizPhase[] {
  if (!style) return ['style', 'day', 'equipment', 'experience'];
  if (style === 'full_body') return ['style', 'equipment', 'experience'];
  return ['style', 'day', 'equipment', 'experience'];
}

export const EQUIPMENT_PICKS: { label: string; value: Equipment; blurb: string }[] = [
  { label: 'Full gym', value: 'full_gym', blurb: 'Barbells, machines, cables — the works.' },
  { label: 'Home dumbbells', value: 'dumbbells', blurb: 'Adjustable or fixed DBs, bench optional.' },
  { label: 'Bodyweight only', value: 'bodyweight', blurb: 'No equipment (pull-up bar helps if you have one).' },
  { label: 'Mix of gym & home', value: 'mixed', blurb: 'Some barbell / cable days, some dumbbell.' },
];

export const EXPERIENCE_PICKS: { label: string; value: Experience; blurb: string }[] = [
  { label: 'Newer to lifting', value: 'beginner', blurb: '3 sets, slightly higher reps — learn the moves.' },
  { label: 'Been at it a while', value: 'intermediate', blurb: '4 sets, moderate reps — standard hypertrophy.' },
  { label: 'Very experienced', value: 'advanced', blurb: '4 sets, lower reps — heavier, more demanding.' },
];

export const PROGRAM_DAY_OPTIONS: Record<
  ProgramStyle,
  { value: ProgramDay; title: string; blurb: string }[] | null
> = {
  full_body: null,
  upper_lower: [
    {
      value: 'upper',
      title: 'Upper day',
      blurb: 'Chest, back, shoulders, arms — all in one workout.',
    },
    {
      value: 'lower',
      title: 'Lower day',
      blurb: 'Quads, hamstrings, glutes, calves.',
    },
  ],
  ppl: [
    {
      value: 'push',
      title: 'Push day',
      blurb: 'Chest, shoulders, triceps.',
    },
    {
      value: 'pull',
      title: 'Pull day',
      blurb: 'Back and biceps.',
    },
    {
      value: 'legs',
      title: 'Legs day',
      blurb: 'Legs and glutes.',
    },
  ],
  arnold: [
    {
      value: 'arnold_chest_back',
      title: 'Chest & back',
      blurb: 'Heavy upper-body day: pressing and rowing / pulling.',
    },
    {
      value: 'arnold_shoulders_arms',
      title: 'Shoulders & arms',
      blurb: 'Delts, biceps, and triceps.',
    },
    {
      value: 'arnold_legs',
      title: 'Legs',
      blurb: 'Squats, hinges, and leg accessories.',
    },
  ],
  bro_split: [
    {
      value: 'bro_chest',
      title: 'Chest',
      blurb: 'Bench-focused and chest accessories.',
    },
    {
      value: 'bro_back',
      title: 'Back',
      blurb: 'Deadlifts, rows, and vertical pulls.',
    },
    {
      value: 'bro_shoulders',
      title: 'Shoulders',
      blurb: 'Presses and raises for delts.',
    },
    {
      value: 'bro_arms',
      title: 'Arms',
      blurb: 'Biceps and triceps volume.',
    },
    {
      value: 'bro_legs',
      title: 'Legs',
      blurb: 'Quads, hamstrings, glutes, calves.',
    },
  ],
};

function poolIdFor(style: ProgramStyle, day: ProgramDay): PoolId {
  if (style === 'full_body') return 'fb';
  const map: Record<ProgramDay, PoolId | undefined> = {
    full_body_only: 'fb',
    upper: 'ul_u',
    lower: 'ul_l',
    push: 'ppl_p',
    pull: 'ppl_pl',
    legs: 'ppl_l',
    arnold_chest_back: 'ar_cb',
    arnold_shoulders_arms: 'ar_sa',
    arnold_legs: 'ar_l',
    bro_chest: 'br_ch',
    bro_back: 'br_bk',
    bro_shoulders: 'br_sh',
    bro_arms: 'br_ar',
    bro_legs: 'br_l',
  };
  const id = map[day];
  if (!id) return 'fb';
  return id;
}

function displayName(style: ProgramStyle, day: ProgramDay): string {
  if (style === 'full_body') return 'Full body';
  const opt = PROGRAM_DAY_OPTIONS[style]?.find((o) => o.value === day);
  return opt?.title ?? 'Workout';
}

function setsRepsForExperience(exp: Experience): { sets: number; reps: number } {
  switch (exp) {
    case 'beginner':
      return { sets: 3, reps: 12 };
    case 'intermediate':
      return { sets: 4, reps: 10 };
    case 'advanced':
      return { sets: 4, reps: 8 };
    default:
      return { sets: 3, reps: 10 };
  }
}

/** Exercise lists: curated per pool, adapted per equipment tier. */
const POOLS: Record<Equipment, Record<PoolId, string[]>> = {
  full_gym: {
    fb: [
      'Squat',
      'Bench Press',
      'Barbell Row',
      'Overhead Press',
      'Romanian Deadlift',
      'Lat Pulldown',
      'Plank',
    ],
    ul_u: [
      'Bench Press',
      'Incline Bench Press',
      'Barbell Row',
      'Lat Pulldown',
      'Overhead Press',
      'Face Pull',
      'Tricep Pushdown',
      'Dumbbell Curl',
    ],
    ul_l: [
      'Squat',
      'Romanian Deadlift',
      'Leg Press',
      'Leg Extension',
      'Leg Curl',
      'Hip Thrust',
      'Calf Raise',
    ],
    ppl_p: [
      'Bench Press',
      'Incline Dumbbell Press',
      'Overhead Press',
      'Lateral Raise',
      'Cable Fly',
      'Tricep Pushdown',
      'Overhead Tricep Extension',
    ],
    ppl_pl: [
      'Deadlift',
      'Pull-Up',
      'Seated Cable Row',
      'Lat Pulldown',
      'Face Pull',
      'Barbell Curl',
      'Hammer Curl',
    ],
    ppl_l: [
      'Squat',
      'Leg Press',
      'Romanian Deadlift',
      'Leg Extension',
      'Leg Curl',
      'Bulgarian Split Squat',
      'Calf Raise',
    ],
    ar_cb: [
      'Bench Press',
      'Incline Bench Press',
      'Barbell Row',
      'Lat Pulldown',
      'Pull-Up',
      'Chest-Supported Row',
      'Cable Crossover',
    ],
    ar_sa: [
      'Overhead Press',
      'Arnold Press',
      'Lateral Raise',
      'Reverse Fly',
      'Barbell Curl',
      'Tricep Pushdown',
      'Overhead Tricep Extension',
    ],
    ar_l: [
      'Squat',
      'Leg Press',
      'Romanian Deadlift',
      'Leg Extension',
      'Leg Curl',
      'Walking Lunge',
      'Calf Raise',
    ],
    br_ch: [
      'Bench Press',
      'Incline Bench Press',
      'Cable Fly',
      'Chest Dip',
      'Tricep Pushdown',
    ],
    br_bk: [
      'Deadlift',
      'Pull-Up',
      'Barbell Row',
      'Seated Cable Row',
      'Lat Pulldown',
      'Face Pull',
    ],
    br_sh: [
      'Overhead Press',
      'Arnold Press',
      'Lateral Raise',
      'Front Raise',
      'Reverse Fly',
      'Upright Row',
    ],
    br_ar: [
      'Barbell Curl',
      'Preacher Curl',
      'Hammer Curl',
      'Tricep Pushdown',
      'Skull Crusher',
      'Overhead Tricep Extension',
    ],
    br_l: [
      'Squat',
      'Leg Press',
      'Romanian Deadlift',
      'Leg Extension',
      'Leg Curl',
      'Hip Thrust',
      'Calf Raise',
    ],
  },
  dumbbells: {
    fb: [
      'Goblet Squat',
      'Dumbbell Bench Press',
      'Dumbbell Row',
      'Dumbbell Shoulder Press',
      'Romanian Deadlift',
      'Hammer Curl',
      'Plank',
    ],
    ul_u: [
      'Dumbbell Bench Press',
      'Incline Dumbbell Press',
      'Dumbbell Row',
      'Single-Arm Row',
      'Dumbbell Shoulder Press',
      'Lateral Raise',
      'Hammer Curl',
      'Tricep Kickback',
    ],
    ul_l: [
      'Goblet Squat',
      'Romanian Deadlift',
      'Bulgarian Split Squat',
      'Walking Lunge',
      'Step-Up',
      'Glute Bridge',
      'Calf Raise',
    ],
    ppl_p: [
      'Dumbbell Bench Press',
      'Incline Dumbbell Press',
      'Arnold Press',
      'Lateral Raise',
      'Tricep Kickback',
      'Overhead Tricep Extension',
    ],
    ppl_pl: [
      'Romanian Deadlift',
      'Dumbbell Row',
      'Single-Arm Row',
      'Hammer Curl',
      'Concentration Curl',
      'Reverse Fly',
    ],
    ppl_l: [
      'Goblet Squat',
      'Bulgarian Split Squat',
      'Romanian Deadlift',
      'Walking Lunge',
      'Glute Bridge',
      'Calf Raise',
    ],
    ar_cb: [
      'Dumbbell Bench Press',
      'Incline Dumbbell Press',
      'Dumbbell Row',
      'Single-Arm Row',
      'Pull-Up',
      'Chest-Supported Row',
    ],
    ar_sa: [
      'Dumbbell Shoulder Press',
      'Arnold Press',
      'Lateral Raise',
      'Reverse Fly',
      'Hammer Curl',
      'Tricep Kickback',
    ],
    ar_l: [
      'Goblet Squat',
      'Bulgarian Split Squat',
      'Romanian Deadlift',
      'Walking Lunge',
      'Step-Up',
      'Calf Raise',
    ],
    br_ch: [
      'Dumbbell Bench Press',
      'Incline Dumbbell Press',
      'Chest Fly',
      'Tricep Kickback',
    ],
    br_bk: [
      'Romanian Deadlift',
      'Dumbbell Row',
      'Single-Arm Row',
      'Pull-Up',
      'Reverse Fly',
    ],
    br_sh: [
      'Dumbbell Shoulder Press',
      'Arnold Press',
      'Lateral Raise',
      'Front Raise',
      'Reverse Fly',
    ],
    br_ar: [
      'Hammer Curl',
      'Concentration Curl',
      'Tricep Kickback',
      'Overhead Tricep Extension',
    ],
    br_l: [
      'Goblet Squat',
      'Bulgarian Split Squat',
      'Romanian Deadlift',
      'Walking Lunge',
      'Glute Bridge',
      'Calf Raise',
    ],
  },
  bodyweight: {
    fb: [
      'Squat',
      'Push-Up',
      'Inverted Row',
      'Walking Lunge',
      'Pike Push-Up',
      'Plank',
      'Mountain Climber',
    ],
    ul_u: [
      'Push-Up',
      'Pike Push-Up',
      'Inverted Row',
      'Pull-Up',
      'Diamond Push-Up',
      'Plank',
    ],
    ul_l: [
      'Squat',
      'Walking Lunge',
      'Bulgarian Split Squat',
      'Glute Bridge',
      'Calf Raise',
      'Step-Up',
    ],
    ppl_p: ['Push-Up', 'Pike Push-Up', 'Diamond Push-Up', 'Tricep Dip', 'Plank'],
    ppl_pl: ['Inverted Row', 'Pull-Up', 'Chin-Up', 'Plank'],
    ppl_l: ['Squat', 'Walking Lunge', 'Bulgarian Split Squat', 'Glute Bridge', 'Calf Raise'],
    ar_cb: ['Push-Up', 'Inverted Row', 'Pull-Up', 'Chin-Up', 'Diamond Push-Up'],
    ar_sa: ['Pike Push-Up', 'Diamond Push-Up', 'Inverted Row', 'Plank'],
    ar_l: ['Squat', 'Walking Lunge', 'Bulgarian Split Squat', 'Glute Bridge', 'Calf Raise'],
    br_ch: ['Push-Up', 'Diamond Push-Up', 'Pike Push-Up', 'Tricep Dip'],
    br_bk: ['Inverted Row', 'Pull-Up', 'Chin-Up', 'Plank'],
    br_sh: ['Pike Push-Up', 'Diamond Push-Up', 'Inverted Row'],
    br_ar: ['Chin-Up', 'Diamond Push-Up', 'Tricep Dip', 'Plank'],
    br_l: ['Squat', 'Walking Lunge', 'Bulgarian Split Squat', 'Glute Bridge', 'Calf Raise'],
  },
  mixed: {
    fb: [
      'Goblet Squat',
      'Bench Press',
      'Dumbbell Row',
      'Overhead Press',
      'Romanian Deadlift',
      'Lat Pulldown',
      'Plank',
    ],
    ul_u: [
      'Bench Press',
      'Incline Dumbbell Press',
      'Dumbbell Row',
      'Lat Pulldown',
      'Dumbbell Shoulder Press',
      'Face Pull',
      'Tricep Pushdown',
    ],
    ul_l: [
      'Squat',
      'Romanian Deadlift',
      'Leg Press',
      'Bulgarian Split Squat',
      'Leg Curl',
      'Hip Thrust',
      'Calf Raise',
    ],
    ppl_p: [
      'Bench Press',
      'Incline Dumbbell Press',
      'Overhead Press',
      'Lateral Raise',
      'Tricep Pushdown',
      'Cable Fly',
    ],
    ppl_pl: [
      'Deadlift',
      'Pull-Up',
      'Seated Cable Row',
      'Lat Pulldown',
      'Face Pull',
      'Barbell Curl',
    ],
    ppl_l: [
      'Squat',
      'Leg Press',
      'Romanian Deadlift',
      'Leg Extension',
      'Leg Curl',
      'Calf Raise',
    ],
    ar_cb: [
      'Bench Press',
      'Incline Dumbbell Press',
      'Barbell Row',
      'Lat Pulldown',
      'Pull-Up',
      'Cable Fly',
    ],
    ar_sa: [
      'Overhead Press',
      'Arnold Press',
      'Lateral Raise',
      'Face Pull',
      'Tricep Pushdown',
      'Barbell Curl',
    ],
    ar_l: [
      'Squat',
      'Leg Press',
      'Romanian Deadlift',
      'Walking Lunge',
      'Leg Curl',
      'Calf Raise',
    ],
    br_ch: [
      'Bench Press',
      'Incline Dumbbell Press',
      'Cable Fly',
      'Tricep Pushdown',
    ],
    br_bk: [
      'Deadlift',
      'Pull-Up',
      'Barbell Row',
      'Lat Pulldown',
      'Face Pull',
    ],
    br_sh: [
      'Overhead Press',
      'Dumbbell Shoulder Press',
      'Lateral Raise',
      'Reverse Fly',
    ],
    br_ar: [
      'Barbell Curl',
      'Hammer Curl',
      'Tricep Pushdown',
      'Skull Crusher',
    ],
    br_l: [
      'Squat',
      'Leg Press',
      'Romanian Deadlift',
      'Leg Extension',
      'Leg Curl',
      'Calf Raise',
    ],
  },
};

/**
 * Builds a template for the normal workout wizard (step 2+ pre-filled).
 */
export function buildPersonalizedWorkout(input: ProgramWorkoutInput): GeneratedTemplate {
  const pid = poolIdFor(input.programStyle, input.programDay);
  const names = POOLS[input.equipment][pid] ?? POOLS[input.equipment].fb;
  const { sets, reps } = setsRepsForExperience(input.experience);

  const exercises: GeneratedExercise[] = names.map((name, order) => ({
    name,
    default_sets: sets,
    default_reps: reps,
    order,
  }));

  const label = displayName(input.programStyle, input.programDay);
  const STYLE_TAG: Record<ProgramStyle, string> = {
    full_body: '',
    upper_lower: 'Upper / Lower',
    ppl: 'PPL',
    arnold: 'Arnold',
    bro_split: 'Bro split',
  };
  const tag = STYLE_TAG[input.programStyle];
  const name =
    input.programStyle === 'full_body'
      ? 'Full body'
      : tag
        ? `${label} (${tag})`
        : label;

  const colorIdx =
    (pid.length + input.equipment.length + input.experience.length) % ACCENTS.length;

  return {
    name,
    color: ACCENTS[colorIdx]!,
    exercises,
  };
}
