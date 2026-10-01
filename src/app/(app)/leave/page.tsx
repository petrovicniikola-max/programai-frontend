'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LeaveRequestModal } from '@/components/leave-request-modal';
import {
  formatDateRangeDdMmYyyy,
  formatMonthKeyDdMmYyyy,
  formatMonthYearLabel,
  isoDateOnly,
} from '@/lib/date-format';

type Scope = 'company' | 'my';
type View = 'timeline' | 'calendar';

interface TimelineUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface LeaveRequest {
  id: string;
  userId: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  totalWorkingDays: number;
  documentPath?: string | null;
  user?: { displayName: string | null; email: string };
  dayEntries?: { date: string; days: number; countsTowardBalance: boolean }[];
}

interface TimelineData {
  month: string;
  users: TimelineUser[];
  requests: LeaveRequest[];
  holidays: { date: string; name: string }[];
}

const TYPE_COLORS: Record<string, string> = {
  ANNUAL: 'bg-blue-500',
  PAID_ABSENCE: 'bg-purple-500',
  PERSONAL: 'bg-teal-500',
};

const TYPE_LABELS: Record<string, string> = {
  ANNUAL: 'Godišnji odmor',
  PAID_ABSENCE: 'Plaćeno odsustvo',
  PERSONAL: 'Slobodan dan',
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Odobreno',
  PENDING: 'Na čekanju',
};

const MONTH_YEAR_MIN = 2020;
const MONTH_YEAR_MAX = 2036;

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthOptions(): string[] {
  const out: string[] = [];
  for (let y = MONTH_YEAR_MIN; y <= MONTH_YEAR_MAX; y++) {
    for (let m = 1; m <= 12; m++) {
      out.push(`${y}-${String(m).padStart(2, '0')}`);
    }
  }
  return out;
}

const MONTH_OPTIONS = monthOptions();

function invalidateLeaveViews(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['leave', 'notifications'] });
  queryClient.invalidateQueries({ queryKey: ['leave', 'absent-today'] });
  queryClient.invalidateQueries({ queryKey: ['leave', 'balances'] });
  queryClient.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === 'leave' &&
      q.queryKey[1] !== 'notifications' &&
      q.queryKey[1] !== 'reminders' &&
      q.queryKey[1] !== 'absent-today' &&
      q.queryKey[1] !== 'balances',
  });
}

function formatMonthLabel(ym: string): string {
  return formatMonthYearLabel(ym);
}

/** Compare calendar dates without timezone shift (API returns YYYY-MM-DD). */
function dateKeyFromIso(iso: string): number {
  const [y, m, d] = isoDateOnly(iso).split('-').map(Number);
  return y * 10000 + m * 100 + d;
}

function shiftMonth(ym: string, delta: number): string | null {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const ny = d.getFullYear();
  const nm = d.getMonth() + 1;
  if (ny < MONTH_YEAR_MIN || ny > MONTH_YEAR_MAX) return null;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

function isDayInLeaveRange(req: LeaveRequest, day: number, monthYm: string): boolean {
  const [y, m] = monthYm.split('-').map(Number);
  const cellKey = y * 10000 + m * 100 + day;
  const startKey = dateKeyFromIso(req.startDate);
  const endKey = dateKeyFromIso(req.endDate);
  return cellKey >= startKey && cellKey <= endKey;
}

export default function LeavePage() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>('company');
  const [view, setView] = useState<View>('calendar');
  const [month, setMonth] = useState(currentMonth);
  const [modalOpen, setModalOpen] = useState(false);
  const [pickDate, setPickDate] = useState<string | undefined>();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('zahtev') === '1') {
      setPickDate(undefined);
      setModalOpen(true);
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['leave', view, scope, month],
    queryFn: async () => {
      const endpoint = view === 'timeline' ? '/leave/timeline' : '/leave/calendar';
      const res = await api.get<TimelineData>(`${endpoint}?month=${month}&scope=${scope}`);
      return res.data;
    },
  });

  const daysInMonth = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const count = new Date(y, m, 0).getDate();
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [month]);

  const prevMonth = useMemo(() => shiftMonth(month, -1), [month]);
  const nextMonth = useMemo(() => shiftMonth(month, 1), [month]);

  const holidayDays = useMemo(() => {
    const set = new Set<number>();
    for (const h of data?.holidays ?? []) {
      const iso = isoDateOnly(h.date);
      if (iso.slice(0, 7) === month) {
        set.add(Number(iso.slice(8, 10)));
      }
    }
    return set;
  }, [data?.holidays, month]);

  function barStyle(req: LeaveRequest, day: number): boolean {
    return isDayInLeaveRange(req, day, month);
  }

  const requestByUserDay = useMemo(() => {
    const map = new Map<string, LeaveRequest>();
    for (const r of data?.requests ?? []) {
      for (const d of daysInMonth) {
        if (barStyle(r, d)) map.set(`${r.userId}:${d}`, r);
      }
    }
    return map;
  }, [data?.requests, daysInMonth, month]);

  const requestsByDay = useMemo(() => {
    const map = new Map<number, LeaveRequest[]>();
    for (const r of data?.requests ?? []) {
      for (const d of daysInMonth) {
        if (!barStyle(r, d)) continue;
        const list = map.get(d) ?? [];
        if (!list.some((x) => x.id === r.id)) list.push(r);
        map.set(d, list);
      }
    }
    return map;
  }, [data?.requests, daysInMonth, month]);

  const userById = useMemo(() => {
    const map = new Map<string, TimelineUser>();
    for (const u of data?.users ?? []) map.set(u.id, u);
    return map;
  }, [data?.users]);

  function requestUserName(req: LeaveRequest): string {
    return (
      req.user?.displayName ??
      req.user?.email ??
      userById.get(req.userId)?.displayName ??
      userById.get(req.userId)?.email ??
      '—'
    );
  }

  const monthlyLeaveList = useMemo(() => {
    return [...(data?.requests ?? [])].sort((a, b) => {
      const byDate = a.startDate.localeCompare(b.startDate);
      if (byDate !== 0) return byDate;
      const nameA =
        a.user?.displayName ?? a.user?.email ?? userById.get(a.userId)?.displayName ?? '';
      const nameB =
        b.user?.displayName ?? b.user?.email ?? userById.get(b.userId)?.displayName ?? '';
      return nameA.localeCompare(nameB, 'sr');
    });
  }, [data?.requests, userById]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Odsustva</h1>
        <button
          type="button"
          onClick={() => {
            setPickDate(undefined);
            setModalOpen(true);
          }}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Zahtev za odsustvo
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded border border-zinc-200 dark:border-zinc-700">
          {(['company', 'my'] as Scope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`px-3 py-1 text-sm ${scope === s ? 'bg-emerald-600 text-white' : 'bg-white text-zinc-700 hover:text-zinc-900 dark:bg-transparent dark:text-zinc-400'}`}
            >
              {s === 'company' ? 'Kompanija' : 'Moji'}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded border border-zinc-200 dark:border-zinc-700">
          {(['timeline', 'calendar'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1 text-sm ${view === v ? 'bg-emerald-600 text-white' : 'bg-white text-zinc-700 hover:text-zinc-900 dark:bg-transparent dark:text-zinc-400'}`}
            >
              {v === 'timeline' ? 'Timeline' : 'Kalendar'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => prevMonth && setMonth(prevMonth)}
            disabled={!prevMonth}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800 disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            aria-label="Prethodni mesec"
          >
            ‹
          </button>
          <span className="min-w-[5.5rem] text-center text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {formatMonthLabel(month)}
          </span>
          <button
            type="button"
            onClick={() => nextMonth && setMonth(nextMonth)}
            disabled={!nextMonth}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800 disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            aria-label="Sledeći mesec"
          >
            ›
          </button>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="ml-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {formatMonthKeyDdMmYyyy(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-zinc-500">Učitavanje…</p>
      ) : view === 'timeline' ? (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white px-2 py-1 text-left text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                  Zaposleni
                </th>
                {daysInMonth.map((d) => {
                  const [y, m] = month.split('-').map(Number);
                  const wd = new Date(y, m - 1, d).getDay();
                  const isWe = wd === 0 || wd === 6;
                  return (
                    <th
                      key={d}
                      className={`px-1 py-1 text-zinc-700 dark:text-zinc-300 ${isWe ? 'text-zinc-400 dark:text-zinc-500' : ''} ${holidayDays.has(d) ? 'bg-green-100 dark:bg-green-900/30' : ''}`}
                    >
                      {d}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(data?.users ?? []).map((u) => (
                <tr key={u.id} className="border-t border-zinc-200 dark:border-zinc-700">
                  <td className="sticky left-0 bg-white px-2 py-2 whitespace-nowrap text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                    {u.displayName ?? u.email}
                  </td>
                  {daysInMonth.map((d) => {
                    const req = requestByUserDay.get(`${u.id}:${d}`);
                    return (
                      <td key={d} className="p-0">
                        {req && (
                          <div
                            className={`h-4 ${TYPE_COLORS[req.type] ?? 'bg-zinc-400'}`}
                            title={`${req.type} ${req.status}`}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-7 gap-1.5 text-center text-sm text-zinc-800 dark:text-zinc-200">
          {['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'].map((d) => (
            <div key={d} className="font-semibold text-zinc-700 dark:text-zinc-300">
              {d}
            </div>
          ))}
          {(() => {
            const [y, m] = month.split('-').map(Number);
            const first = new Date(y, m - 1, 1).getDay();
            const offset = first === 0 ? 6 : first - 1;
            const cells: React.ReactNode[] = [];
            for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} />);
            for (const d of daysInMonth) {
              const dateStr = `${month}-${String(d).padStart(2, '0')}`;
              const reqs = requestsByDay.get(d) ?? [];
              cells.push(
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setPickDate(dateStr);
                    setModalOpen(true);
                  }}
                  className={`leave-calendar-day flex min-h-[5.5rem] flex-col rounded p-1.5 text-left shadow-sm hover:brightness-95 ${
                    holidayDays.has(d) ? 'is-holiday' : ''
                  }`}
                >
                  <span className="font-bold">{d}</span>
                  <div className="mt-1 flex flex-1 flex-col gap-1">
                    {reqs.map((r) => (
                      <div key={`${r.id}-${d}`} className="flex flex-col gap-0.5">
                        <div
                          className="truncate text-[10px] font-medium leading-tight text-zinc-700 dark:text-zinc-200"
                          title={`${requestUserName(r)} — ${TYPE_LABELS[r.type] ?? r.type} (${STATUS_LABELS[r.status] ?? r.status})`}
                        >
                          {requestUserName(r)}
                        </div>
                        <div
                          className={`h-1 min-h-[4px] shrink-0 rounded ${TYPE_COLORS[r.type] ?? 'bg-zinc-400'}`}
                        />
                      </div>
                    ))}
                  </div>
                </button>,
              );
            }
            return cells;
          })()}
        </div>
      )}

      {view === 'calendar' && !isLoading && (
        <div className="mt-8 max-w-3xl rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Odsustva u {formatMonthLabel(month)}
          </h2>
          {monthlyLeaveList.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">
              {scope === 'my'
                ? 'Nemate odobrenog ili na čekanju odsustva u ovom mesecu.'
                : 'Niko nema odobrenog ili na čekanju odsustva u ovom mesecu.'}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
              {monthlyLeaveList.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-sm"
                >
                  <span className="min-w-[8rem] font-medium text-zinc-900 dark:text-zinc-100">
                    {requestUserName(r)}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {TYPE_LABELS[r.type] ?? r.type}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {formatDateRangeDdMmYyyy(r.startDate, r.endDate)}
                  </span>
                  <span className="text-zinc-500">{r.totalWorkingDays} rad. dana</span>
                  <span
                    className={
                      r.status === 'APPROVED'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }
                  >
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <LeaveRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialStartDate={pickDate}
        onCreated={() => invalidateLeaveViews(queryClient)}
      />
    </div>
  );
}
