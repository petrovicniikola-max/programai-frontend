'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateRangeDdMmYyyy } from '@/lib/date-format';
import { useToast } from './toast';

interface LeaveRequestUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface LeaveNotificationRequest {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  totalWorkingDays: number;
  decisionNote?: string | null;
  documentPath?: string | null;
  user?: LeaveRequestUser;
  approver?: { displayName: string | null; email: string } | null;
}

interface LeaveNotificationsData {
  pendingApprovals: LeaveNotificationRequest[];
  myActiveRequests: LeaveNotificationRequest[];
  unreadDecisions: LeaveNotificationRequest[];
  pendingCount: number;
  myActiveCount: number;
  unreadCount: number;
  totalCount: number;
}

const TYPE_LABELS: Record<string, string> = {
  ANNUAL: 'Godišnji odmor',
  PERSONAL: 'Slobodni dani',
  PAID_ABSENCE: 'Plaćeno odsustvo',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Na čekanju',
  APPROVED: 'Odobreno',
  REJECTED: 'Odbijeno',
  NEEDS_REVISION: 'Za izmenu',
};

export function LeaveNotifications() {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['leave', 'notifications'],
    queryFn: async () => {
      const res = await api.get<LeaveNotificationsData>('/leave/notifications');
      return res.data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/leave/requests/${id}/cancel`);
    },
    onSuccess: () => {
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
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Otkazivanje nije uspelo');
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      await api.patch(`/leave/requests/${id}/${action}`, {
        decisionNote: action === 'reject' ? 'Odbijeno' : undefined,
      });
    },
    onSuccess: () => {
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
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Akcija nije uspela');
    },
  });

  const markRead = useMutation({
    mutationFn: async (requestIds?: string[]) => {
      await api.post('/leave/notifications/read', { requestIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave', 'notifications'] });
    },
  });

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const total = data?.totalCount ?? 0;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded p-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        aria-label="Odsustva — notifikacije"
        title="Odsustva — notifikacije"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
        >
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 max-h-[70vh] overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Odsustva</h3>
          </div>

          {(data?.pendingApprovals.length ?? 0) > 0 && (
            <div className="border-b border-zinc-100 p-3 dark:border-zinc-800">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Za odobrenje
              </p>
              <ul className="space-y-3">
                {data!.pendingApprovals.map((r) => (
                  <li key={r.id} className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {r.user?.displayName ?? r.user?.email}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {TYPE_LABELS[r.type] ?? r.type} · {formatDateRangeDdMmYyyy(r.startDate, r.endDate)} ·{' '}
                      {r.totalWorkingDays} d
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={decide.isPending}
                        onClick={() => decide.mutate({ id: r.id, action: 'approve' })}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Odobri
                      </button>
                      <button
                        type="button"
                        disabled={decide.isPending}
                        onClick={() => decide.mutate({ id: r.id, action: 'reject' })}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        Odbij
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data?.myActiveRequests.length ?? 0) > 0 && (
            <div className="border-b border-zinc-100 p-3 dark:border-zinc-800">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Moji zahtevi
              </p>
              <ul className="space-y-2">
                {data!.myActiveRequests.map((r) => (
                  <li
                    key={r.id}
                    className="rounded border border-zinc-200 p-3 dark:border-zinc-700"
                  >
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {STATUS_LABELS[r.status] ?? r.status}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {TYPE_LABELS[r.type] ?? r.type} · {formatDateRangeDdMmYyyy(r.startDate, r.endDate)} ·{' '}
                      {r.totalWorkingDays} d
                    </p>
                    {r.approver && (
                      <p className="mt-1 text-xs text-zinc-400">
                        Odobrava: {r.approver.displayName ?? r.approver.email}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={cancel.isPending}
                      onClick={() => {
                        if (
                          !window.confirm(
                            'Da li ste sigurni da želite da otkažete ovaj zahtev za odsustvo?',
                          )
                        ) {
                          return;
                        }
                        cancel.mutate(r.id);
                      }}
                      className="mt-2 rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                      Otkaži zahtev
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data?.unreadDecisions.length ?? 0) > 0 && (
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Odluke
                </p>
                <button
                  type="button"
                  onClick={() => markRead.mutate(undefined)}
                  className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  Označi sve pročitano
                </button>
              </div>
              <ul className="space-y-2">
                {data!.unreadDecisions.map((r) => (
                  <li
                    key={r.id}
                    className="rounded border border-zinc-200 p-3 dark:border-zinc-700"
                  >
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {STATUS_LABELS[r.status] ?? r.status}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {TYPE_LABELS[r.type] ?? r.type} · {formatDateRangeDdMmYyyy(r.startDate, r.endDate)}
                    </p>
                    {r.decisionNote && (
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {r.decisionNote}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => markRead.mutate([r.id])}
                      className="mt-2 text-xs text-zinc-500 hover:underline"
                    >
                      Zatvori
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {total === 0 && (
            <p className="p-4 text-sm text-zinc-500">Nema novih obaveštenja o odsustvima.</p>
          )}
        </div>
      )}
    </div>
  );
}
