import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiRequest, type Paginated } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import {
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  Spinner,
} from '@/components/ui';

interface ExerciseEntry {
  name?: string;
  sets?: number;
  reps?: number;
  weight?: number;
  [k: string]: unknown;
}

interface WorkoutRow {
  id: string;
  user_id: number;
  username: string | null;
  workout_date: string;
  total_sets: number;
  total_reps: number;
  duration_minutes: number;
  xp_earned: number;
  notes: string;
  exercises: ExerciseEntry[];
  created_at: string;
}

export function Workouts() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<WorkoutRow | null>(null);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['workouts', page],
    queryFn: () => apiRequest<Paginated<WorkoutRow>>('/workouts/', { params: { page } }),
    placeholderData: keepPreviousData,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 25)) : 1;

  return (
    <div>
      <PageHeader
        title="Workouts"
        subtitle={data ? `${data.count.toLocaleString()} logged` : undefined}
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : isError ? (
          <EmptyState message="Could not load workouts." />
        ) : !data || data.results.length === 0 ? (
          <EmptyState message="No workouts found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Sets</th>
                  <th className="px-4 py-3 font-medium">Reps</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">XP</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.results.map((w) => (
                  <tr key={w.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-white">{w.username ?? `#${w.user_id}`}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(w.workout_date)}</td>
                    <td className="px-4 py-3 text-muted">{w.total_sets}</td>
                    <td className="px-4 py-3 text-muted">{w.total_reps}</td>
                    <td className="px-4 py-3 text-muted">{w.duration_minutes} min</td>
                    <td className="px-4 py-3 text-muted">{w.xp_earned}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(w)}>
                        View
                      </Button>
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
            <Button variant="secondary" size="sm" disabled={!data.previous} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={!data.next} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.username ?? 'Workout'} · ${formatDate(selected.workout_date)}` : ''}
      >
        {selected && (
          <div className="space-y-4">
            <div className="text-xs text-muted">Logged {formatDateTime(selected.created_at)}</div>
            {selected.notes && (
              <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-white">
                {selected.notes}
              </p>
            )}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-white">Exercises</h4>
              {selected.exercises.length === 0 ? (
                <p className="text-sm text-muted">No exercises recorded.</p>
              ) : (
                <ul className="space-y-1.5">
                  {selected.exercises.map((ex, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                    >
                      <span className="text-white">{ex.name ?? `Exercise ${i + 1}`}</span>
                      <span className="text-muted">
                        {[
                          ex.sets != null ? `${ex.sets} sets` : null,
                          ex.reps != null ? `${ex.reps} reps` : null,
                          ex.weight != null ? `${ex.weight} lbs` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
