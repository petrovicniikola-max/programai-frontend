'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateDdMmYyyy } from '@/lib/date-format';
import { useToast } from '@/components/toast';
import { LeaveAdjustmentModal } from '@/components/leave-adjustment-modal';

type SettingsTab = 'rules' | 'annual' | 'personal';

interface LeaveSettings {
  minAnnualDays: number;
  personalDaysPerYear: number;
  paidAbsenceMaxDays: number;
  defaultApproverId: string | null;
  companyAddress: string | null;
  companyCity: string | null;
  reminderAfterMonthDay: string;
  decisionNotificationEmails?: string[];
}

interface Holiday {
  id: string;
  date: string;
  name: string;
  isRecurring: boolean;
}

interface SettingsUser {
  id: string;
  email: string;
  displayName: string | null;
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

export default function SettingsLeavePage() {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [tab, setTab] = useState<SettingsTab>('rules');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [editUser, setEditUser] = useState<UserBalanceRow | null>(null);
  const [editType, setEditType] = useState<'ANNUAL' | 'PERSONAL'>('ANNUAL');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'leave'],
    queryFn: async () => {
      const res = await api.get<LeaveSettings>('/settings/leave');
      return res.data;
    },
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['settings', 'leave', 'holidays'],
    queryFn: async () => {
      const res = await api.get<Holiday[]>('/settings/leave/holidays');
      return res.data ?? [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: async () => {
      const res = await api.get<SettingsUser[]>('/settings/users');
      return res.data ?? [];
    },
  });

  const balanceType: 'ANNUAL' | 'PERSONAL' | null =
    tab === 'annual' ? 'ANNUAL' : tab === 'personal' ? 'PERSONAL' : null;

  const {
    data: balances = [],
    isLoading: balancesLoading,
    isError: balancesError,
    error: balancesQueryError,
  } = useQuery({
    queryKey: ['settings', 'leave', 'balances', balanceType],
    queryFn: async () => {
      const res = await api.get<UserBalanceRow[]>(
        `/settings/leave/balances?type=${balanceType}`,
      );
      return res.data ?? [];
    },
    enabled: balanceType !== null,
  });

  useEffect(() => {
    if (!balancesError) return;
    const e = balancesQueryError as { response?: { data?: { message?: string } } };
    showError(e?.response?.data?.message ?? 'Učitavanje liste zaposlenih nije uspelo');
  }, [balancesError, balancesQueryError, showError]);

  const [form, setForm] = useState<Partial<LeaveSettings>>({});

  const save = useMutation({
    mutationFn: async () => {
      const body = { ...settings, ...form };
      await api.patch('/settings/leave', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'leave'] });
      setForm({});
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Čuvanje nije uspelo');
    },
  });

  const addHoliday = useMutation({
    mutationFn: async () => {
      await api.post('/settings/leave/holidays', { date: holidayDate, name: holidayName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'leave', 'holidays'] });
      setHolidayDate('');
      setHolidayName('');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Dodavanje praznika nije uspelo');
    },
  });

  const removeHoliday = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/settings/leave/holidays/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'leave', 'holidays'] }),
  });

  const s = { ...settings, ...form };

  function openEdit(row: UserBalanceRow, type: 'ANNUAL' | 'PERSONAL') {
    setEditType(type);
    setEditUser(row);
  }

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'rules', label: 'Pravila' },
    { id: 'annual', label: 'Godišnji odmor' },
    { id: 'personal', label: 'Slobodni dani' },
  ];

  return (
    <div>
      <Link href="/settings" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Settings
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Odsustva</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Fiskalna godina godišnjeg odmora: 1. jul – 30. jun. Stari odmor mora biti iskorišćen do 30. juna.
      </p>

      <div className="mt-4 inline-flex rounded border border-zinc-200 dark:border-zinc-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm ${
              tab === t.id
                ? 'bg-emerald-600 text-white'
                : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'rules' && (
        <>
          {isLoading ? (
            <p className="mt-4 text-sm text-zinc-500">Učitavanje…</p>
          ) : (
            <div className="mt-6 max-w-xl space-y-4">
              <div>
                <label className="block text-sm font-medium">Podrazumevani odobravatelj</label>
                <select
                  value={s.defaultApproverId ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, defaultApproverId: e.target.value || null }))
                  }
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                >
                  <option value="">—</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName ?? u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium">Min. godišnji</label>
                  <input
                    type="number"
                    value={s.minAnnualDays ?? 20}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minAnnualDays: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Slobodni dani/god</label>
                  <input
                    type="number"
                    value={s.personalDaysPerYear ?? 5}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, personalDaysPerYear: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Plaćeno odsustvo/god</label>
                  <input
                    type="number"
                    value={s.paidAbsenceMaxDays ?? 5}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, paidAbsenceMaxDays: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">Adresa (za rešenje)</label>
                <input
                  value={s.companyAddress ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, companyAddress: e.target.value }))}
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Grad</label>
                <input
                  value={s.companyCity ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, companyCity: e.target.value }))}
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Email za rešenje (odobren godišnji)
                </label>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Word dokument se šalje na ove adrese posle odobrenja. Jedna adresa po liniji.
                </p>
                <textarea
                  rows={2}
                  value={(s.decisionNotificationEmails ?? ['estuar@estuar.rs', 'racunovodstvo@estuar.rs']).join('\n')}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      decisionNotificationEmails: e.target.value
                        .split(/[\n,;]+/)
                        .map((x) => x.trim())
                        .filter(Boolean),
                    }))
                  }
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                />
              </div>
              <button
                type="button"
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Sačuvaj pravila
              </button>

              <hr className="border-zinc-200 dark:border-zinc-700" />
              <h2 className="text-sm font-medium">Državni praznici</h2>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="rounded border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                />
                <input
                  placeholder="Naziv"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="flex-1 rounded border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                />
                <button
                  type="button"
                  onClick={() => addHoliday.mutate()}
                  disabled={!holidayDate || !holidayName}
                  className="rounded bg-emerald-600 px-3 py-1 text-sm text-white"
                >
                  Dodaj
                </button>
              </div>
              <ul className="space-y-1 text-sm">
                {holidays.map((h) => (
                  <li key={h.id} className="flex justify-between">
                    <span>
                      {formatDateDdMmYyyy(h.date)} — {h.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeHoliday.mutate(h.id)}
                      className="text-red-600 hover:underline"
                    >
                      Obriši
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {balanceType && (
        <div className="mt-6">
          <p className="mb-4 text-sm text-zinc-500">
            {tab === 'annual'
              ? 'Unesite stari odmor (prenos iz prethodne godine) i novi fond po zaposlenom. Klik na ime ili Edit.'
              : 'Dodela i ručne korekcije slobodnih dana po zaposlenom. Klik na ime ili Edit otvara formu.'}
          </p>
          {balancesLoading ? (
            <p className="text-sm text-zinc-500">Učitavanje…</p>
          ) : balances.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Nema aktivnih zaposlenih za prikaz.
            </p>
          ) : (
            <table className="w-full max-w-4xl text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700">
                  <th className="py-2 pr-4 font-medium">Zaposleni</th>
                  {tab === 'annual' && (
                    <>
                      <th className="py-2 pr-4 font-medium">Stari</th>
                      <th className="py-2 pr-4 font-medium">Novi</th>
                    </>
                  )}
                  <th className="py-2 pr-4 font-medium">Dostupno</th>
                  <th className="py-2 pr-4 font-medium">Iskorišćeno</th>
                  <th className="py-2 pr-4 font-medium">Ukupno</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {balances.map((row) => (
                  <tr key={row.userId} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => openEdit(row, balanceType)}
                        className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {row.displayName ?? row.email}
                      </button>
                    </td>
                    {tab === 'annual' && (
                      <>
                        <td className="py-3 pr-4">{row.previousAvailable ?? 0} d</td>
                        <td className="py-3 pr-4">{row.currentAvailable ?? row.available} d</td>
                      </>
                    )}
                    <td className="py-3 pr-4">{row.available} d</td>
                    <td className="py-3 pr-4">{row.used} d</td>
                    <td className="py-3 pr-4">{row.total} d</td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(row, balanceType)}
                        className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <LeaveAdjustmentModal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        type={editType}
        user={editUser}
      />
    </div>
  );
}
