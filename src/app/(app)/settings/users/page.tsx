'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Modal } from '@/components/modal';
import { useToast } from '@/components/toast';

interface SettingsUser {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function SettingsUsersPage() {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<SettingsUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<SettingsUser | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: async () => {
      const res = await api.get<SettingsUser[]>('/settings/users');
      return res.data ?? [];
    },
  });

  const createUser = useMutation({
    mutationFn: async (body: { email: string; displayName?: string; password: string; role: string }) => {
      const res = await api.post<SettingsUser>('/settings/users', body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
      setCreateOpen(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to create user');
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: { displayName?: string; role?: string; isActive?: boolean } }) => {
      const res = await api.patch<SettingsUser>(`/settings/users/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
      setEditUser(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to update user');
    },
  });

  const resetPassword = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      await api.post(`/settings/users/${id}/reset-password`, { password });
    },
    onSuccess: () => {
      setResetPasswordUser(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to reset password');
    },
  });

  return (
    <div>
      <Link href="/settings" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Settings
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Users & Roles</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">Create and manage users; reset password.</p>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Create user
        </button>
      </div>
      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Display name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Role</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Active</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {users.map((u) => (
                <tr key={u.id} className="bg-white dark:bg-zinc-800/30">
                  <td className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-50">{u.email}</td>
                  <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">{u.displayName ?? '—'}</td>
                  <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">{u.role}</td>
                  <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">{u.isActive ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2 text-sm">
                    <button
                      type="button"
                      onClick={() => setEditUser(u)}
                      className="text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-zinc-400">|</span>
                    <button
                      type="button"
                      onClick={() => setResetPasswordUser(u)}
                      className="text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      Reset password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create user">
        <CreateUserForm
          onSubmit={(d) => createUser.mutate(d)}
          onCancel={() => setCreateOpen(false)}
          isLoading={createUser.isPending}
        />
      </Modal>
      {editUser && (
        <Modal open onClose={() => setEditUser(null)} title="Edit user">
          <EditUserForm
            user={editUser}
            onSubmit={(body) => updateUser.mutate({ id: editUser.id, body })}
            onCancel={() => setEditUser(null)}
            isLoading={updateUser.isPending}
          />
        </Modal>
      )}
      {resetPasswordUser && (
        <Modal open onClose={() => setResetPasswordUser(null)} title="Reset password">
          <ResetPasswordForm
            user={resetPasswordUser}
            onSubmit={(password) => resetPassword.mutate({ id: resetPasswordUser.id, password })}
            onCancel={() => setResetPasswordUser(null)}
            isLoading={resetPassword.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

function CreateUserForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (d: { email: string; displayName?: string; password: string; role: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('SUPPORT');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || password.length < 8) return;
    onSubmit({ email: email.trim(), displayName: displayName.trim() || undefined, password, role });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Display name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password * (min 8)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          <option value="SUPPORT">SUPPORT</option>
          <option value="SALES">SALES</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400">Cancel</button>
        <button type="submit" disabled={isLoading} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {isLoading ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
  );
}

function EditUserForm({
  user,
  onSubmit,
  onCancel,
  isLoading,
}: {
  user: SettingsUser;
  onSubmit: (body: { displayName?: string; role?: string; isActive?: boolean }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ displayName: displayName.trim() || undefined, role, isActive });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Editing {user.email}</p>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Display name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          <option value="SUPPORT">SUPPORT</option>
          <option value="SALES">SALES</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        <label htmlFor="isActive" className="text-sm text-zinc-700 dark:text-zinc-300">Active</label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400">Cancel</button>
        <button type="submit" disabled={isLoading} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {isLoading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function ResetPasswordForm({
  user,
  onSubmit,
  onCancel,
  isLoading,
}: {
  user: SettingsUser;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return;
    onSubmit(password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Reset password for {user.email}</p>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">New password * (min 8)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400">Cancel</button>
        <button type="submit" disabled={isLoading} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {isLoading ? 'Resetting…' : 'Reset password'}
        </button>
      </div>
    </form>
  );
}
