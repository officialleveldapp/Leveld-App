import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiGetPendingGroupInvites } from '@/lib/api';

export type GroupInviteItem = {
  id: string;
  group: { id: string; name: string; description?: string; member_count?: number };
  inviter: { id: number; username: string; level?: number };
  status: string;
  created_at: string;
};

type GroupInvitesContextValue = {
  invites: GroupInviteItem[];
  pendingCount: number;
  refreshInvites: () => Promise<void>;
};

const GroupInvitesContext = createContext<GroupInvitesContextValue | null>(null);

export function GroupInvitesProvider({ children }: { children: React.ReactNode }) {
  const [invites, setInvites] = useState<GroupInviteItem[]>([]);

  const refreshInvites = useCallback(async () => {
    const { data, error } = await apiGetPendingGroupInvites();
    if (error || !Array.isArray(data)) {
      setInvites([]);
      return;
    }
    setInvites(data as GroupInviteItem[]);
  }, []);

  useEffect(() => {
    void refreshInvites();
  }, [refreshInvites]);

  const value = useMemo(
    () => ({
      invites,
      pendingCount: invites.length,
      refreshInvites,
    }),
    [invites, refreshInvites],
  );

  return (
    <GroupInvitesContext.Provider value={value}>{children}</GroupInvitesContext.Provider>
  );
}

export function useGroupInvites(): GroupInvitesContextValue {
  const ctx = useContext(GroupInvitesContext);
  if (!ctx) {
    throw new Error('useGroupInvites must be used within GroupInvitesProvider');
  }
  return ctx;
}
