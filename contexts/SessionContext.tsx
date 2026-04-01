import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { useAuth } from '@/contexts/AuthContext';
import {
  clearWorkoutSessionStorage,
  readWorkoutSessionRaw,
  writeWorkoutSessionRaw,
} from '@/lib/workoutSessionStorage';

// ─── Types ─────────────────────────────────────────
interface SessionExercise {
  name: string;
  targetSets: number;
  targetReps: number;
  weight: string;
  prReps: string;
  completed: boolean;
  isNewPR: boolean;
}

interface StoredSession {
  templateId: string;
  templateName: string;
  templateColor: string;
  exercises: SessionExercise[];
  startTime: number;
}

interface SessionContextValue {
  isActive: boolean;
  startTime: number | null;
  templateName: string | null;
  templateColor: string | null;
  templateId: string | null;
  exercises: SessionExercise[];
  startSession: (data: {
    templateId: string;
    templateName: string;
    templateColor: string;
    exercises: SessionExercise[];
  }) => Promise<void>;
  updateExercises: (exercises: SessionExercise[]) => Promise<void>;
  endSession: () => Promise<void>;
  elapsed: number;
}

const SessionContext = createContext<SessionContextValue>({
  isActive: false,
  startTime: null,
  templateName: null,
  templateColor: null,
  templateId: null,
  exercises: [],
  startSession: async () => {},
  updateExercises: async () => {},
  endSession: async () => {},
  elapsed: 0,
});

export function useSession() {
  return useContext(SessionContext);
}

async function getStoredSession(): Promise<StoredSession | null> {
  try {
    const raw = await readWorkoutSessionRaw();
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

async function storeSession(session: StoredSession): Promise<void> {
  await writeWorkoutSessionRaw(JSON.stringify(session));
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const prevUserIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const stored = await getStoredSession();
      if (stored) setSession(stored);
    })();
  }, []);

  /**
   * Drop in-memory workout when the user signs out (avoid stale banner + timer loops).
   * Only when we transition from a logged-in user to logged-out — not on initial null user.
   */
  useEffect(() => {
    const prev = prevUserIdRef.current;
    const id = user?.id ?? null;
    if (prev !== undefined && prev !== null && user == null) {
      setSession(null);
      setElapsed(0);
      void clearWorkoutSessionStorage();
    }
    prevUserIdRef.current = id;
  }, [user]);

  /**
   * Timer: never call setElapsed(0) on every run while session is null — that contributed to
   * update-depth issues during auth / navigation churn. Only reset in cleanup when leaving an active session.
   */
  useEffect(() => {
    if (!session) {
      return;
    }
    const tick = () => {
      setElapsed(Math.floor((Date.now() - session.startTime) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      clearInterval(interval);
      setElapsed(0);
    };
  }, [session?.startTime]);

  const startSession = useCallback(
    async (data: {
      templateId: string;
      templateName: string;
      templateColor: string;
      exercises: SessionExercise[];
    }) => {
      const newSession: StoredSession = {
        templateId: data.templateId,
        templateName: data.templateName,
        templateColor: data.templateColor,
        exercises: data.exercises,
        startTime: Date.now(),
      };
      setSession(newSession);
      await storeSession(newSession);
    },
    [],
  );

  const updateExercises = useCallback(async (exercises: SessionExercise[]) => {
    setSession((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, exercises };
      void storeSession(updated);
      return updated;
    });
  }, []);

  const endSession = useCallback(async () => {
    setSession(null);
    setElapsed(0);
    await clearWorkoutSessionStorage();
  }, []);

  return (
    <SessionContext.Provider
      value={{
        isActive: !!session,
        startTime: session?.startTime ?? null,
        templateName: session?.templateName ?? null,
        templateColor: session?.templateColor ?? null,
        templateId: session?.templateId ?? null,
        exercises: session?.exercises ?? [],
        startSession,
        updateExercises,
        endSession,
        elapsed,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
