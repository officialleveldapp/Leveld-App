export const TEMPLATE_COLORS = [
  '#4C91FF', '#FF6B6B', '#51CF66', '#FFB547',
  '#CC5DE8', '#FF922B', '#20C997', '#845EF7',
];

export const WORKOUT_NAME_SUGGESTIONS = [
  'Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body',
  'Full Body', 'Chest & Triceps', 'Back & Biceps', 'Shoulders & Arms',
  'Arms Day', 'Cardio', 'HIIT', 'Core & Abs',
];

export const COMMON_EXERCISES: { category: string; exercises: string[] }[] = [
  {
    category: 'Chest',
    exercises: [
      'Bench Press', 'Incline Bench Press', 'Decline Bench Press',
      'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Dumbbell Fly',
      'Incline Dumbbell Fly', 'Cable Fly', 'Cable Crossover',
      'Machine Chest Press', 'Pec Deck', 'Push-Up',
      'Chest Dip', 'Landmine Press', 'Floor Press',
    ],
  },
  {
    category: 'Back',
    exercises: [
      'Deadlift', 'Pull-Up', 'Chin-Up', 'Lat Pulldown',
      'Barbell Row', 'Dumbbell Row', 'Seated Cable Row',
      'T-Bar Row', 'Pendlay Row', 'Machine Row',
      'Face Pull', 'Straight-Arm Pulldown', 'Rack Pull',
      'Meadows Row', 'Chest-Supported Row', 'Inverted Row',
      'Cable Pullover', 'Single-Arm Lat Pulldown',
    ],
  },
  {
    category: 'Shoulders',
    exercises: [
      'Overhead Press', 'Military Press', 'Dumbbell Shoulder Press',
      'Arnold Press', 'Lateral Raise', 'Front Raise',
      'Reverse Fly', 'Cable Lateral Raise', 'Upright Row',
      'Machine Shoulder Press', 'Behind-the-Neck Press',
      'Lu Raise', 'Shrug', 'Barbell Shrug', 'Dumbbell Shrug',
      'Face Pull', 'Cable Front Raise', 'Plate Front Raise',
    ],
  },
  {
    category: 'Biceps',
    exercises: [
      'Barbell Curl', 'Dumbbell Curl', 'Hammer Curl',
      'Preacher Curl', 'Incline Dumbbell Curl', 'Concentration Curl',
      'Cable Curl', 'EZ-Bar Curl', 'Spider Curl',
      'Reverse Curl', 'Bayesian Curl', 'Drag Curl',
      'Machine Curl', '21s',
    ],
  },
  {
    category: 'Triceps',
    exercises: [
      'Tricep Pushdown', 'Overhead Tricep Extension',
      'Skull Crusher', 'Close-Grip Bench Press',
      'Dumbbell Tricep Extension', 'Cable Overhead Extension',
      'Tricep Dip', 'Diamond Push-Up', 'Tricep Kickback',
      'JM Press', 'French Press', 'Single-Arm Pushdown',
    ],
  },
  {
    category: 'Legs',
    exercises: [
      'Squat', 'Front Squat', 'Leg Press', 'Hack Squat',
      'Romanian Deadlift', 'Stiff-Leg Deadlift',
      'Leg Extension', 'Leg Curl', 'Seated Leg Curl',
      'Bulgarian Split Squat', 'Lunge', 'Walking Lunge',
      'Goblet Squat', 'Hip Thrust', 'Glute Bridge',
      'Sumo Deadlift', 'Good Morning', 'Box Squat',
      'Step-Up', 'Sissy Squat', 'Belt Squat',
      'Calf Raise', 'Seated Calf Raise', 'Smith Machine Squat',
      'Pendulum Squat', 'Leg Press Calf Raise',
    ],
  },
  {
    category: 'Core',
    exercises: [
      'Crunch', 'Plank', 'Hanging Leg Raise', 'Cable Crunch',
      'Ab Rollout', 'Russian Twist', 'Sit-Up',
      'Bicycle Crunch', 'Leg Raise', 'Side Plank',
      'Woodchop', 'Pallof Press', 'Dead Bug',
      'Decline Sit-Up', 'Dragon Flag', 'Toe Touch',
    ],
  },
  {
    category: 'Cardio',
    exercises: [
      'Treadmill Run', 'Cycling', 'Rowing Machine',
      'Stairmaster', 'Elliptical', 'Jump Rope',
      'Battle Ropes', 'Box Jump', 'Burpee',
      'Mountain Climber', 'Sled Push', 'Sled Pull',
      'Assault Bike', 'Farmer Walk', 'Kettlebell Swing',
    ],
  },
];

export const ALL_EXERCISES = COMMON_EXERCISES.flatMap((cat) =>
  cat.exercises.map((name) => ({ name, category: cat.category })),
);

export type ExerciseSearchResult = { name: string; category: string };
