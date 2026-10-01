'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePermissions } from '@/hooks/use-permissions';
import { useTexts } from '@/lib/use-texts';

type SoldDeviceRow = {
  id: string;
  serialNo: string;
  name: string | null;
  licenceName: string;
  months: number;
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

export default function SoldDevicesPage() {
  const txt = useTexts();
  const queryClient = useQueryClient();
  const { canEdit } = usePermissions();
  const canCreate = canEdit('soldDevices');

  const list = useQuery({
    queryKey: ['sold-devices'],
    queryFn: async () => (await api.get<SoldDeviceRow[]>('/sold-devices')).data,
  });

  const [serialNo, setSerialNo] = useState('');
  const [name, setName] = useState('');
  const [licenceName, setLicenceName] = useState('');
  const [months, setMonths] = useState('12');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const monthsNum = Number(months);
      const res = await api.post<SoldDeviceRow>('/sold-devices', {
        serialNo: serialNo.trim(),
        name: name.trim() || undefined,
        licenceName: licenceName.trim(),
        months: monthsNum,
        description: description.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: async () => {
      setFormError(null);
      setNotice(txt('soldDevices.saved'));
      setSerialNo('');
      setName('');
      setLicenceName('');
      setMonths('12');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['sold-devices'] });
    },
    onError: (err) => {
      setNotice(null);
      setFormError(errorMessage(err, 'Unos nije sačuvan.'));
    },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{txt('soldDevices.title')}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{txt('soldDevices.description')}</p>

      {canCreate && (
        <form
          className="mt-6 space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            setNotice(null);
            const monthsNum = Number(months);
            if (!serialNo.trim()) {
              setFormError('Unesite SN.');
              return;
            }
            if (!licenceName.trim()) {
              setFormError('Unesite licencu.');
              return;
            }
            if (!Number.isInteger(monthsNum) || monthsNum < 1 || monthsNum > 120) {
              setFormError('Trajanje unesite u mesecima, od 1 do 120.');
              return;
            }
            create.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {txt('soldDevices.form.serial')}
              </span>
              <input
                required
                value={serialNo}
                onChange={(e) => setSerialNo(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {txt('soldDevices.form.name')}
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {txt('soldDevices.form.licence')}
              </span>
              <input
                required
                value={licenceName}
                onChange={(e) => setLicenceName(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {txt('soldDevices.form.months')}
              </span>
              <input
                required
                inputMode="numeric"
                value={months}
                onChange={(e) => setMonths(e.target.value.replace(/[^\d]/g, ''))}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
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
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {notice && <p className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {create.isPending ? txt('soldDevices.btn.saving') : txt('soldDevices.btn.submit')}
          </button>
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
              <th className="px-3 py-2">{txt('soldDevices.th.description')}</th>
              <th className="px-3 py-2">{txt('soldDevices.th.enteredBy')}</th>
              <th className="px-3 py-2">{txt('soldDevices.th.date')}</th>
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">{row.serialNo}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{row.name || '—'}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{row.licenceName}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{row.months}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{row.description || '—'}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{row.enteredBy}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{fmtDate(row.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.data && list.data.length === 0 && (
          <p className="px-3 py-3 text-sm text-zinc-500">{txt('soldDevices.empty')}</p>
        )}
      </div>
    </div>
  );
}
