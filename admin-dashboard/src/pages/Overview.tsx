import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Users, Crown, Activity, Dumbbell } from 'lucide-react';
import type { ReactNode } from 'react';
import { apiRequest } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { Card, EmptyState, PageHeader, Spinner } from '@/components/ui';

interface SeriesPoint {
  date: string;
  count: number;
}

interface Metrics {
  users_total: number;
  users_new_7d: number;
  users_new_30d: number;
  paying_users: number;
  conversion_rate: number;
  active_users_7d: number;
  active_users_30d: number;
  workouts_total: number;
  workouts_7d: number;
  workouts_30d: number;
  groups_total: number;
  signups_series: SeriesPoint[];
  workouts_series: SeriesPoint[];
}

function MetricCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted">{label}</div>
          <div className="mt-2 text-3xl font-bold text-white">{value}</div>
          {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function ChartCard({ title, data }: { title: string; data: SeriesPoint[] }) {
  return (
    <Card className="p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#2A2A2A" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
              minTickGap={24}
            />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: '#161616',
                border: '1px solid #2A2A2A',
                borderRadius: 8,
                color: '#fff',
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#4C91FF"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function Overview() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => apiRequest<Metrics>('/metrics/'),
  });

  return (
    <div>
      <PageHeader title="Overview" subtitle="Key metrics across Leveld" />
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : isError || !data ? (
        <EmptyState message="Could not load metrics." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total users"
              value={formatNumber(data.users_total)}
              sub={`+${formatNumber(data.users_new_7d)} this week`}
              icon={<Users size={20} />}
            />
            <MetricCard
              label="Paying users"
              value={formatNumber(data.paying_users)}
              sub={`${data.conversion_rate}% conversion`}
              icon={<Crown size={20} />}
            />
            <MetricCard
              label="Active (7d)"
              value={formatNumber(data.active_users_7d)}
              sub={`${formatNumber(data.active_users_30d)} in 30d`}
              icon={<Activity size={20} />}
            />
            <MetricCard
              label="Workouts logged"
              value={formatNumber(data.workouts_total)}
              sub={`+${formatNumber(data.workouts_7d)} this week`}
              icon={<Dumbbell size={20} />}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="New signups (30 days)" data={data.signups_series} />
            <ChartCard title="Workouts logged (30 days)" data={data.workouts_series} />
          </div>
        </div>
      )}
    </div>
  );
}
