'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

interface SecuritySettings {
  jwtAccessTtlMinutes: number;
}

export default function SettingsSecurityPage() {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [jwtAccessTtlMinutes, setJwtAccessTtlMinutes] = useState(10080);

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'security'],
    queryFn: async () => {
      const res = await api.get<SecuritySettings>('/settings/security');
      return res.data;
    },
  });

  useEffect(() => {
    if (data?.jwtAccessTtlMinutes != null) {
      setJwtAccessTtlMinutes(data.jwtAccessTtlMinutes);
    }
  }, [data]);

  const patch = useMutation({
    mutationFn: async (body: { jwtAccessTtlMinutes?: number }) => {
      const res = await api.patch<SecuritySettings>('/settings/security', body);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'security'] }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to update security');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(String(jwtAccessTtlMinutes), 10);
    if (Number.isNaN(n) || n < 1) return;
    patch.mutate({ jwtAccessTtlMinutes: n });
  };

  return (
    <div>
      <Link href="/settings" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Settings
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Security</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">JWT access token TTL (minutes).</p>
      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">JWT access TTL (minutes)</label>
            <input
              type="number"
              min={1}
              value={jwtAccessTtlMinutes}
              onChange={(e) => setJwtAccessTtlMinutes(parseInt(e.target.value, 10) || 10080)}
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
