'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getLicences, type Licence } from '@/lib/api';
import { api } from '@/lib/api';
import { AddLicenceModal } from '@/components/add-licence-modal';

export default function LicencesPage() {
  const [status, setStatus] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/companies');
      return res.data ?? [];
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['licences', status],
    queryFn: async () => {
      const params = status ? { status } : undefined;
      return getLicences(params);
    },
  });

  const licences = data ?? [];

  let errorMessage: string | null = null;
  if (error) {
    const e = error as { response?: { status?: number; data?: { message?: string } } };
    if (e.response?.status === 404) {
      errorMessage =
        'Licences backend not available yet (404). Očekivan endpoint: GET /licences. Ako je backend path drugačiji, ažuriraj LICENCES_ENDPOINT u src/lib/endpoints.ts.';
    } else if (e.response?.data?.message) {
      errorMessage = e.response.data.message;
    } else {
      errorMessage = 'Failed to load licences.';
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Licences</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Pregled licenci. Filtriraj po statusu (ACTIVE/EXPIRED…).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Add new Licence
        </button>
      </div>
      <AddLicenceModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        companies={companies}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="ml-2 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">All</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </label>
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
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Product</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Company</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Device</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Valid to</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {licences.map((l: Licence) => (
                <tr key={l.id} className="bg-white dark:bg-zinc-800/40">
                  <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{l.productName}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{l.company?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {l.device ? `${l.device.name ?? ''} (${l.device.serialNo ?? ''})` : '—'}
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{l.status}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {new Date(l.validTo).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {new Date(l.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {licences.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-center text-sm text-zinc-500">
                    No licences found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
        Ako backend path za licence nije <code>/licences</code>, promijeni <code>LICENCES_ENDPOINT</code> u{' '}
        <code>src/lib/endpoints.ts</code>.
      </p>
    </div>
  );
}

