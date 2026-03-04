'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Ticket {
  id: string;
  key: string;
  title: string;
  status: string;
  type: string;
  updatedAt: string;
  assigneeId: string | null;
  assignee: { id: string; email: string; displayName: string | null } | null;
  createdByUserId: string | null;
  createdBy: { id: string; email: string; displayName: string | null } | null;
  company: { id: string; name: string } | null;
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
  const [page, setPage] = useState(1);

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

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', status, type, assigneeId, createdByUserId, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      if (assigneeId) params.set('assigneeId', assigneeId);
      if (createdByUserId) params.set('createdByUserId', createdByUserId);
      params.set('page', String(page));
      params.set('limit', '20');
      const res = await api.get<TicketsResponse>(`/tickets?${params.toString()}`);
      return res.data;
    },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Tickets</h1>
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
          <select
            value={assigneeId}
            onChange={(e) => {
              setAssigneeId(e.target.value);
              setPage(1);
            }}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">All</option>
            <option value="unassigned">Unassigned</option>
            {me?.id && (
              <option value={me.id}>Me</option>
            )}
            {users?.map((u) => (
              <option key={u.id} value={u.id}>
                {userLabel(u)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Created by</label>
          <select
            value={createdByUserId}
            onChange={(e) => {
              setCreatedByUserId(e.target.value);
              setPage(1);
            }}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">All</option>
            {users?.map((u) => (
              <option key={u.id} value={u.id}>
                {userLabel(u)}
              </option>
            ))}
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
                  <th className="px-4 py-2 font-medium">Assignee</th>
                  <th className="px-4 py-2 font-medium">Created by</th>
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
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {userLabel(t.createdBy)}
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
