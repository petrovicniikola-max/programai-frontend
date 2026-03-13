'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getDevices, type Device, api, type User } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { ImportDevicesModal } from '@/components/import-devices-modal';
import { useToast } from '@/components/toast';
import { DEVICES_ENDPOINT } from '@/lib/endpoints';

const baseURL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
    : 'http://localhost:3001';

function DevicesPageInner() {
  const searchParams = useSearchParams();
  const companyIdFromUrl = searchParams.get('companyId') ?? '';
  const [search, setSearch] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const { showError } = useToast();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
  });

  const canEdit = me?.role === 'SUPER_ADMIN';

  const { data, isLoading, error } = useQuery({
    queryKey: ['devices', search, companyIdFromUrl],
    queryFn: async () => {
      const params: { search?: string; companyId?: string } = {};
      if (search.trim()) params.search = search.trim();
      if (companyIdFromUrl) params.companyId = companyIdFromUrl;
      return getDevices(Object.keys(params).length ? params : undefined);
    },
  });

  const devices = data ?? [];

  async function exportCsv() {
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      const q = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${baseURL}${DEVICES_ENDPOINT}/export${q}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(res.statusText);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devices_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Export nije uspeo.');
    }
  }

  let errorMessage: string | null = null;
  if (error) {
    const e = error as { response?: { status?: number; data?: { message?: string } } };
    if (e.response?.status === 404) {
      errorMessage =
        'Devices backend not available yet (404). Očekivan endpoint: GET /devices. Ako je backend path drugačiji, ažuriraj DEVICES_ENDPOINT u src/lib/endpoints.ts.';
    } else if (e.response?.data?.message) {
      errorMessage = e.response.data.message;
    } else {
      errorMessage = 'Failed to load devices.';
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Devices</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Lista uređaja po tenant-u. Filtriraj po serijskom broju.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600 dark:text-zinc-200"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600 dark:text-zinc-200"
          >
            Import
          </button>
          <Link
            href="/devices/add"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Dodaj novi uređaj
          </Link>
        </div>
      </div>
      <ImportDevicesModal open={importModalOpen} onClose={() => setImportModalOpen(false)} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Pretraži po serialNo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      {isLoading && <p className="mt-4 text-sm text-zinc-500">Loading…</p>}
      {errorMessage && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
      {!isLoading && !errorMessage && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-700">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Model</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Serial</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Company</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Updated</th>
                {canEdit && (
                  <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {devices.map((d: Device) => (
                <tr key={d.id} className="bg-white dark:bg-zinc-800/40">
                  <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{d.name ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{d.model ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{d.serialNo ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{d.company?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{d.status}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {new Date(d.updatedAt).toLocaleString()}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2">
                      <Link
                        href={`/devices/${d.id}`}
                        className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        Edit
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
              {devices.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="px-4 py-3 text-center text-sm text-zinc-500">
                    No devices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DevicesPage() {
  // Next.js 16: useSearchParams mora da bude unutar Suspense boundary
  return (
    <Suspense>
      <DevicesPageInner />
    </Suspense>
  );
}