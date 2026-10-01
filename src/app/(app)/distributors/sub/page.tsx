'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type Distributor } from '@/lib/api';
import { useTexts } from '@/lib/use-texts';

type SubDistributorRow = Distributor & { mainName: string; subName: string | null };

export default function SubDistributorsPage() {
  const t = useTexts();
  const [search, setSearch] = useState('');

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['distributors', 'sub'],
    queryFn: async () => {
      const res = await api.get<SubDistributorRow[]>('/distributors', { params: { kind: 'sub' } });
      return res.data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || q.length < 2) return rows;
    return rows.filter((d) => d.name.toLowerCase().includes(q));
  }, [rows, search]);

  const grouped = useMemo(() => {
    const m = new Map<string, SubDistributorRow[]>();
    for (const r of filtered) {
      const k = (r.mainName || '').trim() || '—';
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{t('subDistributors.title')}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {t('subDistributors.description')}
      </p>

      <div className="mt-4">
        <input
          type="text"
          placeholder={t('subDistributors.input.search.placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      {isLoading && <p className="mt-4 text-sm text-zinc-500">{t('subDistributors.loading')}</p>}
      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {t('subDistributors.error')}
        </p>
      )}

      {!isLoading && !error && (
        <div className="mt-4 space-y-6">
          {grouped.map(([mainName, list]) => (
            <div key={mainName} className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
                <div className="font-medium text-zinc-900 dark:text-zinc-50">{mainName}</div>
                <Link
                  href="/distributors"
                  className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
                  title="Uređaji glavnog distributera se prikazuju na stranici Distributeri klikom na glavnog distributera."
                >
                  {t('subDistributors.action.openDistributors')}
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-700">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">{t('subDistributors.th.name')}</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">{t('subDistributors.th.count')}</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">{t('subDistributors.th.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {list.map((d) => (
                      <tr key={d.id} className="bg-white dark:bg-zinc-800/40">
                        <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-50">{d.subName ?? d.name}</td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{d._count?.devices ?? 0}</td>
                        <td className="px-4 py-2">
                          <Link
                            href={`/devices?distributorId=${d.id}`}
                            className="text-emerald-600 hover:underline dark:text-emerald-400"
                          >
                            {t('subDistributors.action.devices')}
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {list.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                          {t('subDistributors.empty')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
              {rows.length === 0 ? t('subDistributors.empty') : t('subDistributors.empty.noResults')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

