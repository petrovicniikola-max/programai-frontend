'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePermissions } from '@/hooks/use-permissions';
import { useTexts } from '@/lib/use-texts';

const DEFAULT_LICENCES = ['PC', 'Cloud Middleware', 'Android Phone/Tablet', 'Fiscal Box', 'TPS900'] as const;
const KNOWN_LICENCE_KEYS = new Set([
  'pc',
  'cloud middleware',
  'android phone/tablet',
  'android',
  'fiscal box',
  'tps900',
]);
const MONTH_OPTIONS = [3, 6, 12, 24] as const;
const NEW_LICENCE = '__new__';

type SoldDeviceRow = {
  id: string;
  serialNo: string;
  name: string | null;
  licenceName: string;
  months: number;
  bonusAmount: number;
  description: string | null;
  createdAt: string;
  enteredBy: string;
};

function errorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string' && msg.length > 0) return msg;
  return fallback;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function upcomingMonthKeys(count = 12): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('sr-Latn', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function fmtMoney(value: number): string {
  return `${new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 2 }).format(value)} din`;
}

function sumBonus(items: SoldDeviceRow[]): number {
  return items.reduce((sum, row) => sum + (row.bonusAmount || 0), 0);
}

function isKnownLicence(name: string): boolean {
  return KNOWN_LICENCE_KEYS.has(name.trim().toLowerCase());
}

function canonicalLicence(name: string): string | null {
  const key = name.trim().toLowerCase();
  return DEFAULT_LICENCES.find((item) => item.toLowerCase() === key) ?? null;
}

function csvCell(value: string): string {
  const singleLine = value.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (/[;"\n]/.test(singleLine)) return `"${singleLine.replace(/"/g, '""')}"`;
  return singleLine;
}

const fieldClass =
  'w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100';

export default function SoldDevicesPage() {
  const txt = useTexts();
  const queryClient = useQueryClient();
  const { canEdit } = usePermissions();
  const canChange = canEdit('soldDevices');

  const list = useQuery({
    queryKey: ['sold-devices'],
    queryFn: async () => (await api.get<SoldDeviceRow[]>('/sold-devices')).data,
  });

  const rows = list.data ?? [];

  const licenceOptions = useMemo(() => {
    const extras = rows
      .map((row) => row.licenceName.trim())
      .filter((name) => name && !canonicalLicence(name));
    return [...DEFAULT_LICENCES, ...Array.from(new Set(extras)).sort((a, b) => a.localeCompare(b, 'sr'))];
  }, [rows]);

  const monthTabs = useMemo(() => upcomingMonthKeys(12), []);
  const [monthFilter, setMonthFilter] = useState(() => monthTabs[0] ?? monthKey(new Date().toISOString()));
  const visibleRows = rows.filter((row) => monthKey(row.createdAt) === monthFilter);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLicence, setEditingLicence] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [name, setName] = useState('');
  const [licenceChoice, setLicenceChoice] = useState('');
  const [customLicence, setCustomLicence] = useState('');
  const [price, setPrice] = useState('');
  const [months, setMonths] = useState('12');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const monthChoices = useMemo(() => {
    const current = Number(months);
    if (Number.isInteger(current) && current > 0 && !MONTH_OPTIONS.includes(current as (typeof MONTH_OPTIONS)[number])) {
      return [...MONTH_OPTIONS, current].sort((a, b) => a - b);
    }
    return [...MONTH_OPTIONS];
  }, [months]);

  function resetForm() {
    setEditingId(null);
    setEditingLicence('');
    setSerialNo('');
    setName('');
    setLicenceChoice('');
    setCustomLicence('');
    setPrice('');
    setMonths('12');
    setDescription('');
  }

  function startEdit(row: SoldDeviceRow) {
    const canonical = canonicalLicence(row.licenceName);
    setEditingId(row.id);
    setEditingLicence(row.licenceName);
    setSerialNo(row.serialNo);
    setName(row.name ?? '');
    setMonths(String(row.months));
    setDescription(row.description ?? '');
    setFormError(null);
    setNotice(null);
    if (canonical || isKnownLicence(row.licenceName)) {
      setLicenceChoice(canonical ?? row.licenceName);
      setCustomLicence('');
      setPrice('');
      return;
    }
    setLicenceChoice(NEW_LICENCE);
    setCustomLicence(row.licenceName);
    setPrice(row.bonusAmount > 0 ? String(row.bonusAmount) : '');
  }

  function asksForPrice(): boolean {
    if (licenceChoice !== NEW_LICENCE) return false;
    const typed = customLicence.trim();
    if (isKnownLicence(typed)) return false;
    if (!typed) return true;
    const typedKey = typed.toLowerCase();
    const sameCustom =
      editingId != null && typedKey === editingLicence.trim().toLowerCase() && !isKnownLicence(editingLicence);
    const usedElsewhere = rows.some(
      (row) => row.id !== editingId && row.licenceName.trim().toLowerCase() === typedKey,
    );
    return sameCustom || !usedElsewhere;
  }

  function parsedPrice(): number | null {
    const raw = price.trim();
    if (!/^[1-9]\d*$/.test(raw)) return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 100_000_000) return null;
    return n;
  }

  function resolvedLicence(): string {
    if (licenceChoice === NEW_LICENCE) return customLicence.trim();
    return licenceChoice.trim();
  }

  const save = useMutation({
    mutationFn: async () => {
      const body: {
        serialNo: string;
        name?: string;
        licenceName: string;
        months: number;
        description?: string;
        bonusAmount?: number;
      } = {
        serialNo: serialNo.trim(),
        name: name.trim() || undefined,
        licenceName: resolvedLicence(),
        months: Number(months),
        description: description.trim() || undefined,
      };
      if (asksForPrice()) {
        const amount = parsedPrice();
        if (amount != null) body.bonusAmount = amount;
      }
      const res = editingId
        ? await api.patch<SoldDeviceRow>(`/sold-devices/${editingId}`, body)
        : await api.post<SoldDeviceRow>('/sold-devices', body);
      return res.data;
    },
    onSuccess: async () => {
      setFormError(null);
      setNotice(editingId ? txt('soldDevices.updated') : txt('soldDevices.saved'));
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['sold-devices'] });
    },
    onError: (err) => {
      setNotice(null);
      setFormError(errorMessage(err, 'Unos nije sačuvan.'));
    },
  });

  const bonusSum = sumBonus(visibleRows);

  function exportCsv() {
    const header = ['Rb', 'SN', 'Naziv', 'Licenca', 'Meseci', 'Bonus (din)', 'Opis', 'Uneo', 'Datum'];
    const blank = header.map(() => '');
    const sorted = [...visibleRows].sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt) || a.serialNo.localeCompare(b.serialNo, 'sr'),
    );
    const data = sorted.map((row, index) => [
      String(index + 1),
      row.serialNo,
      row.name ?? '',
      row.licenceName,
      String(row.months),
      String(row.bonusAmount || 0),
      row.description ?? '',
      row.enteredBy,
      fmtDate(row.createdAt).replaceAll('/', '.'),
    ]);
    const suma = [...blank];
    suma[0] = 'Suma';
    suma[5] = String(bonusSum);

    const byLicence = new Map<string, { count: number; bonus: number }>();
    for (const row of sorted) {
      const key = row.licenceName.trim() || '—';
      const bucket = byLicence.get(key) ?? { count: 0, bonus: 0 };
      bucket.count += 1;
      bucket.bonus += row.bonusAmount || 0;
      byLicence.set(key, bucket);
    }
    const licenceRows = Array.from(byLicence.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'sr'))
      .map(([name, bucket]) => [name, String(bucket.count), String(bucket.bonus)]);

    const lines: string[][] = [
      ['Prodati uređaji', monthLabel(monthFilter)],
      blank,
      header,
      ...data,
      blank,
      suma,
      blank,
      ['Po licenci', 'Broj unosa', 'Bonus (din)'],
      ...licenceRows,
    ];
    const body = lines.map((cols) => cols.map((cell) => csvCell(cell)).join(';')).join('\r\n');
    const blob = new Blob([`\uFEFF${body}\r\n`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prodati-uredjaji-${monthFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{txt('soldDevices.title')}</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{txt('soldDevices.description')}</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={visibleRows.length === 0}
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 disabled:opacity-50"
        >
          {txt('soldDevices.btn.export')}
        </button>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{txt('soldDevices.summary.title')}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {monthTabs.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMonthFilter(key)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                monthFilter === key
                  ? 'border-emerald-600 bg-emerald-50 font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
                  : 'border-zinc-200 dark:border-zinc-700'
              }`}
            >
              {monthLabel(key)}
            </button>
          ))}
        </div>
      </section>

      {canChange && (
        <form
          className="mt-6 space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            setNotice(null);
            const monthsNum = Number(months);
            const licence = resolvedLicence();
            if (!serialNo.trim()) {
              setFormError('Unesite SN.');
              return;
            }
            if (!licence) {
              setFormError(licenceChoice === NEW_LICENCE ? 'Unesite naziv nove licence.' : 'Izaberite licencu.');
              return;
            }
            if (asksForPrice() && parsedPrice() == null) {
              setFormError('Unesite cenu (pozitivan ceo broj, dinari).');
              return;
            }
            if (!MONTH_OPTIONS.includes(monthsNum as (typeof MONTH_OPTIONS)[number])) {
              setFormError('Trajanje izaberite iz liste: 3, 6, 12 ili 24 meseca.');
              return;
            }
            save.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {txt('soldDevices.form.serial')}
              </span>
              <input required value={serialNo} onChange={(e) => setSerialNo(e.target.value)} className={fieldClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {txt('soldDevices.form.name')}
              </span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
            </label>
            <div className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {txt('soldDevices.form.licence')}
              </span>
              <select
                required
                value={licenceChoice}
                onChange={(e) => setLicenceChoice(e.target.value)}
                className={fieldClass}
              >
                <option value="">—</option>
                <option value={NEW_LICENCE}>{txt('soldDevices.form.licence.new')}</option>
                {licenceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {licenceChoice === NEW_LICENCE && (
                <div className="mt-2 flex items-end gap-2">
                  <input
                    required
                    value={customLicence}
                    onChange={(e) => setCustomLicence(e.target.value)}
                    placeholder={txt('soldDevices.form.licence.custom')}
                    className={`${fieldClass} min-w-0 flex-1`}
                  />
                  {asksForPrice() && (
                    <span className="w-28 shrink-0">
                      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        {txt('soldDevices.form.price')}
                      </span>
                      <input
                        required
                        type="text"
                        inputMode="numeric"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        aria-label={txt('soldDevices.form.price')}
                        className={fieldClass}
                      />
                    </span>
                  )}
                </div>
              )}
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {txt('soldDevices.form.months')}
              </span>
              <select required value={months} onChange={(e) => setMonths(e.target.value)} className={fieldClass}>
                {monthChoices.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {txt('soldDevices.form.description')}
            </span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={fieldClass}
            />
          </label>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {notice && <p className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={save.isPending}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {save.isPending
                ? txt('soldDevices.btn.saving')
                : editingId
                  ? txt('soldDevices.btn.saveEdit')
                  : txt('soldDevices.btn.submit')}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600">
                {txt('soldDevices.btn.cancel')}
              </button>
            )}
          </div>
        </form>
      )}

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{txt('soldDevices.list.title')}</h2>
      {list.isLoading && <p className="mt-2 text-sm text-zinc-500">{txt('soldDevices.loading')}</p>}
      {list.error && (
        <p className="mt-2 text-sm text-red-600">{errorMessage(list.error, txt('soldDevices.error'))}</p>
      )}
      <div className="mt-3 overflow-x-auto rounded border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <tr>
              <th className="px-3 py-2">{txt('soldDevices.th.serial')}</th>
              <th className="px-3 py-2">{txt('soldDevices.th.name')}</th>
              <th className="px-3 py-2">{txt('soldDevices.th.licence')}</th>
              <th className="px-3 py-2">{txt('soldDevices.th.months')}</th>
              <th className="px-3 py-2">{txt('soldDevices.th.bonus')}</th>
              <th className="px-3 py-2">{txt('soldDevices.th.description')}</th>
              <th className="px-3 py-2">{txt('soldDevices.th.enteredBy')}</th>
              <th className="px-3 py-2">{txt('soldDevices.th.date')}</th>
              {canChange && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">{row.serialNo}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{row.name || '—'}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{row.licenceName}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{row.months}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{fmtMoney(row.bonusAmount || 0)}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{row.description || '—'}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{row.enteredBy}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{fmtDate(row.createdAt)}</td>
                {canChange && (
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => startEdit(row)} className="text-emerald-700 hover:underline dark:text-emerald-400">
                      {txt('soldDevices.btn.edit')}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {visibleRows.length > 0 && (
            <tfoot className="border-t border-zinc-300 bg-zinc-50 font-medium text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50">
              <tr>
                <td className="px-3 py-2" colSpan={4}>
                  {txt('soldDevices.summary.total')}
                </td>
                <td className="px-3 py-2">{fmtMoney(bonusSum)}</td>
                <td className="px-3 py-2" colSpan={canChange ? 4 : 3} />
              </tr>
            </tfoot>
          )}
        </table>
        {list.data && visibleRows.length === 0 && (
          <p className="px-3 py-3 text-sm text-zinc-500">{txt('soldDevices.empty')}</p>
        )}
      </div>
    </div>
  );
}
