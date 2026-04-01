import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

// ── Token storage ────────────────────────────────────

const TOKEN_KEY = 'leveld_access_token';
const REFRESH_KEY = 'leveld_refresh_token';

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem(key)
      : null;
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// ── Public token helpers ─────────────────────────────

export async function getAccessToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await setItem(TOKEN_KEY, access);
  await setItem(REFRESH_KEY, refresh);
}

export async function clearTokens(): Promise<void> {
  await removeItem(TOKEN_KEY);
  await removeItem(REFRESH_KEY);
}

export async function hasSession(): Promise<boolean> {
  const token = await getItem(TOKEN_KEY);
  return token !== null;
}

// ── Core fetch wrapper ───────────────────────────────

async function refreshAccessToken(): Promise<string | null> {
  const refresh = await getItem(REFRESH_KEY);
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    await setItem(TOKEN_KEY, data.access);
    if (data.refresh) await setItem(REFRESH_KEY, data.refresh);
    return data.access;
  } catch {
    return null;
  }
}

interface FetchOptions {
  method?: string;
  body?: any;
  params?: Record<string, string>;
  noAuth?: boolean;
}

async function apiFetch<T = any>(
  path: string,
  options: FetchOptions = {},
): Promise<{ data: T | null; error: any }> {
  const { method = 'GET', body, params, noAuth = false } = options;

  let url = `${API_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!noAuth) {
    let token = await getItem(TOKEN_KEY);
    if (!token) {
      token = await refreshAccessToken();
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    let res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // If 401, try refreshing
    if (res.status === 401 && !noAuth) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
      }
    }

    if (res.status === 204) {
      return { data: null, error: null };
    }

    const json = await res.json();

    if (!res.ok) {
      return { data: null, error: json };
    }

    return { data: json as T, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Network error' } };
  }
}

// ══════════════════════════════════════════════════════
//  AUTH API
// ══════════════════════════════════════════════════════

interface AuthResponse {
  access: string;
  refresh: string;
  user: { id: number; email: string };
  profile: any;
}

export async function apiRegister(
  email: string,
  password: string,
  username: string,
): Promise<{ data: AuthResponse | null; error: any }> {
  const result = await apiFetch<AuthResponse>('/auth/register/', {
    method: 'POST',
    body: { email, password, username },
    noAuth: true,
  });
  if (result.data) {
    await setTokens(result.data.access, result.data.refresh);
  }
  return result;
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<{ data: AuthResponse | null; error: any }> {
  const result = await apiFetch<AuthResponse>('/auth/login/', {
    method: 'POST',
    body: { email, password },
    noAuth: true,
  });
  if (result.data) {
    await setTokens(result.data.access, result.data.refresh);
  }
  return result;
}

export async function apiGoogleSignIn(
  idToken: string,
): Promise<{ data: AuthResponse | null; error: any }> {
  const result = await apiFetch<AuthResponse>('/auth/google/', {
    method: 'POST',
    body: { id_token: idToken },
    noAuth: true,
  });
  if (result.data) {
    await setTokens(result.data.access, result.data.refresh);
  }
  return result;
}

export async function apiForgotPassword(
  email: string,
): Promise<{ data: any; error: any }> {
  return apiFetch('/auth/forgot-password/', {
    method: 'POST',
    body: { email },
    noAuth: true,
  });
}

// ══════════════════════════════════════════════════════
//  PROFILE API
// ══════════════════════════════════════════════════════

export async function apiGetProfile(): Promise<{ data: any; error: any }> {
  return apiFetch('/profile/');
}

export async function apiUpdateProfile(
  fields: Record<string, any>,
): Promise<{ data: any; error: any }> {
  return apiFetch('/profile/', { method: 'PATCH', body: fields });
}

export async function apiDeleteAccount(): Promise<{ data: any; error: any }> {
  return apiFetch('/auth/delete-account/', { method: 'DELETE' });
}

// ══════════════════════════════════════════════════════
//  WORKOUTS API
// ══════════════════════════════════════════════════════

export async function apiGetWorkouts(
  params?: Record<string, string>,
): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>('/workouts/', { params });
  return { data: result.data || [], error: result.error };
}

export async function apiCreateWorkout(
  workout: Record<string, any>,
): Promise<{ data: any; error: any }> {
  return apiFetch('/workouts/', { method: 'POST', body: workout });
}

// ══════════════════════════════════════════════════════
//  BADGES API
// ══════════════════════════════════════════════════════

export async function apiGetBadges(): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>('/badges/');
  return { data: result.data || [], error: result.error };
}

export async function apiGetUserBadges(): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>('/user-badges/');
  return { data: result.data || [], error: result.error };
}

export async function apiGetDailyTips(): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>('/daily-tips/');
  return { data: result.data || [], error: result.error };
}

// ══════════════════════════════════════════════════════
//  LEADERBOARD API
// ══════════════════════════════════════════════════════

export async function apiGetLeaderboard(
  limit = 10,
): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>('/leaderboard/', {
    params: { limit: String(limit) },
  });
  return { data: result.data || [], error: result.error };
}

// ══════════════════════════════════════════════════════
//  FOLLOW SYSTEM API
// ══════════════════════════════════════════════════════

export async function apiToggleFollow(
  userId: number,
): Promise<{ data: any; error: any }> {
  return apiFetch(`/follows/${userId}/`, { method: 'POST' });
}

export async function apiGetFollowers(
  userId: number | string,
): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>(`/users/${userId}/followers/`);
  return { data: result.data || [], error: result.error };
}

export async function apiGetFollowing(
  userId: number | string,
): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>(`/users/${userId}/following/`);
  return { data: result.data || [], error: result.error };
}

export async function apiGetFriends(): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>('/friends/');
  return { data: result.data || [], error: result.error };
}

// ══════════════════════════════════════════════════════
//  FRIENDSHIPS API (legacy compat)
// ══════════════════════════════════════════════════════

export async function apiGetFriendships(): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>('/friendships/');
  return { data: result.data || [], error: result.error };
}

export async function apiCreateFriendship(
  friendId: number,
): Promise<{ data: any; error: any }> {
  return apiFetch('/friendships/', {
    method: 'POST',
    body: { friend_id: friendId },
  });
}

export async function apiUpdateFriendship(
  id: string,
  status: string,
): Promise<{ data: any; error: any }> {
  return apiFetch(`/friendships/${id}/`, {
    method: 'PATCH',
    body: { status },
  });
}

export async function apiDeleteFriendship(
  id: string,
): Promise<{ data: any; error: any }> {
  return apiFetch(`/friendships/${id}/`, { method: 'DELETE' });
}

// ══════════════════════════════════════════════════════
//  FEED API
// ══════════════════════════════════════════════════════

export async function apiGetFeed(): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>('/feed/');
  return { data: result.data || [], error: result.error };
}

export async function apiToggleFeedLike(
  feedId: string,
): Promise<{ data: any; error: any }> {
  return apiFetch(`/feed/${feedId}/react/`, { method: 'POST', body: { reaction_type: 'like' } });
}

export async function apiReactToFeed(
  feedId: string,
  reactionType: string,
): Promise<{ data: any; error: any }> {
  return apiFetch(`/feed/${feedId}/react/`, { method: 'POST', body: { reaction_type: reactionType } });
}

// ══════════════════════════════════════════════════════
//  GROUPS API
// ══════════════════════════════════════════════════════

export async function apiGetGroups(): Promise<{ data: any; error: any }> {
  return apiFetch('/groups/');
}

export async function apiGetGroupDetail(
  groupId: string,
): Promise<{ data: any; error: any }> {
  return apiFetch(`/groups/${groupId}/`);
}

export async function apiCreateGroup(
  group: { name: string; description?: string; is_public?: boolean },
): Promise<{ data: any; error: any }> {
  return apiFetch('/groups/', { method: 'POST', body: group });
}

export async function apiJoinGroup(
  groupId: string,
): Promise<{ data: any; error: any }> {
  return apiFetch(`/groups/${groupId}/join/`, { method: 'POST' });
}

export async function apiLeaveGroup(
  groupId: string,
): Promise<{ data: any; error: any }> {
  return apiFetch(`/groups/${groupId}/leave/`, { method: 'DELETE' });
}

// ══════════════════════════════════════════════════════
//  WORKOUT TEMPLATES API
// ══════════════════════════════════════════════════════

export async function apiGetTemplates(): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>('/templates/');
  return { data: result.data || [], error: result.error };
}

export async function apiCreateTemplate(
  template: {
    name: string;
    color?: string;
    icon?: string;
    exercises?: { name: string; default_sets?: number; default_reps?: number }[];
  },
): Promise<{ data: any; error: any }> {
  return apiFetch('/templates/', { method: 'POST', body: template });
}

export async function apiGetTemplate(
  id: string,
): Promise<{ data: any; error: any }> {
  return apiFetch(`/templates/${id}/`);
}

export async function apiUpdateTemplate(
  id: string,
  template: {
    name?: string;
    color?: string;
    icon?: string;
    exercises?: { name: string; default_sets?: number; default_reps?: number }[];
  },
): Promise<{ data: any; error: any }> {
  return apiFetch(`/templates/${id}/`, { method: 'PUT', body: template });
}

export async function apiDeleteTemplate(
  id: string,
): Promise<{ data: any; error: any }> {
  return apiFetch(`/templates/${id}/`, { method: 'DELETE' });
}

// ══════════════════════════════════════════════════════
//  PERSONAL RECORDS API
// ══════════════════════════════════════════════════════

export async function apiGetPersonalRecords(): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>('/personal-records/');
  return { data: result.data || [], error: result.error };
}

export async function apiCheckPR(
  exerciseName: string,
  weight: number,
  reps: number,
): Promise<{ data: any; error: any }> {
  return apiFetch('/personal-records/', {
    method: 'POST',
    body: { exercise_name: exerciseName, weight, reps },
  });
}

// ══════════════════════════════════════════════════════
//  USER SEARCH & PUBLIC PROFILE API
// ══════════════════════════════════════════════════════

export async function apiSearchUsers(
  query: string,
): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>('/users/search/', {
    params: { q: query },
  });
  return { data: result.data || [], error: result.error };
}

export async function apiGetUserProfile(
  userId: number | string,
): Promise<{ data: any; error: any }> {
  return apiFetch(`/users/${userId}/`);
}

// ══════════════════════════════════════════════════════
//  GROUP FEED & LEADERBOARD API
// ══════════════════════════════════════════════════════

export async function apiGetGroupFeed(
  groupId: string,
): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>(`/groups/${groupId}/feed/`);
  return { data: result.data || [], error: result.error };
}

export async function apiGetGroupLeaderboard(
  groupId: string,
): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>(`/groups/${groupId}/leaderboard/`);
  return { data: result.data || [], error: result.error };
}

// ══════════════════════════════════════════════════════
//  TEMPLATE CLONE API
// ══════════════════════════════════════════════════════

export async function apiCloneTemplate(
  templateId: string,
): Promise<{ data: any; error: any }> {
  return apiFetch(`/templates/${templateId}/clone/`, { method: 'POST' });
}

export async function apiGetTemplateLibrary(
  params?: { category?: string; q?: string; limit?: number; offset?: number },
): Promise<{ data: { results: any[]; has_more: boolean; next_offset: number; total: number } | null; error: any }> {
  const queryParams: Record<string, string> = {};
  if (params?.category) queryParams.category = params.category;
  if (params?.q) queryParams.q = params.q;
  if (typeof params?.limit === 'number') queryParams.limit = String(params.limit);
  if (typeof params?.offset === 'number') queryParams.offset = String(params.offset);

  const result = await apiFetch<any>('/templates/library/', {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
  });
  const payload = result.data;
  if (!payload) return { data: null, error: result.error };
  if (Array.isArray(payload)) {
    return {
      data: {
        results: payload,
        has_more: false,
        next_offset: payload.length,
        total: payload.length,
      },
      error: result.error,
    };
  }
  return { data: payload, error: result.error };
}

export async function apiCopyLibraryTemplate(
  templateId: string,
): Promise<{ data: any; error: any }> {
  return apiFetch(`/templates/library/${templateId}/copy/`, { method: 'POST' });
}

// ══════════════════════════════════════════════════════
//  FEED CREATE API
// ══════════════════════════════════════════════════════

export async function apiCreateFeedPost(
  content: string,
  templateId?: string,
  workoutId?: string,
): Promise<{ data: any; error: any }> {
  const body: Record<string, any> = { content };
  if (templateId) body.template_id = templateId;
  if (workoutId) body.workout_id = workoutId;
  return apiFetch('/feed/', { method: 'POST', body });
}

// ══════════════════════════════════════════════════════
//  CHALLENGES API
// ══════════════════════════════════════════════════════

export async function apiGetGroupChallenges(
  groupId: string,
): Promise<{ data: any[]; error: any }> {
  const result = await apiFetch<any[]>(`/groups/${groupId}/challenges/`);
  return { data: result.data || [], error: result.error };
}

export async function apiCreateGroupChallenge(
  groupId: string,
  challenge: {
    name: string;
    description?: string;
    challenge_type: string;
    start_date: string;
    end_date: string;
    target_value: number;
  },
): Promise<{ data: any; error: any }> {
  return apiFetch(`/groups/${groupId}/challenges/`, {
    method: 'POST',
    body: challenge,
  });
}

export async function apiJoinChallenge(
  challengeId: string,
): Promise<{ data: any; error: any }> {
  return apiFetch(`/challenges/${challengeId}/join/`, { method: 'POST' });
}
