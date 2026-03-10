'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { getLicences, type Licence } from '@/lib/api';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { AddLicenceModal } from '@/components/add-licence-modal';
import { ImportLicencesModal } from '@/components/import-licences-modal';
import { useToast } from '@/components/toast';
import { LICENCES_ENDPOINT } from '@/lib/endpoints';
import { SearchableSelect } from '@/components/searchable-select';

const baseURL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'
    : 'http://localhost:3000';

export default function LicencesPage() {
  const searchParams = useSearchParams();
  const initialExpiring = searchParams.get('expiringInDays');
  const [status, setStatus] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [expiringInDays, setExpiringInDays] = useState<number | null>(
    initialExpiring ? Number(initialExpiring) || null : null,
  );
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const { showError } = useToast();

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/companies');
      return res.data ?? [];
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['licences', status, companyId, expiringInDays],
    queryFn: async () => {
      const params: {
        status?: string;
        companyId?: string;
        expiringInDays?: number;
      } = {};
      if (status) params.status = status;
      if (companyId) params.companyId = companyId;
      if (expiringInDays != null) params.expiringInDays = expiringInDays;
      return getLicences(params);
    },
  });

  const licences = data ?? [];

  async function exportCsv() {
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const q = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${baseURL}${LICENCES_ENDPOINT}/export${q}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(res.statusText);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `licences_${new Date().toISOString().slice(0, 10)}.csv`;
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
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add new Licence
          </button>
        </div>
      </div>
      <AddLicenceModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        companies={companies}
      />
      <ImportLicencesModal open={importModalOpen} onClose={() => setImportModalOpen(false)} />
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Company</span>
          <SearchableSelect
            value={companyId}
            onChange={setCompanyId}
            options={[
              { id: '', label: 'All' },
              ...companies.map((c) => ({ id: c.id, label: c.name })),
            ]}
            placeholder="All"
            searchPlaceholder="Pretraži kompanije..."
            className="min-w-[12rem]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Expiring</span>
          {([30, 14, 7, 1] as const).map((d) => {
            const active = expiringInDays === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setExpiringInDays(d)}
                className={`rounded-full px-3 py-1 text-xs ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {d} days
              </button>
            );
          })}
          {expiringInDays != null && (
            <button
              type="button"
              onClick={() => setExpiringInDays(null)}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Clear
            </button>
          )}
        </div>
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

