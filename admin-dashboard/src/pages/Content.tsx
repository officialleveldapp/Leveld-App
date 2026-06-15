import { useMemo, useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { apiRequest, ApiError, type Paginated } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Spinner,
  cn,
} from '@/components/ui';

type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'json';

interface Field {
  key: string;
  label: string;
  type: FieldType;
}

interface ResourceConfig {
  id: string;
  label: string;
  path: string;
  titleField: string;
  subtitleField?: string;
  fields: Field[];
}

const RESOURCES: ResourceConfig[] = [
  {
    id: 'daily-tips',
    label: 'Daily Tips',
    path: '/content/daily-tips/',
    titleField: 'text',
    fields: [
      { key: 'text', label: 'Tip text', type: 'textarea' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
      { key: 'sort_order', label: 'Sort order', type: 'number' },
    ],
  },
  {
    id: 'library-templates',
    label: 'Library Templates',
    path: '/content/library-templates/',
    titleField: 'name',
    subtitleField: 'category',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'source_name', label: 'Source name', type: 'text' },
      { key: 'source_url', label: 'Source URL', type: 'text' },
      { key: 'color', label: 'Color (hex)', type: 'text' },
      { key: 'icon', label: 'Icon', type: 'text' },
      { key: 'sort_order', label: 'Sort order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'boolean' },
      { key: 'exercises', label: 'Exercises (JSON array)', type: 'json' },
    ],
  },
  {
    id: 'notification-presets',
    label: 'Notification Presets',
    path: '/content/notification-presets/',
    titleField: 'label',
    subtitleField: 'slug',
    fields: [
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'enabled', label: 'Enabled', type: 'boolean' },
      { key: 'sort_order', label: 'Sort order', type: 'number' },
      { key: 'motivation_messages', label: 'Motivation messages (JSON array)', type: 'json' },
      { key: 'workout_messages', label: 'Workout messages (JSON array)', type: 'json' },
      { key: 'social_messages', label: 'Social messages (JSON array)', type: 'json' },
    ],
  },
  {
    id: 'badges',
    label: 'Badges',
    path: '/content/badges/',
    titleField: 'name',
    subtitleField: 'requirement_type',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'icon', label: 'Icon', type: 'text' },
      { key: 'requirement_type', label: 'Requirement type', type: 'text' },
      { key: 'requirement_value', label: 'Requirement value', type: 'number' },
      { key: 'xp_reward', label: 'XP reward', type: 'number' },
    ],
  },
];

type Item = Record<string, unknown>;

export function Content() {
  const [activeId, setActiveId] = useState(RESOURCES[0].id);
  const resource = RESOURCES.find((r) => r.id === activeId)!;

  return (
    <div>
      <PageHeader title="Content" subtitle="Manage app content" />
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-border bg-surface-2 p-1 w-fit">
        {RESOURCES.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveId(r.id)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              activeId === r.id ? 'bg-brand text-white' : 'text-muted hover:text-white',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <ResourceManager key={resource.id} resource={resource} />
    </div>
  );
}

function defaultValue(type: FieldType): unknown {
  switch (type) {
    case 'boolean':
      return false;
    case 'number':
      return 0;
    case 'json':
      return [];
    default:
      return '';
  }
}

function ResourceManager({ resource }: { resource: ResourceConfig }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['content', resource.id],
    queryFn: () => apiRequest<Paginated<Item>>(resource.path, { params: { page_size: 200 } }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['content', resource.id] });

  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id?: string | number; body: Item }) =>
      apiRequest(id != null ? `${resource.path}${id}/` : resource.path, {
        method: id != null ? 'PATCH' : 'POST',
        body,
      }),
    onSuccess: () => {
      void invalidate();
      setEditing(null);
      setCreating(false);
    },
    onError: (err) => alert(err instanceof ApiError ? err.message : 'Save failed.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => apiRequest(`${resource.path}${id}/`, { method: 'DELETE' }),
    onSuccess: () => void invalidate(),
    onError: (err) => alert(err instanceof ApiError ? err.message : 'Delete failed.'),
  });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" className="flex items-center gap-1.5" onClick={() => setCreating(true)}>
          <Plus size={15} /> New {resource.label.replace(/s$/, '')}
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : isError ? (
          <EmptyState message="Could not load content." />
        ) : !data || data.results.length === 0 ? (
          <EmptyState message="Nothing here yet." />
        ) : (
          <ul className="divide-y divide-border/60">
            {data.results.map((item) => (
              <li key={String(item.id)} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">
                    {String(item[resource.titleField] ?? '—')}
                  </div>
                  {resource.subtitleField && (
                    <div className="truncate text-xs text-muted">
                      {String(item[resource.subtitleField] ?? '')}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {'is_active' in item && (
                    <Badge tone={item.is_active ? 'success' : 'neutral'}>
                      {item.is_active ? 'Active' : 'Hidden'}
                    </Badge>
                  )}
                  {'enabled' in item && (
                    <Badge tone={item.enabled ? 'success' : 'neutral'}>
                      {item.enabled ? 'Enabled' : 'Off'}
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setEditing(item)}>
                    <Pencil size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (confirm('Delete this item?')) deleteMutation.mutate(item.id as string | number);
                    }}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {(creating || editing) && (
        <ResourceForm
          resource={resource}
          item={editing}
          saving={saveMutation.isPending}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSubmit={(body) =>
            saveMutation.mutate({ id: editing?.id as string | number | undefined, body })
          }
        />
      )}
    </>
  );
}

function ResourceForm({
  resource,
  item,
  saving,
  onClose,
  onSubmit,
}: {
  resource: ResourceConfig;
  item: Item | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (body: Item) => void;
}) {
  const initial = useMemo(() => {
    const values: Record<string, string | boolean | number> = {};
    for (const f of resource.fields) {
      const raw = item ? item[f.key] : defaultValue(f.type);
      if (f.type === 'json') {
        values[f.key] = JSON.stringify(raw ?? [], null, 2);
      } else if (f.type === 'boolean') {
        values[f.key] = Boolean(raw);
      } else if (f.type === 'number') {
        values[f.key] = Number(raw ?? 0);
      } else {
        values[f.key] = String(raw ?? '');
      }
    }
    return values;
  }, [resource, item]);

  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  function setValue(key: string, value: string | boolean | number) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const body: Item = {};
    for (const f of resource.fields) {
      const v = values[f.key];
      if (f.type === 'json') {
        try {
          body[f.key] = JSON.parse(String(v));
        } catch {
          setError(`"${f.label}" must be valid JSON.`);
          return;
        }
      } else if (f.type === 'number') {
        body[f.key] = Number(v);
      } else {
        body[f.key] = v;
      }
    }
    onSubmit(body);
  }

  return (
    <Modal open onClose={onClose} title={`${item ? 'Edit' : 'New'} ${resource.label.replace(/s$/, '')}`}>
      <form onSubmit={handleSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {resource.fields.map((f) => (
          <div key={f.key}>
            {f.type !== 'boolean' && (
              <label className="mb-1 block text-sm font-medium text-muted">{f.label}</label>
            )}
            {f.type === 'textarea' || f.type === 'json' ? (
              <textarea
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-white focus:border-brand focus:outline-none"
                rows={f.type === 'json' ? 5 : 3}
                value={String(values[f.key])}
                onChange={(e) => setValue(f.key, e.target.value)}
              />
            ) : f.type === 'boolean' ? (
              <label className="flex items-center gap-2 text-sm text-white">
                <input
                  type="checkbox"
                  checked={Boolean(values[f.key])}
                  onChange={(e) => setValue(f.key, e.target.checked)}
                  className="h-4 w-4 accent-brand"
                />
                {f.label}
              </label>
            ) : (
              <Input
                type={f.type === 'number' ? 'number' : 'text'}
                value={String(values[f.key])}
                onChange={(e) => setValue(f.key, e.target.value)}
              />
            )}
          </div>
        ))}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving} className="flex items-center gap-1.5">
            {saving && <Spinner className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
