'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface AuditEntry {
  id: string;
  createdAt: string;
  action: string;
  actorUserId: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: object | null;
}

export default function SettingsAuditPage() {
  const [limit, setLimit] = useState(50);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['settings', 'audit', limit],
    queryFn: async () => {
      const res = await api.get<AuditEntry[]>(`/settings/audit?limit=${limit}`);
      return res.data ?? [];
    },
  });

  return (
    <div>
      <Link href="/settings" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Settings
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Audit Log</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">Recent actions (createdAt, action, actor, entity, metadata).</p>
      <div className="mt-4 flex items-center gap-2">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">Limit</label>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </select>
      </div>
      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Created</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Action</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Actor</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Entity</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {entries.map((e) => (
                <tr key={e.id} className="bg-white dark:bg-zinc-800/30">
                  <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">{e.action}</td>
                  <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">{e.actorUserId ?? '—'}</td>
                  <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {e.entityType ?? '—'} {e.entityId ?? ''}
                  </td>
                  <td className="px-4 py-2">
                    {e.metadata && Object.keys(e.metadata).length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                        className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        {expandedId === e.id ? 'Hide' : 'Show'}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && (
            <p className="p-4 text-center text-sm text-zinc-500">No audit entries.</p>
          )}
        </div>
      )}
      {expandedId && (() => {
        const e = entries.find((x) => x.id === expandedId);
        if (!e?.metadata) return null;
        return (
          <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <pre className="text-xs text-zinc-700 dark:text-zinc-300">
              {JSON.stringify(e.metadata, null, 2)}
            </pre>
          </div>
        );
      })()}
    </div>
  );
}
