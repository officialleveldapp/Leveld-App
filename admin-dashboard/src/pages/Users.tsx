import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { apiRequest, type Paginated } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
} from '@/components/ui';

export interface UserRow {
  id: number;
  email: string;
  username: string | null;
  level: number | null;
  xp: number | null;
  current_streak: number | null;
  total_workouts: number | null;
  is_pro: boolean;
  is_active: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_workout_date: string | null;
}

type ProFilter = '' | 'true' | 'false';

export function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [isPro, setIsPro] = useState<ProFilter>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['users', debounced, isPro, page],
    queryFn: () =>
      apiRequest<Paginated<UserRow>>('/users/', {
        params: {
          search: debounced || undefined,
          is_pro: isPro || undefined,
          page,
        },
      }),
    placeholderData: keepPreviousData,
  });

  function onSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 25)) : 1;

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={data ? `${data.count.toLocaleString()} total` : undefined}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <Input
            className="pl-9"
            placeholder="Search by email or username"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
          {(
            [
              ['', 'All'],
              ['true', 'Pro'],
              ['false', 'Free'],
            ] as [ProFilter, string][]
          ).map(([val, label]) => (
            <button
              key={label}
              onClick={() => {
                setIsPro(val);
                setPage(1);
              }}
              className={
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors ' +
                (isPro === val ? 'bg-brand text-white' : 'text-muted hover:text-white')
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : isError ? (
          <EmptyState message="Could not load users." />
        ) : !data || data.results.length === 0 ? (
          <EmptyState message="No users found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Level</th>
                  <th className="px-4 py-3 font-medium">Workouts</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/users/${u.id}`)}
                    className="cursor-pointer border-b border-border/50 transition-colors hover:bg-surface-2"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{u.username ?? '—'}</div>
                      <div className="text-xs text-muted">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_pro ? <Badge tone="warning">Pro</Badge> : <Badge>Free</Badge>}
                    </td>
                    <td className="px-4 py-3 text-muted">{u.level ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{u.total_workouts ?? '—'}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(u.date_joined)}</td>
                    <td className="px-4 py-3">
                      {u.is_active ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="danger">Disabled</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && data.count > 25 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>
            Page {page} of {totalPages}
            {isFetching && <span className="ml-2">…</span>}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!data.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!data.next}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
