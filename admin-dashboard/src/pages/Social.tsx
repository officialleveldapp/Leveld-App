import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { apiRequest, ApiError, type Paginated } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  cn,
} from '@/components/ui';

interface GroupRow {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  created_by_username: string | null;
  member_count: number;
  created_at: string;
}

interface ChallengeRow {
  id: string;
  name: string;
  challenge_type: string;
  group_name: string | null;
  start_date: string;
  end_date: string;
  target_value: number;
  is_active: boolean;
  participant_count: number;
}

type Tab = 'groups' | 'challenges';

export function Social() {
  const [tab, setTab] = useState<Tab>('groups');

  return (
    <div>
      <PageHeader title="Groups & Challenges" subtitle="Moderate community content" />
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-surface-2 p-1 w-fit">
        {(
          [
            ['groups', 'Groups'],
            ['challenges', 'Challenges'],
          ] as [Tab, string][]
        ).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTab(val)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              tab === val ? 'bg-brand text-white' : 'text-muted hover:text-white',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'groups' ? <GroupsTab /> : <ChallengesTab />}
    </div>
  );
}

function GroupsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['groups', page],
    queryFn: () => apiRequest<Paginated<GroupRow>>('/groups/', { params: { page } }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/groups/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
    onError: (err) => alert(err instanceof ApiError ? err.message : 'Delete failed.'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (isError) return <EmptyState message="Could not load groups." />;
  if (!data || data.results.length === 0) return <EmptyState message="No groups yet." />;

  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Group</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Members</th>
                <th className="px-4 py-3 font-medium">Visibility</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.results.map((g) => (
                <tr key={g.id} className="border-b border-border/50">
                  <td className="px-4 py-3 font-medium text-white">{g.name}</td>
                  <td className="px-4 py-3 text-muted">{g.created_by_username ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{g.member_count}</td>
                  <td className="px-4 py-3">
                    {g.is_public ? <Badge tone="brand">Public</Badge> : <Badge>Private</Badge>}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(g.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm(`Delete group "${g.name}"? This removes all its data.`)) {
                          deleteMutation.mutate(g.id);
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Pager
        page={page}
        hasPrev={!!data.previous}
        hasNext={!!data.next}
        count={data.count}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => p + 1)}
      />
    </>
  );
}

function ChallengesTab() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['challenges', page],
    queryFn: () => apiRequest<Paginated<ChallengeRow>>('/challenges/', { params: { page } }),
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (isError) return <EmptyState message="Could not load challenges." />;
  if (!data || data.results.length === 0) return <EmptyState message="No challenges yet." />;

  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Challenge</th>
                <th className="px-4 py-3 font-medium">Group</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Window</th>
                <th className="px-4 py-3 font-medium">Players</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((c) => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                  <td className="px-4 py-3 text-muted">{c.group_name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{c.challenge_type}</td>
                  <td className="px-4 py-3 text-muted">{c.target_value}</td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(c.start_date)} – {formatDate(c.end_date)}
                  </td>
                  <td className="px-4 py-3 text-muted">{c.participant_count}</td>
                  <td className="px-4 py-3">
                    {c.is_active ? <Badge tone="success">Active</Badge> : <Badge>Ended</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Pager
        page={page}
        hasPrev={!!data.previous}
        hasNext={!!data.next}
        count={data.count}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => p + 1)}
      />
    </>
  );
}

function Pager({
  page,
  hasPrev,
  hasNext,
  count,
  onPrev,
  onNext,
}: {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  count: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (count <= 25) return null;
  const totalPages = Math.max(1, Math.ceil(count / 25));
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={!hasPrev} onClick={onPrev}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={!hasNext} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
