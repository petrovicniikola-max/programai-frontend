'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreateTicketModal } from '@/components/create-ticket-modal';
import { SearchableSelect } from '@/components/searchable-select';

interface Ticket {
  id: string;
  key: string;
  title: string;
  status: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  assigneeId: string | null;
  assignee: { id: string; email: string; displayName: string | null } | null;
  createdByUserId: string | null;
  createdBy: { id: string; email: string; displayName: string | null } | null;
  company: { id: string; name: string } | null;
  contactMethod?: string | null;
  contactsContactedCount?: number | null;
}

interface TenantUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface TicketsResponse {
  items: Ticket[];
  total: number;
  page: number;
  limit: number;
}

function userLabel(u: { displayName: string | null; email: string } | null) {
  if (!u) return '—';
  return u.displayName || u.email;
}

export default function TicketsPage() {
  const [status, setStatus] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [createdByUserId, setCreatedByUserId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string>('');
   // Filter: tickets created in last N days (empty = all)
  const [createdInLastDays, setCreatedInLastDays] = useState<string>('');
  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data: users } = useQuery({
    queryKey: ['auth', 'users'],
    queryFn: async () => {
      const res = await api.get<TenantUser[]>('/auth/users');
      return res.data;
    },
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<{ id: string; role: string }>('/auth/me');
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

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', status, type, assigneeId, createdByUserId, companyId, createdInLastDays, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      if (assigneeId) params.set('assigneeId', assigneeId);
      if (createdByUserId) params.set('createdByUserId', createdByUserId);
      if (companyId) params.set('companyId', companyId);
      if (createdInLastDays) {
        const days = Number(createdInLastDays);
        if (!Number.isNaN(days) && days > 0) {
          const from = new Date();
          from.setDate(from.getDate() - days);
          params.set('createdAtFrom', from.toISOString());
        }
      }
      params.set('page', String(page));
      params.set('limit', '20');
      const res = await api.get<TicketsResponse>(`/tickets?${params.toString()}`);
      return res.data;
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Tickets</h1>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Create Ticket
        </button>
      </div>
      <CreateTicketModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        users={users}
        currentUserId={me?.id}
      />
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
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Created by</label>
          <SearchableSelect
            value={createdByUserId}
            onChange={(v) => {
              setCreatedByUserId(v);
              setPage(1);
            }}
            options={[
              { id: '', label: 'All' },
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
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Created</label>
          <select
            value={createdInLastDays}
            onChange={(e) => {
              setCreatedInLastDays(e.target.value);
              setPage(1);
            }}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
        {error && (
          <p className="p-4 text-red-600 dark:text-red-400">
            Failed to load tickets. Check backend and try again.
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
                  <th className="px-4 py-2 font-medium">Način kontakta</th>
                  <th className="px-4 py-2 font-medium">Broj kontakt.</th>
                  <th className="px-4 py-2 font-medium">Assignee</th>
                  <th className="px-4 py-2 font-medium">Created by</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                  <th className="px-4 py-2 font-medium">Updated</th>
                  <th className="px-4 py-2 font-medium">Edit</th>
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
                      {t.contactMethod === 'PHONE' ? 'Telefonski poziv' : t.contactMethod === 'EMAIL' ? 'Mail' : '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {t.contactsContactedCount != null ? String(t.contactsContactedCount) : '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {userLabel(t.assignee)}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {userLabel(t.createdBy)}
                    </td>
                    <td className="px-4 py-2 text-zinc-500 dark:text-zinc-500">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-zinc-500 dark:text-zinc-500">
                      {new Date(t.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/tickets/${t.id}`}
                        className="text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        Edit
                      </Link>
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
