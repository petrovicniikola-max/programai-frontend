'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

interface NotificationsSettings {
  emailFromName: string | null;
  emailFromAddress: string | null;
  notificationsDaysBefore: number[];
}

export default function SettingsNotificationsPage() {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [emailFromName, setEmailFromName] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [daysText, setDaysText] = useState('30, 14, 7, 1');

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: async () => {
      const res = await api.get<NotificationsSettings>('/settings/notifications');
      return res.data;
    },
  });

  useEffect(() => {
    if (data) {
      setEmailFromName(data.emailFromName ?? '');
      setEmailFromAddress(data.emailFromAddress ?? '');
      setDaysText((data.notificationsDaysBefore ?? [30, 14, 7, 1]).join(', '));
    }
  }, [data]);

  const patch = useMutation({
    mutationFn: async (body: Partial<NotificationsSettings>) => {
      const res = await api.patch<NotificationsSettings>('/settings/notifications', body);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to update notifications');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const notificationsDaysBefore = daysText
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n >= 0);
    patch.mutate({
      emailFromName: emailFromName || undefined,
      emailFromAddress: emailFromAddress || undefined,
      notificationsDaysBefore: notificationsDaysBefore.length ? notificationsDaysBefore : undefined,
    });
  };

  return (
    <div>
      <Link href="/settings" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Settings
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Email & Notifications</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">From address and reminder days before.</p>
      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email from name</label>
            <input
              type="text"
              value={emailFromName}
              onChange={(e) => setEmailFromName(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email from address</label>
            <input
              type="email"
              value={emailFromAddress}
              onChange={(e) => setEmailFromAddress(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Reminder days before (comma-separated)</label>
            <input
              type="text"
              value={daysText}
              onChange={(e) => setDaysText(e.target.value)}
              placeholder="30, 14, 7, 1"
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
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
