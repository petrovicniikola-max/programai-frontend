'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateDdMmYyyy } from '@/lib/date-format';
import { getToken } from '@/lib/auth';
import { Modal } from './modal';
import { useToast } from './toast';

type BalanceType = 'ANNUAL' | 'PERSONAL';

interface HistoryRow {
  occurredOn: string;
  description: string;
  used: number | null;
  accrued: number | null;
  balance: number;
}

interface HistoryData {
  user: { id: string; email: string; displayName: string | null };
  year: number;
  type: BalanceType;
  available: number;
  totalUsed: number;
  totalAdjustments: number;
  rows: HistoryRow[];
}

interface UserBalanceRow {
  userId: string;
  email: string;
  displayName: string | null;
  available: number;
  total: number;
  used: number;
  previousAvailable?: number;
  currentAvailable?: number;
}

interface AnnualDetail {
  fiscalYear: number;
  fiscalYearEnd: string;
  previous: { available: number; total: number; used: number };
  current: { available: number; total: number; used: number; adjustment: number };
  totalAvailable: number;
}

export function LeaveAdjustmentModal({
  open,
  onClose,
  type,
  user,
}: {
  open: boolean;
  onClose: () => void;
  type: BalanceType;
  user: UserBalanceRow | null;
}) {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [amount, setAmount] = useState(0);
  const [previousDays, setPreviousDays] = useState(0);
  const [occurredOn, setOccurredOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState('');
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());

  const title =
    type === 'ANNUAL' ? 'Godišnji odmor adjustment' : 'Slobodni dani adjustment';

  useEffect(() => {
    if (open) {
      setAmount(0);
      setOccurredOn(new Date().toISOString().slice(0, 10));
      setComment('');
      setHistoryYear(new Date().getFullYear());
    }
  }, [open, user?.userId]);

  const { data: annualDetail } = useQuery({
    queryKey: ['settings', 'leave', 'annual-detail', user?.userId],
    queryFn: async () => {
      const res = await api.get<AnnualDetail>(
        `/settings/leave/users/${user!.userId}/annual-detail`,
      );
      return res.data;
    },
    enabled: open && type === 'ANNUAL' && !!user?.userId,
  });

  useEffect(() => {
    if (annualDetail) {
      setPreviousDays(annualDetail.previous.available);
    }
  }, [annualDetail]);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['settings', 'leave', 'history', user?.userId, type, historyYear],
    queryFn: async () => {
      const res = await api.get<HistoryData>(
        `/settings/leave/users/${user!.userId}/history?type=${type}&year=${historyYear}`,
      );
      return res.data;
    },
    enabled: open && !!user?.userId,
  });

  const savePrevious = useMutation({
    mutationFn: async () => {
      await api.put(`/settings/leave/users/${user!.userId}/previous-leave`, {
        availableDays: previousDays,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'leave'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'leave', 'balances'] });
      queryClient.invalidateQueries({
        queryKey: ['settings', 'leave', 'annual-detail', user?.userId],
      });
      queryClient.invalidateQueries({ queryKey: ['leave', 'balances'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Čuvanje starog odmora nije uspelo');
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      await api.post('/settings/leave/adjustments', {
        userId: user!.userId,
        type,
        amount,
        occurredOn,
        comment: comment.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'leave'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'leave', 'balances'] });
      queryClient.invalidateQueries({
        queryKey: ['settings', 'leave', 'history', user?.userId, type],
      });
      queryClient.invalidateQueries({ queryKey: ['leave', 'balances'] });
      setAmount(0);
      setComment('');
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Čuvanje nije uspelo');
    },
  });

  function downloadHistory() {
    if (!user) return;
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    const token = getToken();
    const url = `${base}/settings/leave/users/${user.userId}/history/export?type=${type}&year=${historyYear}`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `leave-${type}-${historyYear}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => showError('Preuzimanje nije uspelo'));
  }

  if (!user) return null;

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        {user.displayName ?? user.email} — ukupno dostupno{' '}
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {annualDetail?.totalAvailable ?? user.available} d
        </span>
        {type === 'ANNUAL' && annualDetail && (
          <span className="block mt-1 text-xs text-zinc-500">
            Fiskalna godina {annualDetail.fiscalYear} (do {formatDateDdMmYyyy(annualDetail.fiscalYearEnd)})
          </span>
        )}
      </p>

      {type === 'ANNUAL' && (
        <div className="mb-6 space-y-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Stari odmor (prenos iz prethodne godine)
            </label>
            <p className="mt-0.5 text-xs text-zinc-500">
              Preostali dani iz starog programa. Moraju biti iskorišćeni do 30. juna.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex min-w-[8rem] flex-1 items-center rounded border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800">
              <input
                type="number"
                step="0.5"
                min={0}
                value={previousDays}
                onChange={(e) => setPreviousDays(Number(e.target.value))}
                className="w-full border-0 bg-transparent px-3 py-2 text-sm outline-none"
              />
              <span className="pr-3 text-sm text-zinc-500">dana</span>
            </div>
            <button
              type="button"
              onClick={() => savePrevious.mutate()}
              disabled={savePrevious.isPending}
              className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Sačuvaj stari odmor
            </button>
          </div>
          {annualDetail && annualDetail.previous.used > 0 && (
            <p className="text-xs text-zinc-500">
              Iskorišćeno iz starog: {annualDetail.previous.used} d
            </p>
          )}
        </div>
      )}

      <div className="space-y-4 border-b border-zinc-200 pb-6 dark:border-zinc-700">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {type === 'ANNUAL' ? 'Korekcija novog fonda' : 'Amount'}
          </label>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex flex-1 items-center rounded border border-zinc-300 dark:border-zinc-600">
              <input
                type="number"
                step="0.5"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full border-0 bg-transparent px-3 py-2 text-sm outline-none dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={() => setAmount((a) => a - 1)}
                className="border-l border-zinc-300 px-3 py-2 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-700"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setAmount((a) => a + 1)}
                className="border-l border-zinc-300 px-3 py-2 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-700"
              >
                +
              </button>
            </div>
            <span className="text-sm text-zinc-500">days</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Occurred on
          </label>
          <input
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Comment</label>
            <span className="text-xs text-zinc-400">Optional</span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || amount === 0}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">History</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHistoryYear((y) => y - 1)}
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
            >
              ‹
            </button>
            <span className="min-w-[3rem] text-center text-sm font-medium">{historyYear}</span>
            <button
              type="button"
              onClick={() => setHistoryYear((y) => y + 1)}
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
            >
              ›
            </button>
            <button
              type="button"
              onClick={downloadHistory}
              title="Preuzmi CSV"
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
            >
              ↓
            </button>
          </div>
        </div>

        {history && (
          <div className="mt-2 flex gap-4 text-xs text-zinc-500">
            <span>{history.totalUsed} days Total used</span>
            <span>{history.totalAdjustments} Total adjustments</span>
          </div>
        )}

        {historyLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Učitavanje istorije…</p>
        ) : (
          <div className="mt-3 max-h-64 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700">
                  <th className="py-2 pr-2">Occurred on</th>
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2 pr-2">Used</th>
                  <th className="py-2 pr-2">Accrued</th>
                  <th className="py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {(history?.rows ?? []).map((r, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-2 pr-2 whitespace-nowrap">{formatDateDdMmYyyy(r.occurredOn)}</td>
                    <td className="py-2 pr-2">{r.description}</td>
                    <td className="py-2 pr-2">{r.used ?? '—'}</td>
                    <td className="py-2 pr-2">{r.accrued ?? '—'}</td>
                    <td className="py-2">{r.balance}</td>
                  </tr>
                ))}
                {(history?.rows ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-zinc-400">
                      Nema zapisa za {historyYear}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
