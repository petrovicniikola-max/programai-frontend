'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type User } from '@/lib/api';
import { formatDateDdMmYyyy, formatDateRangeDdMmYyyy } from '@/lib/date-format';
import { canViewResource, isSuperAdmin } from '@/lib/permissions';
import { useTexts } from '@/lib/use-texts';
import type { AccountantTodo } from '@/lib/accountant-todo';
import { AdminDashboardPanel } from '@/components/admin-dashboard-panel';

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
  viewAllLabel = 'View all →',
  loadingLabel = 'Loading…',
}: {
  title: string;
  href: string;
  children: React.ReactNode;
  loading?: boolean;
  viewAllLabel?: string;
  loadingLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</h2>
        <Link
          href={href}
          className="text-sm text-emerald-600 hover:underline dark:text-emerald-400"
        >
          {viewAllLabel}
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-zinc-500">{loadingLabel}</p>
      ) : (
        children
      )}
    </div>
  );
}

export default function DashboardPage() {
  const txt = useTexts();
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
  });

  const accountantView = canViewResource(me?.permissions, 'todo', me?.role);
  const canViewLicences = canViewResource(me?.permissions, 'licences', me?.role);
  const adminDashboard = isSuperAdmin(me?.role);

  const { data: todoDashboard, isLoading: todoDashboardLoading } = useQuery({
    queryKey: ['accountant-todos', 'dashboard'],
    queryFn: async () => {
      const res = await api.get<{ mine: AccountantTodo[]; team: AccountantTodo[] }>(
        '/accountant-todos/dashboard',
      );
      return res.data;
    },
    enabled: accountantView,
    staleTime: 30_000,
  });

  const { data: myOpen, isLoading: myOpenLoading } = useQuery({
    queryKey: ['tickets', 'dashboard-my', me?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (me?.id) params.set('assigneeId', me.id);
      params.set('limit', '10');
      const res = await api.get<TicketsResponse>(`/tickets?${params.toString()}`);
      return res.data;
    },
    enabled: !!me?.id && !accountantView && !adminDashboard,
    staleTime: 30_000,
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
    staleTime: 30_000,
    enabled: !accountantView && !adminDashboard,
  });

  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ['tickets', 'dashboard-recent'],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '10');
      const res = await api.get<TicketsResponse>(`/tickets?${params.toString()}`);
      return res.data;
    },
    staleTime: 30_000,
    enabled: !accountantView && !adminDashboard,
  });

  const { data: deviceStats, isLoading: deviceStatsLoading } = useQuery({
    queryKey: ['devices', 'stats'],
    queryFn: async () => {
      const res = await api.get<DevicesStats>('/devices/stats');
      return res.data;
    },
    staleTime: 120_000,
    enabled: !accountantView && !adminDashboard,
  });

  const { data: licenceStats, isLoading: licenceStatsLoading } = useQuery({
    queryKey: ['licences', 'stats'],
    queryFn: async () => {
      const res = await api.get<LicencesStats>('/licences/stats');
      return res.data;
    },
    enabled: canViewLicences && !adminDashboard,
    staleTime: 120_000,
  });

  const { data: absentToday, isLoading: absentTodayLoading } = useQuery({
    queryKey: ['leave', 'absent-today'],
    queryFn: async () => {
      const res = await api.get<{
        date: string;
        absences: {
          requestId: string;
          displayName: string | null;
          email: string;
          jobTitle: string | null;
          type: string;
          startDate: string;
          endDate: string;
        }[];
      }>('/leave/absent-today');
      return res.data;
    },
    staleTime: 60_000,
  });

  const { data: leaveBalances, isLoading: leaveBalancesLoading } = useQuery({
    queryKey: ['leave', 'balances', 'me'],
    queryFn: async () => {
      const res = await api.get<{
        annual: { kind: string; availableDays: number; expiresAt: string }[];
        annualAvailable: number;
        personal: { available: number; total: number };
        paidAbsence: { available: number; total: number };
      }>('/leave/balances/me');
      return res.data;
    },
    staleTime: 60_000,
  });

  const [leaveCardIndex, setLeaveCardIndex] = useState(0);
  const leaveCards = [
    {
      title: 'Godišnji odmor',
      value: leaveBalances?.annualAvailable ?? '—',
      suffix: 'available days',
      detail: (() => {
        if (leaveBalances?.annualAvailable == null) return undefined;
        const stari =
          leaveBalances.annual
            .filter((b) => b.kind === 'PREVIOUS')
            .reduce((s, b) => s + b.availableDays, 0) ?? 0;
        const novi = leaveBalances.annualAvailable - stari;
        if (stari > 0) return `Stari: ${stari} · Novi: ${novi}`;
        return `Novi: ${novi}`;
      })(),
    },
    {
      title: 'Slobodni dani',
      value: leaveBalances?.personal.available ?? '—',
      suffix: 'available days',
      detail: `od ${leaveBalances?.personal.total ?? 5} godišnje`,
    },
    {
      title: 'Plaćeno odsustvo',
      value: leaveBalances?.paidAbsence.available ?? '—',
      suffix: 'available days',
      detail: `od ${leaveBalances?.paidAbsence.total ?? 5} godišnje`,
    },
  ];
  const activeLeaveCard = leaveCards[leaveCardIndex % leaveCards.length];

  const LEAVE_TYPE_LABELS: Record<string, string> = {
    ANNUAL: 'Godišnji odmor',
    PERSONAL: 'Slobodni dani',
    PAID_ABSENCE: 'Plaćeno odsustvo',
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {adminDashboard ? 'Kontrolna tabla' : txt('dashboard.title')}
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {adminDashboard
          ? 'Pregled licence, uređaja, distributera i tiketa.'
          : accountantView
            ? txt('dashboard.description.accountant')
            : txt('dashboard.description.default')}
      </p>

      {adminDashboard && (
        <div className="mt-6">
          <AdminDashboardPanel />
        </div>
      )}

      {!adminDashboard && accountantView && (
        <div className="mt-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{txt('dashboard.todo.widget.title')}</h2>
              <Link
                href="/todo"
                className="text-sm text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {txt('dashboard.todo.openAll')}
              </Link>
            </div>
            {todoDashboardLoading ? (
              <p className="text-sm text-zinc-500">{txt('common.loading')}</p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                    {txt('dashboard.todo.mineTasks')}
                  </h3>
                  <ul className="space-y-2">
                    {(todoDashboard?.mine ?? []).map((t) => (
                      <li
                        key={t.id}
                        className={`text-sm ${
                          t.status === 'COMPLETED' || t.completedToday
                            ? 'line-through text-zinc-500'
                            : 'text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        {t.title}
                        {t.dueDate && (
                          <span className="ml-2 text-xs text-zinc-400">
                            · {formatDateDdMmYyyy(t.dueDate)}
                          </span>
                        )}
                      </li>
                    ))}
                    {(todoDashboard?.mine ?? []).length === 0 && (
                      <li className="text-sm text-zinc-500">{txt('dashboard.todo.empty.mine')}</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                    {txt('dashboard.todo.teamToday')}
                  </h3>
                  <ul className="space-y-2">
                    {(todoDashboard?.team ?? []).map((t) => (
                      <li key={t.id} className="text-sm text-zinc-700 dark:text-zinc-300">
                        <span className="font-medium">
                          {t.user.displayName?.trim() || t.user.email}:
                        </span>{' '}
                        {t.title}
                        {t.dueDate && (
                          <span className="ml-1 text-xs text-zinc-400">
                            · {formatDateDdMmYyyy(t.dueDate)}
                          </span>
                        )}
                      </li>
                    ))}
                    {(todoDashboard?.team ?? []).length === 0 && (
                      <li className="text-sm text-zinc-500">{txt('dashboard.todo.empty.team')}</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!adminDashboard && !accountantView && (
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Widget
          title={txt('dashboard.widget.myOpen')}
          href={me?.id ? `/tickets?assigneeId=${me.id}&status=OPEN` : '/tickets'}
          loading={myOpenLoading}
          viewAllLabel={txt('common.viewAll')}
          loadingLabel={txt('common.loading')}
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
              <li className="text-sm text-zinc-500">{txt('dashboard.empty.myOpen')}</li>
            )}
          </ul>
        </Widget>
        <Widget
          title={txt('dashboard.widget.unassigned')}
          href="/tickets?assigneeId=unassigned&status=OPEN"
          loading={unassignedLoading}
          viewAllLabel={txt('common.viewAll')}
          loadingLabel={txt('common.loading')}
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
              <li className="text-sm text-zinc-500">{txt('dashboard.empty.unassigned')}</li>
            )}
          </ul>
        </Widget>
        <Widget
          title={txt('dashboard.widget.recent')}
          href="/tickets"
          loading={recentLoading}
          viewAllLabel={txt('common.viewAll')}
          loadingLabel={txt('common.loading')}
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
      )}

      {!adminDashboard && (
      <div className={`mt-6 grid gap-6 sm:grid-cols-2 ${accountantView ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
        {!accountantView && (
        <Widget
          title={txt('dashboard.widget.devices')}
          href="/devices"
          loading={deviceStatsLoading}
          viewAllLabel={txt('common.viewAll')}
          loadingLabel={txt('common.loading')}
        >
          <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {deviceStats?.activeCount ?? '—'}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {txt('dashboard.widget.devices.sub')}
          </p>
        </Widget>
        )}
        {canViewLicences && (
        <Widget
          title={txt('dashboard.widget.licences')}
          href="/licences"
          loading={licenceStatsLoading}
          viewAllLabel={txt('common.viewAll')}
          loadingLabel={txt('common.loading')}
        >
          <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {licenceStats?.activeCount ?? '—'}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {txt('dashboard.widget.licences.sub')}
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
        )}
        <Widget title={txt('dashboard.widget.leave')} href="/leave" loading={leaveBalancesLoading} viewAllLabel={txt('common.viewAll')} loadingLabel={txt('common.loading')}>
          <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {activeLeaveCard.value}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {activeLeaveCard.title} — {activeLeaveCard.suffix}
          </p>
          {activeLeaveCard.detail && (
            <p className="mt-1 text-xs text-zinc-400">{activeLeaveCard.detail}</p>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
            <button
              type="button"
              onClick={() =>
                setLeaveCardIndex((i) => (i - 1 + leaveCards.length) % leaveCards.length)
              }
              className="rounded border px-2 py-0.5 dark:border-zinc-600"
            >
              ‹
            </button>
            <span>
              {leaveCardIndex + 1} of {leaveCards.length}
            </span>
            <button
              type="button"
              onClick={() => setLeaveCardIndex((i) => (i + 1) % leaveCards.length)}
              className="rounded border px-2 py-0.5 dark:border-zinc-600"
            >
              ›
            </button>
          </div>
        </Widget>
      </div>
      )}

      {!adminDashboard && (
      <div className="mt-6">
        <Widget title={txt('dashboard.widget.absentToday')} href="/leave" loading={absentTodayLoading} viewAllLabel={txt('common.viewAll')} loadingLabel={txt('common.loading')}>
          <ul className="space-y-2">
            {(absentToday?.absences ?? []).map((a) => (
              <li
                key={a.requestId}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {a.displayName ?? a.email}
                  {a.jobTitle && (
                    <span className="ml-2 font-normal text-zinc-500">({a.jobTitle})</span>
                  )}
                </span>
                <span className="text-zinc-500">
                  {LEAVE_TYPE_LABELS[a.type] ?? a.type}
                  {a.startDate !== a.endDate
                    ? ` · ${formatDateRangeDdMmYyyy(a.startDate, a.endDate)}`
                    : ` · ${formatDateDdMmYyyy(a.startDate)}`}
                </span>
              </li>
            ))}
            {absentToday && absentToday.absences.length === 0 && (
              <li className="text-sm text-zinc-500">Niko nije na odobrenom odsustvu danas.</li>
            )}
          </ul>
        </Widget>
      </div>
      )}
    </div>
  );
}
