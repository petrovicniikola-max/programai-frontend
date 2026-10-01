'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, type User } from '@/lib/api';
import { startImpersonation } from '@/lib/auth';
import { useToast } from '@/components/toast';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  _count?: { users: number };
}

export default function PlatformTenantsPage() {
  const { showError } = useToast();
  const [impersonateTenantId, setImpersonateTenantId] = useState<string | null>(null);

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
  });

  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: async () => {
      const res = await api.get<{ items: TenantRow[] }>('/platform/tenants?limit=100');
      return res.data;
    },
    enabled: !!me?.isPlatformAdmin,
  });
  const tenants = tenantsData?.items ?? [];

  const { data: tenantUsers = [] } = useQuery({
    queryKey: ['platform', 'tenant-users', impersonateTenantId],
    queryFn: async () => {
      const res = await api.get<{ id: string; email: string; displayName: string | null; role: string }[]>(
        `/platform/tenants/${impersonateTenantId}/users`,
      );
      return res.data ?? [];
    },
    enabled: !!impersonateTenantId,
  });

  const impersonate = useMutation({
    mutationFn: async ({ tenantId, userId }: { tenantId: string; userId: string }) => {
      const res = await api.post<{ access_token: string }>('/platform/impersonate', {
        tenantId,
        userId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.access_token) {
        startImpersonation(data.access_token);
        window.location.href = '/dashboard';
      }
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Impersonation failed');
    },
  });

  if (meLoading) {
    return <p className="text-sm text-zinc-500">Učitavanje…</p>;
  }

  if (!me?.isPlatformAdmin) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Platform</h1>
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
          Nema pristupa. Potreban je platform admin nalog.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
          ← Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Platform — Tenants</h1>
      <p className="mt-1 text-sm text-zinc-500">Upravljanje tenantima i impersonacija.</p>

      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Učitavanje…</p>
      ) : (
        <table className="mt-6 w-full max-w-4xl text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700">
              <th className="py-2 pr-4">Naziv</th>
              <th className="py-2 pr-4">Slug</th>
              <th className="py-2 pr-4">Aktivan</th>
              <th className="py-2">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-3 pr-4 font-medium">{t.name}</td>
                <td className="py-3 pr-4 text-zinc-500">{t.slug}</td>
                <td className="py-3 pr-4">{t.isActive ? 'Da' : 'Ne'}</td>
                <td className="py-3">
                  <button
                    type="button"
                    onClick={() =>
                      setImpersonateTenantId(impersonateTenantId === t.id ? null : t.id)
                    }
                    className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  >
                    Impersonate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {impersonateTenantId && (
        <div className="mt-6 max-w-md rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <h2 className="text-sm font-medium">Izaberi korisnika za impersonaciju</h2>
          <ul className="mt-3 space-y-2">
            {tenantUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {u.displayName ?? u.email}{' '}
                  <span className="text-zinc-400">({u.role})</span>
                </span>
                <button
                  type="button"
                  disabled={impersonate.isPending}
                  onClick={() =>
                    impersonate.mutate({ tenantId: impersonateTenantId, userId: u.id })
                  }
                  className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Uđi
                </button>
              </li>
            ))}
            {tenantUsers.length === 0 && (
              <li className="text-zinc-500">Nema korisnika u tenantu.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
