'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TodoTeam } from '@/lib/accountant-todo';
import { Modal } from '@/components/modal';
import { useToast } from '@/components/toast';
import { useTexts } from '@/lib/use-texts';

interface SettingsUser {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
}

function userLabel(u: { displayName: string | null; email: string }) {
  return u.displayName?.trim() || u.email;
}

export default function SettingsTodoTeamsPage() {
  const txt = useTexts();
  const qc = useQueryClient();
  const { showError, showSuccess } = useToast();
  const [editTeam, setEditTeam] = useState<TodoTeam | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['settings', 'todo-teams'],
    queryFn: async () => {
      const res = await api.get<TodoTeam[]>('/settings/todo-teams');
      return res.data ?? [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: async () => {
      const res = await api.get<SettingsUser[]>('/settings/users');
      return res.data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/settings/todo-teams/${id}`);
    },
    onSuccess: () => {
      showSuccess(txt('settings.todoTeams.toast.deleted'));
      void qc.invalidateQueries({ queryKey: ['settings', 'todo-teams'] });
    },
    onError: () => showError(txt('settings.todoTeams.toast.deleteError')),
  });

  return (
    <div>
      <Link href="/settings" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        {txt('settings.back')}
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {txt('settings.todoTeams.title')}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {txt('settings.todoTeams.description')}
      </p>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {txt('settings.todoTeams.btn.create')}
        </button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-zinc-500">{txt('common.loading')}</p>
      ) : teams.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">{txt('settings.todoTeams.empty')}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/80">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">
                  {txt('settings.todoTeams.th.name')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">
                  {txt('settings.todoTeams.th.members')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">
                  {txt('settings.todoTeams.th.emails')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">
                  {txt('settings.todoTeams.th.time')}
                </th>
                <th className="px-3 py-2 text-right font-medium text-zinc-600 dark:text-zinc-300">
                  {txt('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {teams.map((team) => (
                <tr key={team.id}>
                  <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">
                    {team.name}
                    {!team.isActive && (
                      <span className="ml-2 text-xs text-zinc-400">({txt('settings.todoTeams.inactive')})</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {team.memberCount ?? team.members?.length ?? 0}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {team.extraRecipients.length}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {team.reminderTime ?? txt('settings.todoTeams.timeDefault')}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setEditTeam(team)}
                      className="text-emerald-600 hover:underline dark:text-emerald-400 mr-3"
                    >
                      {txt('common.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(txt('settings.todoTeams.deleteConfirm'))) {
                          deleteMutation.mutate(team.id);
                        }
                      }}
                      className="text-red-600 hover:underline"
                    >
                      {txt('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={txt('settings.todoTeams.modal.create')}
        size="lg"
      >
        <TeamForm
          users={users}
          onCancel={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            void qc.invalidateQueries({ queryKey: ['settings', 'todo-teams'] });
          }}
        />
      </Modal>

      {editTeam && (
        <Modal
          open
          onClose={() => setEditTeam(null)}
          title={txt('settings.todoTeams.modal.edit')}
          size="lg"
        >
          <TeamForm
            team={editTeam}
            users={users}
            onCancel={() => setEditTeam(null)}
            onSaved={() => {
              setEditTeam(null);
              void qc.invalidateQueries({ queryKey: ['settings', 'todo-teams'] });
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function TeamForm({
  team,
  users,
  onCancel,
  onSaved,
}: {
  team?: TodoTeam;
  users: SettingsUser[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const txt = useTexts();
  const { showError, showSuccess } = useToast();
  const [name, setName] = useState(team?.name ?? '');
  const [reminderTime, setReminderTime] = useState(team?.reminderTime ?? '');
  const [recipientsText, setRecipientsText] = useState((team?.extraRecipients ?? []).join('\n'));
  const [isActive, setIsActive] = useState(team?.isActive ?? true);
  const [memberIds, setMemberIds] = useState<string[]>(team?.members?.map((m) => m.id) ?? []);
  const [busy, setBusy] = useState(false);

  const toggleMember = (id: string) => {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const extraRecipients = recipientsText
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      let teamId = team?.id;
      if (teamId) {
        await api.patch(`/settings/todo-teams/${teamId}`, {
          name: name.trim(),
          extraRecipients,
          reminderTime: reminderTime.trim() || null,
          isActive,
        });
      } else {
        const res = await api.post<TodoTeam>('/settings/todo-teams', {
          name: name.trim(),
          extraRecipients,
          reminderTime: reminderTime.trim() || null,
          isActive,
        });
        teamId = res.data.id;
      }

      await api.put(`/settings/todo-teams/${teamId}/members`, { userIds: memberIds });
      showSuccess(txt('settings.todoTeams.toast.saved'));
      onSaved();
    } catch {
      showError(txt('settings.todoTeams.toast.saveError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {txt('settings.todoTeams.form.name')}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {txt('settings.todoTeams.form.members')}
        </label>
        <p className="text-xs text-zinc-500 mb-2">{txt('settings.todoTeams.form.membersHint')}</p>
        <div className="max-h-48 overflow-y-auto rounded border border-zinc-200 p-2 dark:border-zinc-700">
          {users.filter((u) => u.isActive).map((u) => (
            <label key={u.id} className="flex items-center gap-2 py-1 text-sm">
              <input
                type="checkbox"
                checked={memberIds.includes(u.id)}
                onChange={() => toggleMember(u.id)}
              />
              {userLabel(u)}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {txt('settings.todoTeams.form.emails')}
        </label>
        <textarea
          value={recipientsText}
          onChange={(e) => setRecipientsText(e.target.value)}
          rows={3}
          placeholder={txt('settings.todoTeams.form.emails.placeholder')}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {txt('settings.todoTeams.form.time')}
        </label>
        <input
          type="time"
          value={reminderTime}
          onChange={(e) => setReminderTime(e.target.value)}
          className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
        />
        <p className="mt-1 text-xs text-zinc-500">{txt('settings.todoTeams.form.timeHint')}</p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        {txt('settings.todoTeams.form.active')}
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-zinc-600">
          {txt('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? txt('common.saving') : txt('common.save')}
        </button>
      </div>
    </form>
  );
}
