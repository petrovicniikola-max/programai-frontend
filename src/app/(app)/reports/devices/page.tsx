'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getDevices, type Device } from '@/lib/api';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useToast } from '@/components/toast';
import { DEVICES_ENDPOINT } from '@/lib/endpoints';
import { SearchableSelect } from '@/components/searchable-select';

const baseURL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
    : 'http://localhost:3001';

type ExtraFilterKey = 'createdAt';

export default function ReportsDevicesPage() {
  const [status, setStatus] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [search, setSearch] = useState('');
  const [extraFilters, setExtraFilters] = useState<Set<ExtraFilterKey>>(new Set());
  const [createdAtFrom, setCreatedAtFrom] = useState('');
  const [createdAtTo, setCreatedAtTo] = useState('');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showError } = useToast();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/companies');
      return res.data ?? [];
    },
  });

  const queryParams = () => {
    const params: { status?: string; companyId?: string; search?: string; createdAtFrom?: string; createdAtTo?: string } = {};
    if (status) params.status = status;
    if (companyId) params.companyId = companyId;
    if (search.trim()) params.search = search.trim();
    if (createdAtFrom) params.createdAtFrom = createdAtFrom;
    if (createdAtTo) params.createdAtTo = createdAtTo;
    return params;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['devices', 'report', status, companyId, search, createdAtFrom, createdAtTo],
    queryFn: async () => getDevices(queryParams()),
  });

  const devices = data ?? [];

  function addFilter(key: ExtraFilterKey) {
    setExtraFilters((prev) => new Set(prev).add(key));
    setFilterDropdownOpen(false);
  }

  function removeFilter(key: ExtraFilterKey) {
    setExtraFilters((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setCreatedAtFrom('');
    setCreatedAtTo('');
  }

  async function exportCsv() {
    try {
      const token = getToken();
      const params = new URLSearchParams();
      const qp = queryParams();
      if (qp.status) params.set('status', qp.status);
      if (qp.companyId) params.set('companyId', qp.companyId);
      if (qp.search) params.set('search', qp.search);
      if (qp.createdAtFrom) params.set('createdAtFrom', qp.createdAtFrom);
      if (qp.createdAtTo) params.set('createdAtTo', qp.createdAtTo);
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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Pregled uređaja. Export CSV koristi iste filtere.
        </p>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600 dark:text-zinc-200"
        >
          Export CSV
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">All</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="RETIRED">RETIRED</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Company</label>
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
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Search</label>
          <input
            type="text"
            placeholder="Serial no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setFilterDropdownOpen((o) => !o)}
            className="flex items-center gap-1 rounded border border-dashed border-zinc-400 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-500 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            + Filter
          </button>
          {filterDropdownOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded border border-zinc-200 bg-white py-1 shadow dark:border-zinc-700 dark:bg-zinc-800">
              {!extraFilters.has('createdAt') && (
                <button
                  type="button"
                  onClick={() => addFilter('createdAt')}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  Created date
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {extraFilters.has('createdAt') && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded border border-zinc-200 bg-zinc-50/50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/30">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Created date
          </span>
          <input
            type="date"
            value={createdAtFrom}
            onChange={(e) => setCreatedAtFrom(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <span className="text-zinc-500">–</span>
          <input
            type="date"
            value={createdAtTo}
            onChange={(e) => setCreatedAtTo(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={() => removeFilter('createdAt')}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            title="Remove filter"
          >
            ×
          </button>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
        {error && (
          <p className="p-4 text-red-600 dark:text-red-400">
            Failed to load devices.
          </p>
        )}
        {isLoading && (
          <p className="p-4 text-zinc-500 dark:text-zinc-400">Loading…</p>
        )}
        {data && !error && (
          <>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Model</th>
                  <th className="px-4 py-2 font-medium">Serial no</th>
                  <th className="px-4 py-2 font-medium">Company</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d: Device) => (
                  <tr
                    key={d.id}
                    className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">
                      {d.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {d.model ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {d.serialNo ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {d.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {d.status}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/devices/${d.id}`}
                        className="text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {devices.length === 0 && (
              <p className="p-4 text-zinc-500 dark:text-zinc-400">No devices found.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
