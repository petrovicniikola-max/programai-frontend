'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, type Device } from '@/lib/api';

export default function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: device, isLoading, error } = useQuery({
    queryKey: ['device', id],
    queryFn: async () => {
      const res = await api.get<Device & { company?: { id: string; name: string } | null }>(`/devices/${id}`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div>
        <Link href="/devices" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
          ← Back to Devices
        </Link>
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div>
        <Link href="/devices" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
          ← Back to Devices
        </Link>
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">Failed to load device.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/devices" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Back to Devices
      </Link>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {device.name || device.model || device.serialNo || 'Device'}
      </h1>
      <div className="max-w-lg rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Serial</span>
          <span className="text-zinc-900 dark:text-zinc-50">{device.serialNo || '—'}</span>
        </div>
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Model</span>
          <span className="text-zinc-900 dark:text-zinc-50">{device.model || '—'}</span>
        </div>
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Status</span>
          <span className="text-zinc-900 dark:text-zinc-50">{device.status}</span>
        </div>
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Company</span>
          <span className="text-zinc-900 dark:text-zinc-50">
            {device.company ? device.company.name : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

