'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateDdMmYyyy } from '@/lib/date-format';
import { Modal } from './modal';
import { useToast } from './toast';

type LeaveType = 'ANNUAL' | 'PAID_ABSENCE' | 'PERSONAL';
type PaidSubtype =
  | 'MARRIAGE'
  | 'CHILD_BIRTH'
  | 'FAMILY_SERIOUS_ILLNESS'
  | 'FAMILY_DEATH'
  | 'BLOOD_DONATION'
  | 'OTHER';

interface DayEntry {
  date: string;
  days: number;
  isWeekend: boolean;
  isHoliday: boolean;
  countsTowardBalance: boolean;
}

interface PreviewResult {
  entries: DayEntry[];
  totalWorkingDays: number;
  summary: { available: number; requested: number; remaining: number };
}

interface LeaveBalancesMe {
  annualEligibility?: {
    eligible: boolean;
    eligibleFrom?: string;
    missingEmploymentDate?: boolean;
    message?: string | null;
  };
  annualAvailable?: number;
}

export function LeaveRequestModal({
  open,
  onClose,
  onCreated,
  initialStartDate,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialStartDate?: string;
}) {
  const { showError } = useToast();
  const [type, setType] = useState<LeaveType>('ANNUAL');
  const [subtype, setSubtype] = useState<PaidSubtype>('OTHER');
  const [startDate, setStartDate] = useState(initialStartDate ?? '');
  const [endDate, setEndDate] = useState(initialStartDate ?? '');
  const [note, setNote] = useState('');
  const [dayOverrides, setDayOverrides] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  const { data: balances } = useQuery({
    queryKey: ['leave', 'balances', 'me'],
    queryFn: async () => {
      const res = await api.get<LeaveBalancesMe>('/leave/balances/me');
      return res.data;
    },
    enabled: open,
  });

  const annualBlocked =
    type === 'ANNUAL' && balances?.annualEligibility && !balances.annualEligibility.eligible;

  useEffect(() => {
    if (initialStartDate) {
      setStartDate(initialStartDate);
      setEndDate(initialStartDate);
    }
  }, [initialStartDate]);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<PreviewResult>('/leave/requests/preview', {
        type,
        paidAbsenceSubtype: type === 'PAID_ABSENCE' ? subtype : undefined,
        startDate,
        endDate,
        dayOverrides: Object.keys(dayOverrides).length ? dayOverrides : undefined,
      });
      return res.data;
    },
    onSuccess: (data) => setPreview(data),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setPreview(null);
      showError(e?.response?.data?.message ?? 'Preview failed');
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/leave/requests', {
        type,
        paidAbsenceSubtype: type === 'PAID_ABSENCE' ? subtype : undefined,
        startDate,
        endDate,
        note: note.trim() || undefined,
        dayOverrides: Object.keys(dayOverrides).length ? dayOverrides : undefined,
      });
      return res.data as { id: string };
    },
    onSuccess: async (data) => {
      await api.post(`/leave/requests/${data.id}/submit`);
      onCreated();
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Request failed');
    },
  });

  useEffect(() => {
    if (!open || !startDate || !endDate) return;
    const t = setTimeout(() => previewMutation.mutate(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, subtype, startDate, endDate, dayOverrides, open]);

  function adjustDay(date: string, delta: number) {
    const entry = preview?.entries.find((e) => e.date === date);
    if (!entry || entry.isWeekend || entry.isHoliday) return;
    const current = dayOverrides[date] ?? entry.days;
    const next = Math.max(0, Math.min(1, Math.round((current + delta * 0.5) * 2) / 2));
    setDayOverrides((prev) => ({ ...prev, [date]: next }));
  }

  return (
    <Modal open={open} onClose={onClose} title="Zahtev za odsustvo" size="lg">
      {annualBlocked && balances?.annualEligibility?.message && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {balances.annualEligibility.message}
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tip</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            >
              <option value="ANNUAL">Godišnji odmor</option>
              <option value="PAID_ABSENCE">Plaćeno odsustvo</option>
              <option value="PERSONAL">Slobodni dani</option>
            </select>
          </div>
          {type === 'PAID_ABSENCE' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Podtip</label>
              <select
                value={subtype}
                onChange={(e) => setSubtype(e.target.value as PaidSubtype)}
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              >
                <option value="MARRIAGE">Venčanje</option>
                <option value="CHILD_BIRTH">Rođenje deteta</option>
                <option value="FAMILY_SERIOUS_ILLNESS">Teška bolest člana porodice</option>
                <option value="FAMILY_DEATH">Smrt člana porodice</option>
                <option value="BLOOD_DONATION">Davanje krvi</option>
                <option value="OTHER">Ostalo</option>
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Od</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Do</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Napomena</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Pregled dana</h3>
          <div className="mt-2 max-h-64 overflow-y-auto rounded border border-zinc-200 dark:border-zinc-700">
            {preview?.entries.map((e) => (
              <div
                key={e.date}
                className={`flex items-center justify-between px-2 py-1 text-xs ${
                  e.isWeekend || e.isHoliday ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                }`}
              >
                <span>{formatDateDdMmYyyy(e.date)}</span>
                <div className="flex items-center gap-1">
                  {!e.isWeekend && !e.isHoliday && (
                    <>
                      <button type="button" onClick={() => adjustDay(e.date, -1)} className="px-1">
                        −
                      </button>
                      <span>{dayOverrides[e.date] ?? e.days}</span>
                      <button type="button" onClick={() => adjustDay(e.date, 1)} className="px-1">
                        +
                      </button>
                    </>
                  )}
                  {(e.isWeekend || e.isHoliday) && <span>0</span>}
                </div>
              </div>
            ))}
          </div>
          {preview && (
            <div className="mt-3 space-y-1 rounded bg-zinc-50 p-3 text-sm dark:bg-zinc-900/50">
              <p>Dostupno: <strong>{preview.summary.available}</strong></p>
              <p>Traženo: <strong>{preview.summary.requested}</strong></p>
              <p>Preostalo: <strong>{preview.summary.remaining}</strong></p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-sm text-zinc-600">
          Otkaži
        </button>
        <button
          type="button"
          disabled={
            !preview ||
            preview.summary.remaining < 0 ||
            createMutation.isPending ||
            annualBlocked
          }
          onClick={() => createMutation.mutate()}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Slanje…' : 'Pošalji zahtev'}
        </button>
      </div>
    </Modal>
  );
}
