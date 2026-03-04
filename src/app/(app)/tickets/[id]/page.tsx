'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

interface TicketDetail {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  phoneRaw: string | null;
  contactName: string | null;
  callOccurredAt: string | null;
  callDurationMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string | null;
  company: { id: string; name: string; pib: string | null; mb: string | null } | null;
  contact: { id: string; name: string } | null;
  assignee: { id: string; email: string; displayName: string | null } | null;
  createdBy: { id: string; email: string; displayName: string | null } | null;
  tags: { id: string; name: string }[];
  commentsCount: number;
  openTasksCount: number;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author?: { displayName: string | null; email: string };
}

interface Task {
  id: string;
  title: string;
  isDone: boolean;
  orderNo: number;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="w-44 shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <span className="text-sm text-zinc-900 dark:text-zinc-100">{value ?? '—'}</span>
    </div>
  );
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { showError } = useToast();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const res = await api.get<TicketDetail>(`/tickets/${id}`);
      return res.data;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['ticket', id, 'comments'],
    queryFn: async () => {
      const res = await api.get<Comment[]>(`/tickets/${id}/comments`);
      return res.data;
    },
    enabled: !!ticket,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['ticket', id, 'tasks'],
    queryFn: async () => {
      const res = await api.get<Task[]>(`/tickets/${id}/tasks`);
      return res.data;
    },
    enabled: !!ticket,
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<{ id: string; role: string }>('/auth/me');
      return res.data;
    },
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ['settings', 'tags'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/settings/tags');
      return res.data;
    },
    enabled: !!ticket,
  });

  const invalidateTicket = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  };

  const patchStatus = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/tickets/${id}/status`, { status }),
    onSuccess: invalidateTicket,
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const assignToMe = useMutation({
    mutationFn: () => api.patch(`/tickets/${id}/assign-to-me`),
    onSuccess: invalidateTicket,
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const setCallTimeNow = useMutation({
    mutationFn: () => api.patch(`/tickets/${id}/call-time/now`),
    onSuccess: invalidateTicket,
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const patchTicket = useMutation({
    mutationFn: (body: { description?: string; callDurationMinutes?: number; callOccurredAt?: string }) =>
      api.patch(`/tickets/${id}`, body),
    onSuccess: invalidateTicket,
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const addComment = useMutation({
    mutationFn: (body: string) =>
      api.post(`/tickets/${id}/comments`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'comments'] });
    },
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const addTask = useMutation({
    mutationFn: (title: string) =>
      api.post(`/tickets/${id}/tasks`, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'tasks'] });
    },
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const toggleTask = useMutation({
    mutationFn: ({ taskId, isDone }: { taskId: string; isDone: boolean }) =>
      api.patch(`/tickets/${id}/tasks/${taskId}`, { isDone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'tasks'] });
    },
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const assignTags = useMutation({
    mutationFn: (tagIds: string[]) =>
      api.post(`/tickets/${id}/tags`, { tagIds }),
    onSuccess: invalidateTicket,
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const unassignTags = useMutation({
    mutationFn: (tagIds: string[]) =>
      api.delete(`/tickets/${id}/tags`, { data: { tagIds } }),
    onSuccess: invalidateTicket,
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  if (isLoading) {
    return (
      <div>
        <Link href="/tickets" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
          ← Back to Tickets
        </Link>
        <p className="mt-4 text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div>
        <Link href="/tickets" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
          ← Back to Tickets
        </Link>
        <p className="mt-4 text-red-600 dark:text-red-400">Failed to load ticket.</p>
      </div>
    );
  }

  const isAssignedToMe = me?.id && ticket.assignee?.id === me.id;
  const canEdit = true;

  return (
    <div className="space-y-6">
      <Link href="/tickets" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Back to Tickets
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {ticket.key} – {ticket.title}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</h2>
            {canEdit ? (
              <TicketDescriptionForm
                initial={ticket.description ?? ''}
                onSave={(v) => patchTicket.mutate({ description: v || undefined })}
                saving={patchTicket.isPending}
              />
            ) : (
              <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
                {ticket.description || '—'}
              </p>
            )}
          </div>

          <CommentsSection
            comments={comments}
            onAdd={(body) => addComment.mutate(body)}
            adding={addComment.isPending}
          />

          <TasksSection
            tasks={tasks}
            onAdd={(title) => addTask.mutate(title)}
            onToggle={(taskId, isDone) => toggleTask.mutate({ taskId, isDone })}
            adding={addTask.isPending}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Details</h2>
            <div className="space-y-1">
              {canEdit && (
                <>
                  <div className="flex items-center gap-2 py-2">
                    <label className="w-28 text-sm text-zinc-500">Status</label>
                    <select
                      value={ticket.status}
                      onChange={(e) => patchStatus.mutate(e.target.value)}
                      disabled={patchStatus.isPending}
                      className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="DONE">DONE</option>
                    </select>
                  </div>
                  {!isAssignedToMe && (
                    <div className="py-2">
                      <button
                        type="button"
                        onClick={() => assignToMe.mutate()}
                        disabled={assignToMe.isPending}
                        className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Assign to me
                      </button>
                    </div>
                  )}
                </>
              )}
              <DetailRow label="Type" value={ticket.type} />
              <DetailRow
                label="Created by"
                value={
                  ticket.createdBy?.displayName ||
                  ticket.createdBy?.email ||
                  (ticket.createdByUserId ? '(korisnik)' : null)
                }
              />
              <DetailRow
                label="Assignee"
                value={ticket.assignee?.displayName || ticket.assignee?.email}
              />
              <DetailRow label="Call time" value={ticket.callOccurredAt ? new Date(ticket.callOccurredAt).toLocaleString() : null} />
              {canEdit && (
                <>
                  <div className="flex items-center gap-2 py-2">
                    <button
                      type="button"
                      onClick={() => setCallTimeNow.mutate()}
                      disabled={setCallTimeNow.isPending}
                      className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
                    >
                      Set NOW
                    </button>
                  </div>
                  <div className="flex items-center gap-2 py-2">
                    <label className="w-28 text-sm text-zinc-500">Duration (min)</label>
                    <input
                      type="number"
                      min={0}
                      defaultValue={ticket.callDurationMinutes ?? ''}
                      onBlur={(e) => {
                        const v = e.target.value ? parseInt(e.target.value, 10) : undefined;
                        if (v !== undefined && !Number.isNaN(v)) patchTicket.mutate({ callDurationMinutes: v });
                      }}
                      className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                    />
                  </div>
                  <div className="flex items-center gap-2 py-2">
                    <label className="w-28 text-sm text-zinc-500">Call at</label>
                    <input
                      type="datetime-local"
                      defaultValue={
                        ticket.callOccurredAt
                          ? new Date(ticket.callOccurredAt).toISOString().slice(0, 16)
                          : ''
                      }
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v) patchTicket.mutate({ callOccurredAt: new Date(v).toISOString() });
                      }}
                      className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Contact / Company</h2>
            <DetailRow label="Contact" value={ticket.contactName ?? ticket.contact?.name} />
            <DetailRow label="Phone" value={ticket.phoneRaw} />
            <DetailRow label="Company" value={ticket.company?.name} />
            <DetailRow label="PIB" value={ticket.company?.pib} />
            <DetailRow label="MB" value={ticket.company?.mb} />
          </div>

          {canEdit && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Tags</h2>
              <div className="flex flex-wrap gap-2 mb-2">
                {ticket.tags.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center rounded bg-zinc-200 px-2 py-0.5 text-sm dark:bg-zinc-700"
                  >
                    {t.name}
                    <button
                      type="button"
                      onClick={() => unassignTags.mutate([t.id])}
                      disabled={unassignTags.isPending}
                      className="ml-1 text-zinc-500 hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <select
                className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                value=""
                onChange={(e) => {
                  const tagId = e.target.value;
                  if (tagId && !ticket.tags.some((t) => t.id === tagId))
                    assignTags.mutate([...ticket.tags.map((t) => t.id), tagId]);
                  e.target.value = '';
                }}
              >
                <option value="">Add tag…</option>
                {allTags
                  .filter((tag) => !ticket.tags.some((t) => t.id === tag.id))
                  .map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketDescriptionForm({
  initial,
  onSave,
  saving,
}: {
  initial: string;
  onSave: (v: string) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);
  useEffect(() => setValue(initial), [initial]);
  return (
    <div>
      {editing ? (
        <>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => { onSave(value); setEditing(false); }}
              disabled={saving}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setValue(initial); setEditing(false); }}
              className="rounded border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <p
          className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap cursor-pointer min-h-[2rem]"
          onClick={() => setEditing(true)}
        >
          {initial || 'Click to add description…'}
        </p>
      )}
    </div>
  );
}

function CommentsSection({
  comments,
  onAdd,
  adding,
}: {
  comments: Comment[];
  onAdd: (body: string) => void;
  adding: boolean;
}) {
  const [body, setBody] = useState('');
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Comments</h2>
      <ul className="space-y-2 mb-4">
        {comments.map((c) => (
          <li key={c.id} className="border-l-2 border-zinc-200 pl-3 py-1 text-sm dark:border-zinc-700">
            <p className="text-zinc-900 dark:text-zinc-100">{c.body}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {c.author?.displayName || c.author?.email || '—'} · {new Date(c.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add comment…"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (body.trim()) { onAdd(body.trim()); setBody(''); }
            }
          }}
        />
        <button
          type="button"
          onClick={() => { if (body.trim()) { onAdd(body.trim()); setBody(''); } }}
          disabled={adding || !body.trim()}
          className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function TasksSection({
  tasks,
  onAdd,
  onToggle,
  adding,
}: {
  tasks: Task[];
  onAdd: (title: string) => void;
  onToggle: (taskId: string, isDone: boolean) => void;
  adding: boolean;
}) {
  const [title, setTitle] = useState('');
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Tasks</h2>
      <ul className="space-y-2 mb-4">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={t.isDone}
              onChange={() => onToggle(t.id, !t.isDone)}
              className="rounded"
            />
            <span className={t.isDone ? 'line-through text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}>
              {t.title}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add task…"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (title.trim()) { onAdd(title.trim()); setTitle(''); }
            }
          }}
        />
        <button
          type="button"
          onClick={() => { if (title.trim()) { onAdd(title.trim()); setTitle(''); } }}
          disabled={adding || !title.trim()}
          className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
