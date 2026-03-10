'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, type Licence } from '@/lib/api';

export default function LicenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: licence, isLoading, error } = useQuery({
    queryKey: ['licence', id],
    queryFn: async () => {
      const res = await api.get<
        Licence & {
          company?: { id: string; name: string } | null;
          device?: { id: string; name: string | null; serialNo: string | null } | null;
        }
      >(`/licences/${id}`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div>
        <Link href="/licences" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
          ← Back to Licences
        </Link>
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (error || !licence) {
    return (
      <div>
        <Link href="/licences" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
          ← Back to Licences
        </Link>
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">Failed to load licence.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/licences" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Back to Licences
      </Link>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {licence.productName}
      </h1>
      <div className="max-w-lg rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Company</span>
          <span className="text-zinc-900 dark:text-zinc-50">
            {licence.company ? licence.company.name : '—'}
          </span>
        </div>
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Device</span>
          <span className="text-zinc-900 dark:text-zinc-50">
            {licence.device
              ? `${licence.device.name ?? ''} (${licence.device.serialNo ?? ''})`
              : '—'}
          </span>
        </div>
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Status</span>
          <span className="text-zinc-900 dark:text-zinc-50">{licence.status}</span>
        </div>
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Valid from</span>
          <span className="text-zinc-900 dark:text-zinc-50">
            {licence.validFrom ? new Date(licence.validFrom).toLocaleDateString() : '—'}
          </span>
        </div>
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Valid to</span>
          <span className="text-zinc-900 dark:text-zinc-50">
            {new Date(licence.validTo).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

