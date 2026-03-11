'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { SearchableSelect } from '@/components/searchable-select';
import { useToast } from '@/components/toast';

interface Ticket {
  id: string;
  key: string;
  title: string;
  status: string;
  type: string;
  updatedAt: string;
  assignee: { id: string; displayName: string | null; email: string } | null;
  createdBy: { id: string; displayName: string | null; email: string } | null;
  company: { id: string; name: string } | null;
}

interface TicketsResponse {
  items: Ticket[];
  total: number;
  page: number;
  limit: number;
}

interface TenantUser {
  id: string;
  email: string;
  displayName: string | null;
}

function userLabel(u: { displayName: string | null; email: string } | null) {
  if (!u) return '—';
  return u.displayName || u.email;
}

const baseURL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
    : 'http://localhost:3001';

type ExtraFilterKey = 'createdAt' | 'updatedAt';

export default function ReportsTicketsPage() {
  const [status, setStatus] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [extraFilters, setExtraFilters] = useState<Set<ExtraFilterKey>>(new Set());
  const [createdAtFrom, setCreatedAtFrom] = useState('');
  const [createdAtTo, setCreatedAtTo] = useState('');
  const [updatedAtFrom, setUpdatedAtFrom] = useState('');
  const [updatedAtTo, setUpdatedAtTo] = useState('');
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

  const { data: users } = useQuery({
    queryKey: ['auth', 'users'],
    queryFn: async () => {
      const res = await api.get<TenantUser[]>('/auth/users');
      return res.data;
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/companies');
      return res.data ?? [];
    },
  });

  const queryParams = () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    if (assigneeId) params.set('assigneeId', assigneeId);
    if (companyId) params.set('companyId', companyId);
    if (createdAtFrom) params.set('createdAtFrom', createdAtFrom);
    if (createdAtTo) params.set('createdAtTo', createdAtTo);
    if (updatedAtFrom) params.set('updatedAtFrom', updatedAtFrom);
    if (updatedAtTo) params.set('updatedAtTo', updatedAtTo);
    return params;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: [
      'tickets',
      'report',
      status,
      type,
      assigneeId,
      companyId,
      createdAtFrom,
      createdAtTo,
      updatedAtFrom,
      updatedAtTo,
      page,
    ],
    queryFn: async () => {
      const params = queryParams();
      params.set('page', String(page));
      params.set('limit', '20');
      const res = await api.get<TicketsResponse>(`/tickets?${params.toString()}`);
      return res.data;
    },
  });

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
    if (key === 'createdAt') {
      setCreatedAtFrom('');
      setCreatedAtTo('');
    } else {
      setUpdatedAtFrom('');
      setUpdatedAtTo('');
    }
    setPage(1);
  }

  async function exportCsv() {
    try {
      const token = getToken();
      const params = queryParams();
      const res = await fetch(`${baseURL}/reports/tickets/export?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(res.statusText);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets_${new Date().toISOString().slice(0, 10)}.csv`;
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
          Pregled tiketa po filterima. Export CSV koristi iste filtere.
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
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">All</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="DONE">DONE</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Type</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">All</option>
            <option value="CALL">CALL</option>
            <option value="SUPPORT">SUPPORT</option>
            <option value="SALES">SALES</option>
            <option value="FIELD">FIELD</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Assignee</label>
          <SearchableSelect
            value={assigneeId}
            onChange={(v) => {
              setAssigneeId(v);
              setPage(1);
            }}
            options={[
              { id: '', label: 'All' },
              { id: 'unassigned', label: 'Unassigned' },
              ...(users ?? []).map((u) => ({ id: u.id, label: userLabel(u) })),
            ]}
            placeholder="All"
            searchPlaceholder="Pretraži..."
            className="min-w-[10rem]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Company</label>
          <SearchableSelect
            value={companyId}
            onChange={(v) => {
              setCompanyId(v);
              setPage(1);
            }}
            options={[
              { id: '', label: 'All' },
              ...companies.map((c) => ({ id: c.id, label: c.name })),
            ]}
            placeholder="All"
            searchPlaceholder="Pretraži kompanije..."
            className="min-w-[12rem]"
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
              {!extraFilters.has('updatedAt') && (
                <button
                  type="button"
                  onClick={() => addFilter('updatedAt')}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  Updated date
                </button>
              )}
              {(extraFilters.has('createdAt') || extraFilters.has('updatedAt')) && (
                <div className="border-t border-zinc-200 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  Add another filter
                </div>
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
            onChange={(e) => {
              setCreatedAtFrom(e.target.value);
              setPage(1);
            }}
            className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <span className="text-zinc-500">–</span>
          <input
            type="date"
            value={createdAtTo}
            onChange={(e) => {
              setCreatedAtTo(e.target.value);
              setPage(1);
            }}
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
      {extraFilters.has('updatedAt') && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded border border-zinc-200 bg-zinc-50/50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/30">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Updated date
          </span>
          <input
            type="date"
            value={updatedAtFrom}
            onChange={(e) => {
              setUpdatedAtFrom(e.target.value);
              setPage(1);
            }}
            className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <span className="text-zinc-500">–</span>
          <input
            type="date"
            value={updatedAtTo}
            onChange={(e) => {
              setUpdatedAtTo(e.target.value);
              setPage(1);
            }}
            className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={() => removeFilter('updatedAt')}
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
            Failed to load tickets.
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
                  <th className="px-4 py-2 font-medium">Key</th>
                  <th className="px-4 py-2 font-medium">Title</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Company</th>
                  <th className="px-4 py-2 font-medium">Assignee</th>
                  <th className="px-4 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/tickets/${t.id}`}
                        className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        {t.key}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">{t.title}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{t.status}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{t.type}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {t.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {userLabel(t.assignee)}
                    </td>
                    <td className="px-4 py-2 text-zinc-500 dark:text-zinc-500">
                      {new Date(t.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.items.length === 0 && (
              <p className="p-4 text-zinc-500 dark:text-zinc-400">No tickets found.</p>
            )}
            {data.total > data.limit && (
              <div className="flex justify-end gap-2 border-t border-zinc-200 p-2 dark:border-zinc-700">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="py-1 text-sm">
                  Page {page} of {Math.ceil(data.total / data.limit)}
                </span>
                <button
                  type="button"
                  disabled={page >= Math.ceil(data.total / data.limit)}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
