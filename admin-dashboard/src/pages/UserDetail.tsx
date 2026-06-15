import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Crown, Trash2, Ban, CheckCircle2 } from 'lucide-react';
import { apiRequest, ApiError } from '@/lib/api';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
} from '@/components/ui';

interface ProfileData {
  username: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  current_streak: number;
  longest_streak: number;
  total_workouts: number;
  goal: string;
  experience_level: string;
  is_pro: boolean;
  pro_expires_at: string | null;
  last_workout_date: string | null;
  created_at: string;
}

interface WorkoutItem {
  id: string;
  workout_date: string;
  total_sets: number;
  total_reps: number;
  xp_earned: number;
}

interface UserDetailData {
  id: number;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  profile: ProfileData | null;
  recent_workouts: WorkoutItem[];
  groups: { id: string; name: string }[];
  badges: { id: string; name: string; earned_at: string }[];
  followers_count: number;
  following_count: number;
  friends_count: number;
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

export function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['user', id],
    queryFn: () => apiRequest<UserDetailData>(`/users/${id}/`),
    enabled: !!id,
  });

  const patchMutation = useMutation({
    mutationFn: (body: { is_pro?: boolean; is_active?: boolean }) =>
      apiRequest<UserDetailData>(`/users/${id}/`, { method: 'PATCH', body }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['user', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : 'Action failed.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/users/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['metrics'] });
      navigate('/users');
    },
    onError: (err) => {
      alert(err instanceof ApiError ? err.message : 'Delete failed.');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError || !data) {
    return <EmptyState message="Could not load this user." />;
  }

  const p = data.profile;
  const busy = patchMutation.isPending || deleteMutation.isPending;

  return (
    <div>
      <button
        onClick={() => navigate('/users')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-white"
      >
        <ArrowLeft size={16} /> Back to users
      </button>

      <PageHeader
        title={p?.username ?? data.email}
        subtitle={data.email}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant={p?.is_pro ? 'secondary' : 'primary'}
              size="sm"
              disabled={busy || !p}
              onClick={() => patchMutation.mutate({ is_pro: !p?.is_pro })}
              className="flex items-center gap-1.5"
            >
              <Crown size={15} />
              {p?.is_pro ? 'Revoke Pro' : 'Grant Pro'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => patchMutation.mutate({ is_active: !data.is_active })}
              className="flex items-center gap-1.5"
            >
              {data.is_active ? <Ban size={15} /> : <CheckCircle2 size={15} />}
              {data.is_active ? 'Deactivate' : 'Reactivate'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={busy || data.is_superuser}
              onClick={() => {
                if (confirm(`Permanently delete ${p?.username ?? data.email}? This cannot be undone.`)) {
                  deleteMutation.mutate();
                }
              }}
              className="flex items-center gap-1.5"
            >
              <Trash2 size={15} /> Delete
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {p?.is_pro ? <Badge tone="warning">Pro</Badge> : <Badge>Free</Badge>}
        {data.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Disabled</Badge>}
        {data.is_superuser && <Badge tone="brand">Superuser</Badge>}
      </div>

      {p && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Level" value={p.level} />
          <StatTile label="XP" value={formatNumber(p.xp)} />
          <StatTile label="Workouts" value={formatNumber(p.total_workouts)} />
          <StatTile label="Streak" value={`${p.current_streak}d`} />
          <StatTile label="Friends" value={data.friends_count} />
          <StatTile label="Followers" value={data.followers_count} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Account</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Joined" value={formatDate(data.date_joined)} />
            <Row label="Last login" value={formatDateTime(data.last_login)} />
            <Row label="Last workout" value={formatDate(p?.last_workout_date)} />
            <Row label="Goal" value={p?.goal ?? '—'} />
            <Row label="Experience" value={p?.experience_level ?? '—'} />
            <Row label="Pro expires" value={formatDate(p?.pro_expires_at)} />
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Recent workouts</h3>
          {data.recent_workouts.length === 0 ? (
            <p className="text-sm text-muted">No workouts logged.</p>
          ) : (
            <ul className="space-y-2">
              {data.recent_workouts.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <span className="text-white">{formatDate(w.workout_date)}</span>
                  <span className="text-muted">
                    {w.total_sets} sets · {w.total_reps} reps · {w.xp_earned} XP
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Groups</h3>
          {data.groups.length === 0 ? (
            <p className="text-sm text-muted">Not in any groups.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.groups.map((g) => (
                <Badge key={g.id}>{g.name}</Badge>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Badges</h3>
          {data.badges.length === 0 ? (
            <p className="text-sm text-muted">No badges earned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.badges.map((b) => (
                <Badge key={b.id} tone="brand">
                  {b.name}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-white">{value}</dd>
    </div>
  );
}
