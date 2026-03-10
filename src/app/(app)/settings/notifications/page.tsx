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

type ReminderMode = 'PRESET_7' | 'PRESET_14' | 'PRESET_30' | 'CUSTOM';

interface ReminderRow {
  id: string;
  mode: ReminderMode;
  value: number; // days
}

export default function SettingsNotificationsPage() {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [emailFromName, setEmailFromName] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [reminders, setReminders] = useState<ReminderRow[]>([
    { id: 'initial-30', mode: 'PRESET_30', value: 30 },
  ]);

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
      const source = data.notificationsDaysBefore?.length
        ? data.notificationsDaysBefore
        : [30, 14, 7, 1];
      const mapped: ReminderRow[] = source.map((d, idx) => {
        let mode: ReminderMode = 'CUSTOM';
        if (d === 7) mode = 'PRESET_7';
        else if (d === 14) mode = 'PRESET_14';
        else if (d === 30) mode = 'PRESET_30';
        return { id: `row-${idx}-${d}`, mode, value: d };
      });
      setReminders(mapped.length ? mapped : [{ id: 'fallback-30', mode: 'PRESET_30', value: 30 }]);
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
    const values = reminders
      .map((r) => r.value)
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 365);
    if (!values.length) {
      showError('Dodaj bar jedan podsjetnik (1–365 dana).');
      return;
    }
    const uniqueSorted = Array.from(new Set(values)).sort((a, b) => a - b);
    patch.mutate({
      emailFromName: emailFromName || undefined,
      emailFromAddress: emailFromAddress || undefined,
      notificationsDaysBefore: uniqueSorted,
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
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Reminder days before expiry
            </label>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Možeš podesiti više podsjetnika (npr. 30, 14, 7 dana ranije). Za svaki red izaberi jednu od ponudjenih
              vrednosti ili unesi custom broj dana (1–365).
            </p>
            <div className="mt-2 space-y-2">
              {reminders.map((row, index) => (
                <div key={row.id} className="flex items-center gap-2">
                  <select
                    value={row.mode}
                    onChange={(e) => {
                      const mode = e.target.value as ReminderMode;
                      setReminders((prev) =>
                        prev.map((r) =>
                          r.id === row.id
                            ? {
                                ...r,
                                mode,
                                value:
                                  mode === 'PRESET_7'
                                    ? 7
                                    : mode === 'PRESET_14'
                                    ? 14
                                    : mode === 'PRESET_30'
                                    ? 30
                                    : r.value || 30,
                              }
                            : r,
                        ),
                      );
                    }}
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="PRESET_7">7 days before</option>
                    <option value="PRESET_14">14 days before</option>
                    <option value="PRESET_30">30 days before</option>
                    <option value="CUSTOM">Custom…</option>
                  </select>
                  {row.mode === 'CUSTOM' && (
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={row.value || 1}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setReminders((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, value: Number.isNaN(v) ? 1 : v } : r,
                          ),
                        );
                      }}
                      className="w-24 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  )}
                  {reminders.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setReminders((prev) => prev.filter((r) => r.id !== row.id))
                      }
                      className="text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                  {index === reminders.length - 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setReminders((prev) => [
                          ...prev,
                          {
                            id: `row-${Date.now()}`,
                            mode: 'PRESET_30',
                            value: 30,
                          },
                        ])
                      }
                      className="ml-auto text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      + Add reminder
                    </button>
                  )}
                </div>
              ))}
            </div>
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
