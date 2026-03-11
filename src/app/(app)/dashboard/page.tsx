'use client';

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
  assignee: { id: string; displayName: string | null; email: string } | null;
}

interface TicketsResponse {
  items: Ticket[];
  total: number;
}

interface DevicesStats {
  activeCount: number;
}

interface LicencesStats {
  activeCount: number;
  expiring: Record<string, number>;
  expiringDays?: number[];
}

function Widget({
  title,
  href,
  children,
  loading,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</h2>
        <Link
          href={href}
          className="text-sm text-emerald-600 hover:underline dark:text-emerald-400"
        >
          View all →
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        children
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<{ id: string }>('/auth/me');
      return res.data;
    },
  });

  const { data: myOpen, isLoading: myOpenLoading } = useQuery({
    queryKey: ['tickets', 'dashboard-my', me?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (me?.id) params.set('assigneeId', me.id);
      params.set('limit', '5');
      const res = await api.get<TicketsResponse>(`/tickets?${params.toString()}`);
      return res.data;
    },
    enabled: !!me?.id,
  });

  const { data: unassigned, isLoading: unassignedLoading } = useQuery({
    queryKey: ['tickets', 'dashboard-unassigned'],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('assigneeId', 'unassigned');
      params.set('status', 'OPEN');
      params.set('limit', '5');
      const res = await api.get<TicketsResponse>(`/tickets?${params.toString()}`);
      return res.data;
    },
  });

  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ['tickets', 'dashboard-recent'],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '10');
      const res = await api.get<TicketsResponse>(`/tickets?${params.toString()}`);
      return res.data;
    },
  });

  const { data: deviceStats, isLoading: deviceStatsLoading } = useQuery({
    queryKey: ['devices', 'stats'],
    queryFn: async () => {
      const res = await api.get<DevicesStats>('/devices/stats');
      return res.data;
    },
  });

  const { data: licenceStats, isLoading: licenceStatsLoading } = useQuery({
    queryKey: ['licences', 'stats'],
    queryFn: async () => {
      const res = await api.get<LicencesStats>('/licences/stats');
      return res.data;
    },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Quick overview of your tickets.
      </p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Widget
          title="My Open tickets"
          href={me?.id ? `/tickets?assigneeId=${me.id}&status=OPEN` : '/tickets'}
          loading={myOpenLoading}
        >
          <ul className="space-y-2">
            {myOpen?.items
              .filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')
              .slice(0, 5)
              .map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tickets/${t.id}`}
                    className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    {t.key}
                  </Link>
                  <span className="ml-2 text-sm text-zinc-500">{t.title}</span>
                </li>
              ))}
            {myOpen && myOpen.items.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length === 0 && (
              <li className="text-sm text-zinc-500">No open tickets assigned to you.</li>
            )}
          </ul>
        </Widget>
        <Widget
          title="Unassigned Open"
          href="/tickets?assigneeId=unassigned&status=OPEN"
          loading={unassignedLoading}
        >
          <ul className="space-y-2">
            {unassigned?.items.slice(0, 5).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tickets/${t.id}`}
                  className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  {t.key}
                </Link>
                <span className="ml-2 text-sm text-zinc-500">{t.title}</span>
              </li>
            ))}
            {unassigned && unassigned.items.length === 0 && (
              <li className="text-sm text-zinc-500">No unassigned open tickets.</li>
            )}
          </ul>
        </Widget>
        <Widget
          title="Recent tickets"
          href="/tickets"
          loading={recentLoading}
        >
          <ul className="space-y-2">
            {recent?.items.slice(0, 5).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tickets/${t.id}`}
                  className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  {t.key}
                </Link>
                <span className="ml-2 text-sm text-zinc-500">{t.title}</span>
                <span className="ml-2 text-xs text-zinc-400">{t.status}</span>
              </li>
            ))}
          </ul>
        </Widget>
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Widget
          title="Devices overview"
          href="/devices"
          loading={deviceStatsLoading}
        >
          <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {deviceStats?.activeCount ?? '—'}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Active devices
          </p>
        </Widget>
        <Widget
          title="Licences overview"
          href="/licences"
          loading={licenceStatsLoading}
        >
          <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {licenceStats?.activeCount ?? '—'}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Active licences
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(licenceStats?.expiringDays ?? [30, 14, 7, 1]).map((d, i, arr) => {
              const prev = i < arr.length - 1 ? arr[i + 1]! : 0;
              const from = prev + 1;
              const to = d;
              const label = d === 1 ? '≤1d' : `${d}d`;
              const href = from < to
                ? `/licences?expiringFromDays=${from}&expiringToDays=${to}`
                : `/licences?expiringFromDays=0&expiringToDays=${to}`;
              return (
                <Link
                  key={d}
                  href={href}
                  className="inline-flex items-center rounded-full border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/60 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                >
                  <span className="mr-1 font-semibold">
                    {licenceStats?.expiring?.[String(d)] ?? 0}
                  </span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </Widget>
      </div>
    </div>
  );
}
