'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

interface TicketSettings {
  defaultStatus: string;
  defaultType: string;
  defaultPriority: string;
  autoInProgressOnAssign: boolean;
}

export default function SettingsTicketsPage() {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [defaultStatus, setDefaultStatus] = useState('OPEN');
  const [defaultType, setDefaultType] = useState('OTHER');
  const [defaultPriority, setDefaultPriority] = useState('MEDIUM');
  const [autoInProgressOnAssign, setAutoInProgressOnAssign] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'tickets'],
    queryFn: async () => {
      const res = await api.get<TicketSettings>('/settings/tickets');
      return res.data;
    },
  });

  useEffect(() => {
    if (data) {
      setDefaultStatus(data.defaultStatus ?? 'OPEN');
      setDefaultType(data.defaultType ?? 'OTHER');
      setDefaultPriority(data.defaultPriority ?? 'MEDIUM');
      setAutoInProgressOnAssign(data.autoInProgressOnAssign ?? false);
    }
  }, [data]);

  const patch = useMutation({
    mutationFn: async (body: Partial<TicketSettings>) => {
      const res = await api.patch<TicketSettings>('/settings/tickets', body);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'tickets'] }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to update ticket settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    patch.mutate({
      defaultStatus,
      defaultType,
      defaultPriority,
      autoInProgressOnAssign,
    });
  };

  return (
    <div>
      <Link href="/settings" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Settings
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Ticket Settings</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">Defaults for new tickets and assignment behaviour.</p>
      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Default status</label>
            <select
              value={defaultStatus}
              onChange={(e) => setDefaultStatus(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Default type</label>
            <select
              value={defaultType}
              onChange={(e) => setDefaultType(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="CALL">CALL</option>
              <option value="SUPPORT">SUPPORT</option>
              <option value="SALES">SALES</option>
              <option value="FIELD">FIELD</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Default priority</label>
            <select
              value={defaultPriority}
              onChange={(e) => setDefaultPriority(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoInProgress"
              checked={autoInProgressOnAssign}
              onChange={(e) => setAutoInProgressOnAssign(e.target.checked)}
            />
            <label htmlFor="autoInProgress" className="text-sm text-zinc-700 dark:text-zinc-300">
              Auto set status to In progress when assigned
            </label>
          </div>
          <button
            type="submit"
            disabled={patch.isPending}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {patch.isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  );
}
