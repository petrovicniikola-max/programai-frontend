'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateDdMmYyyy } from '@/lib/date-format';
import { useToast } from '@/components/toast';
import type { AccountantTodo } from '@/lib/accountant-todo';
import { useTexts } from '@/lib/use-texts';

type TodoTab = 'mine' | 'team' | 'completed';

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dueDateClass(todo: AccountantTodo): string {
  if (todo.isOverdue) return 'text-red-600 dark:text-red-400 font-medium';
  if (todo.isDueToday) return 'text-amber-600 dark:text-amber-400 font-medium';
  return 'text-zinc-600 dark:text-zinc-400';
}

function displayName(user: AccountantTodo['user']): string {
  return user.displayName?.trim() || user.email;
}

export default function TodoPage() {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const txt = useTexts();
  const [tab, setTab] = useState<TodoTab>('mine');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const queryKey = ['accountant-todos', tab, teamFilter];

  const { data: myTeams = [] } = useQuery({
    queryKey: ['accountant-todos', 'my-teams'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/accountant-todos/my-teams');
      return res.data ?? [];
    },
  });

  const { data: todos = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ tab });
      if (tab === 'team' && teamFilter) params.set('teamId', teamFilter);
      const res = await api.get<AccountantTodo[]>(`/accountant-todos?${params.toString()}`);
      return res.data ?? [];
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['accountant-todos'] });
    void queryClient.invalidateQueries({ queryKey: ['accountant-todos', 'dashboard'] });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await api.post<AccountantTodo>('/accountant-todos', {
        title,
        reminderEnabled: true,
      });
      return res.data;
    },
    onSuccess: () => {
      setNewTitle('');
      invalidate();
    },
    onError: () => showError(txt('todo.toast.createError')),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Partial<{
        title: string;
        dueDate: string | null;
        reminderEnabled: boolean;
        status: 'ACTIVE' | 'COMPLETED';
      }>;
    }) => {
      const res = await api.patch<AccountantTodo>(`/accountant-todos/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: () => showError(txt('todo.toast.saveError')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/accountant-todos/${id}`);
    },
    onSuccess: () => {
      setDeleteConfirmId(null);
      invalidate();
    },
    onError: () => showError(txt('todo.toast.deleteError')),
  });

  const tabCounts = useQuery({
    queryKey: ['accountant-todos', 'counts'],
    queryFn: async () => {
      const [mine, team] = await Promise.all([
        api.get<AccountantTodo[]>('/accountant-todos?tab=mine'),
        api.get<AccountantTodo[]>('/accountant-todos?tab=team'),
      ]);
      return { mine: mine.data?.length ?? 0, team: team.data?.length ?? 0 };
    },
  });

  const tabs: { id: TodoTab; label: string; count?: number }[] = useMemo(
    () => [
      { id: 'mine', label: txt('todo.tab.mine'), count: tabCounts.data?.mine },
      { id: 'team', label: txt('todo.tab.team'), count: tabCounts.data?.team },
      { id: 'completed', label: txt('todo.tab.completed') },
    ],
    [tabCounts.data],
  );

  const handleNewBlur = () => {
    const title = newTitle.trim();
    if (!title || createMutation.isPending) return;
    createMutation.mutate(title);
  };

  const handleNewKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleNewBlur();
    }
  };

  const isStrikethrough = (todo: AccountantTodo) =>
    todo.status === 'COMPLETED' && (todo.completedToday || tab === 'completed');

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{txt('todo.title')}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">{txt('todo.description')}</p>

      <div className="mt-4 flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {t.label}
            {t.count != null ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {tab === 'team' && myTeams.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">{txt('todo.filter.team')}:</label>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="">{txt('todo.filter.allTeams')}</option>
            {myTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <p className="mt-6 text-sm text-zinc-500">{txt('common.loading')}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/80">
              <tr>
                {tab === 'team' || tab === 'completed' ? (
                  <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">
                    {txt('todo.th.user')}
                  </th>
                ) : null}
                {tab === 'team' && (
                  <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">
                    {txt('todo.th.teams')}
                  </th>
                )}
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">
                  {txt('todo.th.task')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">
                  {txt('todo.th.due')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">
                  {txt('todo.th.reminder')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">
                  {txt('todo.th.status')}
                </th>
                {tab === 'completed' && (
                  <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">
                    {txt('todo.th.completedAt')}
                  </th>
                )}
                {tab === 'mine' && (
                  <th className="px-3 py-2 text-right font-medium text-zinc-600 dark:text-zinc-300">
                    {txt('todo.th.actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {todos.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  tab={tab}
                  editing={editingId === todo.id}
                  onEdit={() => setEditingId(todo.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onUpdate={(body) => updateMutation.mutate({ id: todo.id, body })}
                  onDelete={() => setDeleteConfirmId(todo.id)}
                  strikethrough={isStrikethrough(todo)}
                  saving={updateMutation.isPending}
                />
              ))}

              {tab === 'mine' && (
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/30">
                  <td className="px-3 py-2" colSpan={5}>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onBlur={handleNewBlur}
                      onKeyDown={handleNewKeyDown}
                      placeholder={txt('todo.new.placeholder')}
                      className="w-full rounded border border-dashed border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900"
                      disabled={createMutation.isPending}
                    />
                  </td>
                </tr>
              )}

              {todos.length === 0 && tab !== 'mine' && (
                <tr>
                  <td
                    colSpan={tab === 'team' ? 5 : tab === 'completed' ? 6 : 5}
                    className="px-3 py-6 text-center text-zinc-500"
                  >
                    {txt('todo.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-lg dark:bg-zinc-900">
            <p className="text-sm text-zinc-800 dark:text-zinc-100">
              {txt('todo.delete.confirm')}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="rounded px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400"
              >
                {txt('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {txt('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TodoRow({
  todo,
  tab,
  editing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  strikethrough,
  saving,
}: {
  todo: AccountantTodo;
  tab: TodoTab;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (body: Partial<{
    title: string;
    dueDate: string | null;
    reminderEnabled: boolean;
    status: 'ACTIVE' | 'COMPLETED';
  }>) => void;
  onDelete: () => void;
  strikethrough: boolean;
  saving: boolean;
}) {
  const isCompleted = todo.status === 'COMPLETED' || todo.completedToday;
  const [title, setTitle] = useState(todo.title);
  const [dueDate, setDueDate] = useState(todo.dueDate?.slice(0, 10) ?? '');
  const [reminder, setReminder] = useState(todo.reminderEnabled);
  const [status, setStatus] = useState<'ACTIVE' | 'COMPLETED'>(isCompleted ? 'COMPLETED' : 'ACTIVE');
  const readOnly = tab !== 'mine' || !editing;

  useEffect(() => {
    setTitle(todo.title);
    setDueDate(todo.dueDate?.slice(0, 10) ?? '');
    setReminder(todo.reminderEnabled);
    setStatus(todo.status === 'COMPLETED' || todo.completedToday ? 'COMPLETED' : 'ACTIVE');
  }, [todo]);

  const saveIfChanged = () => {
    const body: Partial<{
      title: string;
      dueDate: string | null;
      reminderEnabled: boolean;
    }> = {};
    if (title.trim() !== todo.title) body.title = title.trim();
    const newDue = dueDate || null;
    const oldDue = todo.dueDate?.slice(0, 10) ?? null;
    if (newDue !== oldDue) body.dueDate = newDue;
    if (reminder !== todo.reminderEnabled) body.reminderEnabled = reminder;
    if (Object.keys(body).length > 0) onUpdate(body);
  };

  const handleCloseEdit = () => {
    saveIfChanged();
    onCancelEdit();
  };

  const statusBadgeClass =
    isCompleted
      ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';

  return (
    <tr>
      {(tab === 'team' || tab === 'completed') && (
        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
          {displayName(todo.user)}
        </td>
      )}
      {tab === 'team' && (
        <td className="px-3 py-2 text-xs text-zinc-500 whitespace-nowrap">
          {(todo.sharedTeams ?? []).join(', ') || '—'}
        </td>
      )}
      <td className="px-3 py-2">
        {readOnly ? (
          <span className={strikethrough ? 'line-through text-zinc-500' : ''}>{todo.title}</span>
        ) : (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveIfChanged}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveIfChanged();
              }
            }}
            className="w-full rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800"
            disabled={saving}
          />
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        {readOnly ? (
          <span className={dueDateClass(todo)}>
            {todo.dueDate ? formatDateDdMmYyyy(todo.dueDate) : '—'}
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              onBlur={saveIfChanged}
              className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800"
              disabled={saving}
            />
            <button
              type="button"
              onClick={() => {
                setDueDate(todayIso());
                onUpdate({ dueDate: todayIso() });
              }}
              className="rounded border px-2 py-1 text-xs dark:border-zinc-600"
            >
              Danas
            </button>
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        {readOnly ? (
          todo.reminderEnabled ? 'Da' : 'Ne'
        ) : (
          <input
            type="checkbox"
            checked={reminder}
            onChange={(e) => {
              setReminder(e.target.checked);
              onUpdate({ reminderEnabled: e.target.checked });
            }}
            disabled={saving}
          />
        )}
      </td>
      <td className="px-3 py-2">
        {tab === 'mine' && editing ? (
          <select
            value={status}
            onChange={(e) => {
              const next = e.target.value as 'ACTIVE' | 'COMPLETED';
              setStatus(next);
              onUpdate({ status: next });
            }}
            disabled={saving}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="ACTIVE">Aktivan</option>
            <option value="COMPLETED">Završen</option>
          </select>
        ) : tab === 'mine' ? (
          <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${statusBadgeClass}`}>
            {isCompleted ? 'Završen' : 'Aktivan'}
          </span>
        ) : (
          <span className="text-zinc-500">{todo.status === 'COMPLETED' ? 'Završen' : 'Aktivan'}</span>
        )}
      </td>
      {tab === 'completed' && (
        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
          {todo.completedAt ? formatDateDdMmYyyy(todo.completedAt) : '—'}
        </td>
      )}
      {tab === 'mine' && (
        <td className="px-3 py-2 text-right whitespace-nowrap">
          {!editing ? (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="text-emerald-600 hover:underline dark:text-emerald-400 text-xs mr-2"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="text-red-600 hover:underline dark:text-red-400 text-xs"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleCloseEdit}
              className="text-emerald-600 hover:underline dark:text-emerald-400 text-xs font-medium"
            >
              Zatvori
            </button>
          )}
        </td>
      )}
    </tr>
  );
}
