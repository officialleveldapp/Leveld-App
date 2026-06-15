const API_ROOT = (import.meta.env.VITE_API_ROOT ?? '/api').replace(/\/$/, '');
const ADMIN_BASE = `${API_ROOT}/admin`;
const REFRESH_URL = `${API_ROOT}/auth/refresh/`;

const ACCESS_KEY = 'leveld_admin_access';
const REFRESH_KEY = 'leveld_admin_refresh';

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  setAccess(access: string) {
    localStorage.setItem(ACCESS_KEY, access);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  try {
    const res = await fetch(REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.access) {
      tokenStore.setAccess(data.access);
      if (data.refresh) tokenStore.set(data.access, data.refresh);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  _retried?: boolean;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = `${ADMIN_BASE}${path}`;
  if (!params) return url;
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.append(k, String(v));
  });
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, params, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && tokenStore.access) {
    headers.Authorization = `Bearer ${tokenStore.access}`;
  }

  const res = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !options._retried) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, _retried: true });
    }
    tokenStore.clear();
    onUnauthorized?.();
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const detail =
      (data && typeof data === 'object' && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : undefined) ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, detail, data);
  }

  return data as T;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: { id: number; email: string; is_superuser: boolean };
}

export async function adminLogin(email: string, password: string): Promise<LoginResponse> {
  const data = await apiRequest<LoginResponse>('/auth/login/', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  tokenStore.set(data.access, data.refresh);
  return data;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
