'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, type Distributor } from '@/lib/api';

export default function DistributorsPage() {
  const { data: distributors = [], isLoading, error } = useQuery({
    queryKey: ['distributors'],
    queryFn: async () => {
      const res = await api.get<Distributor[]>('/distributors');
      return res.data ?? [];
    },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Distributeri</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Lista distributera iz Teron uvoza i ručnog dodeljivanja na uređajima. Klik na distributera filtrira
        uređaje.
      </p>

      {isLoading && <p className="mt-4 text-sm text-zinc-500">Učitavanje…</p>}
      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          Učitavanje distributera nije uspelo.
        </p>
      )}

      {!isLoading && !error && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-700">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Naziv</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Broj uređaja
                </th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {distributors.map((d) => (
                <tr key={d.id} className="bg-white dark:bg-zinc-800/40">
                  <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-50">{d.name}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{d._count?.devices ?? 0}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/devices?distributorId=${d.id}`}
                      className="text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      Uređaji
                    </Link>
                  </td>
                </tr>
              ))}
              {distributors.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                    Nema distributera. Uvezi Teron Excel na stranici Uređaji.
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
