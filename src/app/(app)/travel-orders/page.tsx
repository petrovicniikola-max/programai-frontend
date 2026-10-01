'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type User } from '@/lib/api';
import { usePermissions } from '@/hooks/use-permissions';

type TravelOrderRow = {
  id: string;
  number: string;
  employeeName: string;
  destination: string;
  hostName: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  dailyRate: number;
  totalAmount: number;
  totalInWords: string;
  accountingEmail: string | null;
  sentToUser: boolean;
  sentToAccounting: boolean;
  own: boolean;
};

type CreateResult = {
  id: string;
  number: string;
  dayCount: number;
  totalAmount: number;
  totalInWords: string;
  email: { userSent: boolean; accountingSent: boolean; message?: string };
};

function toIso(display: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function todayDisplay(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${now.getFullYear()}`;
}

function inclusiveDays(startIso: string | null, endIso: string | null): number | null {
  if (!startIso || !endIso) return null;
  const a = Date.parse(`${startIso}T00:00:00Z`);
  const b = Date.parse(`${endIso}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000) + 1;
}

function fmt(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function DateField({
  value,
  onChange,
  required,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  placeholder: string;
}) {
  const picker = useRef<HTMLInputElement>(null);

  function openCalendar() {
    const el = picker.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        el.focus();
      }
    }
    el.focus();
  }

  return (
    <div className="relative rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800">
      <span className="block text-xs text-zinc-500">{placeholder}</span>
      <input
        readOnly
        required={required}
        placeholder="DD/MM/YYYY"
        aria-label={placeholder}
        value={value}
        onClick={openCalendar}
        className="mt-1 w-full cursor-pointer bg-transparent pr-8 text-sm outline-none dark:text-zinc-100"
      />
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={toIso(value) ?? ''}
        onChange={(e) => onChange(e.target.value ? fmt(e.target.value) : '')}
        className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
      />
      <button
        type="button"
        aria-label="Otvori kalendar"
        onClick={openCalendar}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  type = 'text',
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  type?: string;
  inputMode?: 'numeric' | 'email';
}) {
  return (
    <label className="block rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800">
      <span className="block text-xs text-zinc-500">{label}</span>
      <input
        required={required}
        type={type}
        inputMode={inputMode}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-transparent text-sm outline-none dark:text-zinc-100"
      />
    </label>
  );
}

function errorMessage(err: unknown): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string' && msg.length > 0) return msg;
  return 'Nalog nije sačuvan.';
}

async function downloadDoc(id: string, kind: 'nalog' | 'odluka', filename: string) {
  const res = await api.get(`/travel-orders/${id}/${kind}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TravelOrdersPage() {
  const queryClient = useQueryClient();
  const { canEdit, canView, user } = usePermissions();
  const canCreate = canEdit('travelOrders');
  const seeAll = canView('travelOrders.all');

  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<User>('/auth/me')).data,
  });

  const list = useQuery({
    queryKey: ['travel-orders'],
    queryFn: async () => (await api.get<TravelOrderRow[]>('/travel-orders')).data,
  });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [destination, setDestination] = useState('');
  const [hostName, setHostName] = useState('');
  const [task, setTask] = useState('');
  const [dailyRate, setDailyRate] = useState('3200');
  const [decisionName, setDecisionName] = useState('');
  const [decisionDate, setDecisionDate] = useState(todayDisplay);
  const [jobTitle, setJobTitle] = useState('');
  const [jobTouched, setJobTouched] = useState(false);
  const [accountingEmail, setAccountingEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const profileTitle = me.data?.jobTitle ?? '';
  const shownTitle = jobTouched ? jobTitle : profileTitle;

  const startIso = toIso(startDate);
  const endIso = toIso(endDate);
  const decisionIso = toIso(decisionDate);
  const days = inclusiveDays(startIso, endIso);
  const rate = Number(dailyRate);
  const total = days != null && days > 0 && Number.isFinite(rate) && rate > 0 ? days * rate : null;

  const create = useMutation({
    mutationFn: async () => {
      const start = toIso(startDate);
      const end = toIso(endDate);
      const decision = toIso(decisionDate);
      if (!start || !end || !decision) throw new Error('Datum mora biti u formatu DD/MM/YYYY.');
      const res = await api.post<CreateResult>('/travel-orders', {
        startDate: start,
        endDate: end,
        destination: destination.trim(),
        hostName: hostName.trim(),
        task: task.trim(),
        dailyRate: rate,
        decisionName: decisionName.trim(),
        decisionDate: decision,
        jobTitle: shownTitle.trim(),
        accountingEmail: accountingEmail.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: async (data) => {
      setFormError(null);
      const mailNote = data.email.message
        ? data.email.message
        : [
            data.email.userSent ? 'Poslato na vaš mail.' : 'Mail vama nije poslat.',
            accountingEmail.trim()
              ? data.email.accountingSent
                ? 'Poslato knjigovođi.'
                : 'Mail knjigovođi nije poslat.'
              : '',
          ]
            .filter(Boolean)
            .join(' ');
      setNotice(`${data.number}: ${data.dayCount} dnevnica, ${data.totalAmount} din (${data.totalInWords}). ${mailNote}`);
      setDestination('');
      setHostName('');
      setTask('');
      setDecisionName('');
      setAccountingEmail('');
      await queryClient.invalidateQueries({ queryKey: ['travel-orders'] });
    },
    onError: (err) => {
      setNotice(null);
      setFormError(errorMessage(err));
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Putni nalozi</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Obrazac putnog naloga i odluke je u pozadini. Ovde se unose samo podaci sa puta. Dokumenti se upisuju i šalju na
        mail sa kojim ste prijavljeni{user?.email ? ` (${user.email})` : ''}.
      </p>

      {canCreate && (
        <form
          className="mt-6 space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            if (!startIso || !endIso || !decisionIso) {
              setFormError('Datum unesite u formatu DD/MM/YYYY.');
              return;
            }
            if (!decisionName.trim()) {
              setFormError('Unesite ime i prezime kako treba da piše u odluci.');
              return;
            }
            create.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField required placeholder="Datum polaska" value={startDate} onChange={setStartDate} />
            <DateField required placeholder="Datum povratka" value={endDate} onChange={setEndDate} />
          </div>
          <TextField required label="Mesto" value={destination} onChange={setDestination} />
          <TextField required label="Kod koga" value={hostName} onChange={setHostName} />
          <TextField required label="Zadatak" value={task} onChange={setTask} />
          <TextField
            required
            label="Cena dnevnice (din)"
            value={dailyRate}
            inputMode="numeric"
            onChange={(next) => setDailyRate(next.replace(/[^\d]/g, ''))}
          />
          {total != null && (
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {days} dnevnica × {rate} din = {total.toLocaleString('sr-RS')} din
            </p>
          )}
          <TextField
            required
            label="Radno mesto"
            value={shownTitle}
            onChange={(next) => {
              setJobTouched(true);
              setJobTitle(next);
            }}
          />
          <TextField required label="Ime i prezime u odluci" value={decisionName} onChange={setDecisionName} />
          <DateField required placeholder="Datum odluke" value={decisionDate} onChange={setDecisionDate} />
          <TextField
            label="Računovođe/Knjigovođe za realizaciju putnog naloga"
            type="email"
            value={accountingEmail}
            onChange={setAccountingEmail}
          />
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {notice && <p className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {create.isPending ? 'Priprema dokumenata…' : 'Napravi nalog i odluku'}
          </button>
        </form>
      )}

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {seeAll ? 'Svi putni nalozi' : 'Moji putni nalozi'}
      </h2>
      {list.isLoading && <p className="mt-2 text-sm text-zinc-500">Učitavanje…</p>}
      {list.error && <p className="mt-2 text-sm text-red-600">{errorMessage(list.error)}</p>}
      <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-700">
        {(list.data ?? []).map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                {row.number} · {row.destination}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {seeAll ? `${row.employeeName} · ` : ''}
                {fmt(row.startDate)} – {fmt(row.endDate)} · {row.dayCount} × {row.dailyRate} = {row.totalAmount} din
              </p>
              <p className="text-xs text-zinc-500">
                {row.sentToUser ? 'Poslato vama' : 'Nije poslato vama'}
                {row.accountingEmail
                  ? row.sentToAccounting
                    ? ` · poslato na ${row.accountingEmail}`
                    : ` · nije poslato na ${row.accountingEmail}`
                  : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
                onClick={() => downloadDoc(row.id, 'nalog', `${row.number}-nalog.pdf`)}
              >
                Nalog
              </button>
              <button
                type="button"
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
                onClick={() => downloadDoc(row.id, 'odluka', `${row.number}-odluka.docx`)}
              >
                Odluka
              </button>
            </div>
          </li>
        ))}
      </ul>
      {list.data && list.data.length === 0 && <p className="mt-2 text-sm text-zinc-500">Još nema putnih naloga.</p>}
    </div>
  );
}
