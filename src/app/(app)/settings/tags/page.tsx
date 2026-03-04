'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Modal } from '@/components/modal';
import { useToast } from '@/components/toast';

interface Tag {
  id: string;
  name: string;
}

export default function SettingsTagsPage() {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['settings', 'tags'],
    queryFn: async () => {
      const res = await api.get<Tag[]>('/settings/tags');
      return res.data ?? [];
    },
  });

  const createTag = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post<Tag>('/settings/tags', { name });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'tags'] });
      setCreateOpen(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to create tag');
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/settings/tags/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'tags'] }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to delete tag');
    },
  });

  return (
    <div>
      <Link href="/settings" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Settings
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Tag Management</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">Create and delete tags used on tickets.</p>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Create tag
        </button>
      </div>
      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {tags.map((t) => (
                <tr key={t.id} className="bg-white dark:bg-zinc-800/30">
                  <td className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-50">{t.name}</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => deleteTag.mutate(t.id)}
                      disabled={deleteTag.isPending}
                      className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tags.length === 0 && (
            <p className="p-4 text-center text-sm text-zinc-500">No tags yet.</p>
          )}
        </div>
      )}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create tag">
        <CreateTagForm
          onSubmit={(name) => createTag.mutate(name)}
          onCancel={() => setCreateOpen(false)}
          isLoading={createTag.isPending}
        />
      </Modal>
    </div>
  );
}

function CreateTagForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
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
