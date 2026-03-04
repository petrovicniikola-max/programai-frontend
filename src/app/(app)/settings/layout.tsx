'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type User } from '@/lib/api';
import Link from 'next/link';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Settings</h1>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          No access. Only SUPER_ADMIN can view settings.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-emerald-600 hover:underline dark:text-emerald-400">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
