export interface Profile {
  id: string;
  email?: string;
  username: string;
  avatar_url?: string;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  total_workouts: number;
  goal: string;
  experience_level: string;
  workout_frequency: number;
  preferred_exercises: string[];
  last_workout_date?: string;
  is_pro: boolean;
  pro_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfilePublic {
  id: string;
  username: string;
  avatar_url?: string;
  xp: number;
  level: number;
}

export interface Workout {
  id: string;
  user_id: string;
  workout_date: string;
  exercises: Exercise[];
  total_sets: number;
  total_reps: number;
  duration_minutes: number;
  calories_burned: number;
  xp_earned: number;
  notes: string;
  created_at: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export interface DailyTip {
  id: string;
  text: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  friend?: ProfilePublic;
  sender?: ProfilePublic;
}

export interface FriendshipsResponse {
  friends: Friendship[];
  sent: Friendship[];
  received: Friendship[];
}

export interface Group {
  id: string;
  name: string;
  description: string;
  created_by_id: string;
  is_public: boolean;
  created_at: string;
  member_count?: number;
}

export interface GroupDetail extends Group {
  members: GroupMember[];
  is_member: boolean;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user: ProfilePublic;
  joined_at: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  color: string;
  icon: string;
  exercises: TemplateExercise[];
  exercise_count: number;
  user?: ProfilePublic;
  created_at: string;
  updated_at: string;
}

export interface TemplateExercise {
  id?: string;
  name: string;
  default_sets: number;
  default_reps: number;
  order: number;
}

export interface WorkoutFeed {
  id: string;
  user_id: string;
  workout_id?: string;
  template_id?: string;
  content: string;
  likes_count: number;
  created_at: string;
  user?: ProfilePublic;
  workout?: Workout;
  template?: WorkoutTemplate;
}

export interface UserPublicProfile extends Profile {
  recent_workouts: Workout[];
  templates: WorkoutTemplate[];
  friendship: Friendship | null;
}
