'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getDevices, type Device } from '@/lib/api';
import { api } from '@/lib/api';
import { AddDeviceModal } from '@/components/add-device-modal';

export default function DevicesPage() {
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/companies');
      return res.data ?? [];
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['devices', search],
    queryFn: async () => {
      const params = search.trim() ? { search: search.trim() } : undefined;
      return getDevices(params);
    },
  });

  const devices = data ?? [];

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
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Add new device
        </button>
      </div>
      <AddDeviceModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        companies={companies}
      />
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
                </tr>
              ))}
              {devices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-center text-sm text-zinc-500">
                    No devices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
        Ako backend path za uređaje nije <code>/devices</code>, promijeni <code>DEVICES_ENDPOINT</code> u{' '}
        <code>src/lib/endpoints.ts</code>.
      </p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
        Nazad na{' '}
        <Link href="/dashboard" className="text-emerald-600 hover:underline dark:text-emerald-400">
          Dashboard
        </Link>
        .
      </p>
    </div>
  );
}

