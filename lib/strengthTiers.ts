import type { MuscleSlug } from './modelViewerHtml';
import type { PersonalRecord } from '@/types/database';

export interface StrengthTier {
  rank: number;
  name: string;
  hex: string;
  modelColor: [number, number, number, number];
  emissive: [number, number, number];
}

export const STRENGTH_TIERS: StrengthTier[] = [
  {
    rank: 0,
    name: 'Untrained',
    hex: '#4A4A4A',
    modelColor: [0.22, 0.22, 0.22, 1.0],
    emissive: [0.0, 0.0, 0.0],
  },
  {
    rank: 1,
    name: 'Iron',
    hex: '#8B7355',
    modelColor: [0.45, 0.30, 0.18, 1.0],
    emissive: [0.12, 0.07, 0.02],
  },
  {
    rank: 2,
    name: 'Bronze',
    hex: '#CD7F32',
    modelColor: [0.72, 0.42, 0.12, 1.0],
    emissive: [0.2, 0.1, 0.02],
  },
  {
    rank: 3,
    name: 'Silver',
    hex: '#A8B4C2',
    modelColor: [0.38, 0.44, 0.55, 1.0],
    emissive: [0.08, 0.10, 0.18],
  },
  {
    rank: 4,
    name: 'Gold',
    hex: '#FFD700',
    modelColor: [0.85, 0.65, 0.0, 1.0],
    emissive: [0.35, 0.25, 0.0],
  },
  {
    rank: 5,
    name: 'Platinum',
    hex: '#7BA7D4',
    modelColor: [0.25, 0.45, 0.7, 1.0],
    emissive: [0.1, 0.2, 0.4],
  },
  {
    rank: 6,
    name: 'Diamond',
    hex: '#00CFFF',
    modelColor: [0.0, 0.7, 0.9, 1.0],
    emissive: [0.0, 0.5, 0.7],
  },
  {
    rank: 7,
    name: 'Elite',
    hex: '#9B30FF',
    modelColor: [0.55, 0.12, 0.95, 1.0],
    emissive: [0.4, 0.08, 0.7],
  },
];

// Index 0 = Iron threshold, index 6 = Elite threshold.
const MUSCLE_THRESHOLDS: Record<MuscleSlug, number[]> = {
  abs:        [15,  25,  35,  50,  65,  80, 100],
  biceps:     [25,  40,  55,  70,  85, 100, 115],
  calves:     [45,  90, 135, 185, 225, 275, 315],
  chest:      [65,  95, 135, 185, 225, 275, 315],
  forearms:   [15,  25,  35,  50,  65,  80,  95],
  glutes:     [65,  95, 135, 185, 225, 315, 405],
  lower_back: [95, 135, 185, 225, 315, 405, 495],
  obliques:   [10,  20,  30,  40,  50,  65,  80],
  quads:      [65,  95, 135, 185, 225, 315, 405],
  shoulders:  [45,  65,  85, 115, 135, 165, 185],
  triceps:    [35,  55,  75,  95, 115, 135, 155],
  upper_back: [45,  65,  95, 135, 165, 195, 225],
};

const EXERCISE_MUSCLE_MAP: [string, MuscleSlug][] = [
  // Chest
  ['bench press', 'chest'],
  ['bench', 'chest'],
  ['chest press', 'chest'],
  ['chest fly', 'chest'],
  ['chest flye', 'chest'],
  ['push up', 'chest'],
  ['pushup', 'chest'],
  ['push-up', 'chest'],
  ['pec deck', 'chest'],
  ['pec fly', 'chest'],
  ['dumbbell fly', 'chest'],
  ['dumbbell flye', 'chest'],
  ['cable fly', 'chest'],
  ['cable flye', 'chest'],
  ['incline press', 'chest'],
  ['decline press', 'chest'],

  // Upper Back (before shoulders so "row" patterns match here first)
  ['bent-over row', 'upper_back'],
  ['bent over row', 'upper_back'],
  ['barbell row', 'upper_back'],
  ['cable row', 'upper_back'],
  ['seated row', 'upper_back'],
  ['t-bar row', 'upper_back'],
  ['t bar row', 'upper_back'],
  ['pendlay row', 'upper_back'],
  ['pull up', 'upper_back'],
  ['pullup', 'upper_back'],
  ['pull-up', 'upper_back'],
  ['chin up', 'upper_back'],
  ['chinup', 'upper_back'],
  ['chin-up', 'upper_back'],
  ['lat pulldown', 'upper_back'],
  ['lat pull', 'upper_back'],

  // Shoulders
  ['overhead press', 'shoulders'],
  ['ohp', 'shoulders'],
  ['military press', 'shoulders'],
  ['shoulder press', 'shoulders'],
  ['arnold press', 'shoulders'],
  ['lateral raise', 'shoulders'],
  ['front raise', 'shoulders'],
  ['rear delt', 'shoulders'],
  ['face pull', 'shoulders'],
  ['upright row', 'shoulders'],
  ['delt fly', 'shoulders'],
  ['delt flye', 'shoulders'],
  ['shoulder', 'shoulders'],

  // Triceps (before biceps so "tricep curl" doesn't match biceps first)
  ['tricep', 'triceps'],
  ['skull crush', 'triceps'],
  ['pushdown', 'triceps'],
  ['push down', 'triceps'],
  ['close grip', 'triceps'],
  ['close-grip', 'triceps'],
  ['kickback', 'triceps'],
  ['dip', 'triceps'],

  // Biceps
  ['curl', 'biceps'],
  ['bicep', 'biceps'],
  ['preacher', 'biceps'],
  ['hammer', 'biceps'],
  ['concentration', 'biceps'],

  // Forearms
  ['wrist curl', 'forearms'],
  ['wrist', 'forearms'],
  ['forearm', 'forearms'],
  ['grip strength', 'forearms'],
  ['farmer', 'forearms'],

  // Abs
  ['plank', 'abs'],
  ['crunch', 'abs'],
  ['sit up', 'abs'],
  ['situp', 'abs'],
  ['sit-up', 'abs'],
  ['leg raise', 'abs'],
  ['hanging raise', 'abs'],
  ['ab wheel', 'abs'],
  ['ab rollout', 'abs'],

  // Obliques
  ['russian twist', 'obliques'],
  ['oblique', 'obliques'],
  ['woodchop', 'obliques'],
  ['wood chop', 'obliques'],
  ['side bend', 'obliques'],
  ['pallof', 'obliques'],

  // Quads
  ['squat', 'quads'],
  ['back squat', 'quads'],
  ['front squat', 'quads'],
  ['leg press', 'quads'],
  ['leg extension', 'quads'],
  ['lunge', 'quads'],
  ['split squat', 'quads'],
  ['goblet squat', 'quads'],

  // Glutes
  ['hip thrust', 'glutes'],
  ['glute bridge', 'glutes'],
  ['glute', 'glutes'],
  ['hip abduct', 'glutes'],
  ['kickback', 'glutes'],

  // Calves
  ['calf raise', 'calves'],
  ['calf', 'calves'],
  ['standing calf', 'calves'],
  ['seated calf', 'calves'],

  // Lower Back
  ['deadlift', 'lower_back'],
  ['good morning', 'lower_back'],
  ['back extension', 'lower_back'],
  ['hyperextension', 'lower_back'],
  ['reverse hyper', 'lower_back'],
  ['rack pull', 'lower_back'],
];

export function exerciseToMuscle(exerciseName: string): MuscleSlug | null {
  const lower = exerciseName.toLowerCase();
  for (const [pattern, slug] of EXERCISE_MUSCLE_MAP) {
    if (lower.includes(pattern)) return slug;
  }
  return null;
}

export interface MuscleTierInfo {
  tier: StrengthTier;
  bestWeight: number;
  bestExercise: string | null;
  nextTier: StrengthTier | null;
  nextThreshold: number | null;
  progressToNext: number;
}

export function getMuscleTier(
  muscle: MuscleSlug,
  prs: PersonalRecord[],
): MuscleTierInfo {
  const thresholds = MUSCLE_THRESHOLDS[muscle];
  let bestWeight = 0;
  let bestExercise: string | null = null;

  for (const pr of prs) {
    if (exerciseToMuscle(pr.exercise_name) === muscle) {
      const w = typeof pr.weight === 'string' ? parseFloat(pr.weight) : pr.weight;
      if (w > bestWeight) {
        bestWeight = w;
        bestExercise = pr.exercise_name;
      }
    }
  }

  if (bestWeight === 0) {
    return {
      tier: STRENGTH_TIERS[0],
      bestWeight: 0,
      bestExercise: null,
      nextTier: STRENGTH_TIERS[1],
      nextThreshold: thresholds[0],
      progressToNext: 0,
    };
  }

  let tierIndex = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (bestWeight >= thresholds[i]) {
      tierIndex = i + 1;
    }
  }

  const tier = STRENGTH_TIERS[tierIndex];
  const isMaxTier = tierIndex >= STRENGTH_TIERS.length - 1;
  const nextTier = isMaxTier ? null : STRENGTH_TIERS[tierIndex + 1];
  const nextThreshold = isMaxTier ? null : thresholds[tierIndex];

  let progressToNext = 1;
  if (!isMaxTier && nextThreshold !== null) {
    const prevThreshold = tierIndex > 0 ? thresholds[tierIndex - 1] : 0;
    const range = nextThreshold - prevThreshold;
    progressToNext = range > 0 ? Math.min(1, (bestWeight - prevThreshold) / range) : 1;
  }

  return {
    tier,
    bestWeight,
    bestExercise,
    nextTier,
    nextThreshold,
    progressToNext,
  };
}

export type AllMuscleTiers = Record<MuscleSlug, MuscleTierInfo>;

export function getAllMuscleTiers(prs: PersonalRecord[]): AllMuscleTiers {
  return {
    abs: getMuscleTier('abs', prs),
    biceps: getMuscleTier('biceps', prs),
    calves: getMuscleTier('calves', prs),
    chest: getMuscleTier('chest', prs),
    forearms: getMuscleTier('forearms', prs),
    glutes: getMuscleTier('glutes', prs),
    lower_back: getMuscleTier('lower_back', prs),
    obliques: getMuscleTier('obliques', prs),
    quads: getMuscleTier('quads', prs),
    shoulders: getMuscleTier('shoulders', prs),
    triceps: getMuscleTier('triceps', prs),
    upper_back: getMuscleTier('upper_back', prs),
  };
}

export function getOverallTier(tiers: AllMuscleTiers): StrengthTier {
  const slugs = Object.keys(tiers) as MuscleSlug[];
  const avg = slugs.reduce((sum, s) => sum + tiers[s].tier.rank, 0) / slugs.length;
  const rounded = Math.round(avg);
  return STRENGTH_TIERS[Math.min(rounded, STRENGTH_TIERS.length - 1)];
}

export function buildTierColorMap(
  tiers: AllMuscleTiers,
): Record<string, { r: number; g: number; b: number; a: number; er: number; eg: number; eb: number }> {
  const map: Record<string, { r: number; g: number; b: number; a: number; er: number; eg: number; eb: number }> = {};
  for (const slug of Object.keys(tiers) as MuscleSlug[]) {
    const { tier } = tiers[slug];
    const [r, g, b, a] = tier.modelColor;
    const [er, eg, eb] = tier.emissive;
    map[slug] = { r, g, b, a, er, eg, eb };
  }
  return map;
}
