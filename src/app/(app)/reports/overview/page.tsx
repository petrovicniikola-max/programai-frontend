'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getReportsOverview } from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};

const TYPE_LABELS: Record<string, string> = {
  CALL: 'Call',
  SUPPORT: 'Support',
  SALES: 'Sales',
  FIELD: 'Field',
  OTHER: 'Other',
};

function Card({
  title,
  value,
  sub,
  href,
}: {
  title: string;
  value: React.ReactNode;
  sub?: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</h3>
      <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
      {sub && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{sub}</p>}
    </div>
  );
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export default function ReportsOverviewPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', 'overview'],
    queryFn: getReportsOverview,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (isError || data == null) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
        <p className="text-sm text-red-600 dark:text-red-400">Nije moguće učitati pregled. Pokušajte ponovo.</p>
      </div>
    );
  }

  const ticketsByStatus = typeof data.ticketsByStatus === 'object' && data.ticketsByStatus != null ? data.ticketsByStatus : {};
  const ticketsByType = typeof data.ticketsByType === 'object' && data.ticketsByType != null ? data.ticketsByType : {};
  const expiringLicences = typeof data.expiringLicences === 'object' && data.expiringLicences != null ? data.expiringLicences : {};
  const expiringDaysRaw = Array.isArray(data.expiringLicencesDays) ? data.expiringLicencesDays : [30, 14, 7, 1];
  const expiringDays = expiringDaysRaw.map((x) => (typeof x === 'number' && !Number.isNaN(x) ? x : 30)).filter((x) => x >= 0).sort((a, b) => b - a);
  const defaultExpiringDays = expiringDays.length > 0 ? expiringDays : [30, 14, 7, 1];
  const totalTickets = Object.values(ticketsByStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Companies"
          value={data?.companiesCount ?? '—'}
          sub="Total clients"
          href="/clients"
        />
        <Card
          title="Active devices"
          value={data?.activeDevices ?? '—'}
          href="/devices"
        />
        <Card
          title="Active licences"
          value={data?.activeLicences ?? '—'}
          href="/licences"
        />
        <Card
          title="Total tickets"
          value={totalTickets}
          sub="All statuses"
          href="/tickets"
        />
      </div>

      <div>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Tickets by status
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(['OPEN', 'IN_PROGRESS', 'DONE'] as const).map((status) => (
            <Card
              key={status}
              title={STATUS_LABELS[status] ?? status}
              value={ticketsByStatus[status] ?? 0}
              href={`/tickets?status=${status}`}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Tickets by type
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(['CALL', 'SUPPORT', 'SALES', 'FIELD', 'OTHER'] as const).map((type) => (
            <Card
              key={type}
              title={TYPE_LABELS[type] ?? type}
              value={ticketsByType[type] ?? 0}
              href={`/tickets?type=${type}`}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Licences expiring soon
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {defaultExpiringDays.map((d, i, arr) => {
            const nextVal = i < arr.length - 1 ? arr[i + 1]! : 0;
            const prev = typeof nextVal === 'number' ? nextVal : 0;
            const from = prev + 1;
            const to = typeof d === 'number' ? d : 0;
            const label = to === 1 ? '≤1d' : `${to}d`;
            const href = from < to
              ? `/licences?expiringFromDays=${from}&expiringToDays=${to}`
              : `/licences?expiringFromDays=0&expiringToDays=${to}`;
            return (
              <Link
                key={`${to}-${i}`}
                href={href}
                className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50"
              >
                <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {expiringLicences[String(d)] ?? 0}
                </span>
                <span className="ml-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
