'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type DirectoryForm = {
  mb: string;
  pib: string;
  establishedAt: string;
  companyName: string;
  city: string;
  postalCode: string;
  address: string;
  phone: string;
  legalForm: string;
  activityCode: string;
  activityName: string;
  aprStatus: string;
  email: string;
  representative: string;
  description: string;
  sizeClass: string;
  contactDate: string;
};

const FIELD_ORDER: { key: keyof DirectoryForm; label: string }[] = [
  { key: 'mb', label: 'MB' },
  { key: 'pib', label: 'PIB' },
  { key: 'establishedAt', label: 'Datum osnivanja' },
  { key: 'companyName', label: 'Naziv preduzeca' },
  { key: 'city', label: 'Mesto' },
  { key: 'postalCode', label: 'Postanski broj' },
  { key: 'address', label: 'Adresa' },
  { key: 'phone', label: 'Telefon' },
  { key: 'legalForm', label: 'Pravni oblik' },
  { key: 'activityCode', label: 'Sifra delatnosti' },
  { key: 'activityName', label: 'Naziv delatnosti' },
  { key: 'aprStatus', label: 'APR status' },
  { key: 'email', label: 'Email' },
  { key: 'representative', label: 'Zastupnik' },
  { key: 'description', label: 'Opis' },
  { key: 'sizeClass', label: 'Poziv/mail' },
  { key: 'contactDate', label: 'Datum' },
];

const EMPTY_FORM: DirectoryForm = {
  mb: '',
  pib: '',
  establishedAt: '',
  companyName: '',
  city: '',
  postalCode: '',
  address: '',
  phone: '',
  legalForm: '',
  activityCode: '',
  activityName: '',
  aprStatus: '',
  email: '',
  representative: '',
  description: '',
  sizeClass: '',
  contactDate: '',
};

export default function SalesDirectoryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const isNew = id === 'new';
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['sales', 'directory', 'one', id],
    enabled: !isNew,
    queryFn: async () => {
      const res = await api.get<Record<string, unknown>>(`/sales/import-rows/${id}`);
      return res.data;
    },
  });

  const defaults = useMemo<DirectoryForm>(() => {
    if (!data) return EMPTY_FORM;
    return {
      mb: String(data.mb ?? ''),
      pib: String(data.pib ?? ''),
      establishedAt: data.establishedAt ? String(data.establishedAt).slice(0, 10) : '',
      companyName: String(data.companyName ?? ''),
      city: String(data.city ?? ''),
      postalCode: String(data.postalCode ?? ''),
      address: String(data.address ?? ''),
      phone: String(data.phone ?? ''),
      legalForm: String(data.legalForm ?? ''),
      activityCode: String(data.activityCode ?? ''),
      activityName: String(data.activityName ?? ''),
      aprStatus: String(data.aprStatus ?? ''),
      email: String(data.email ?? ''),
      representative: String(data.representative ?? ''),
      description: String(data.description ?? ''),
      sizeClass: String(data.sizeClass ?? ''),
      contactDate: data.contactDate ? String(data.contactDate).slice(0, 10) : '',
    };
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: DirectoryForm) => {
      const body = Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [k, v.trim() === '' ? null : v.trim()]),
      );
      if (isNew) {
        await api.post('/sales/import-rows/manual', body);
      } else {
        await api.patch(`/sales/import-rows/${id}`, body);
      }
    },
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['sales', 'directory'] });
      window.location.href = '/sales';
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || 'Cuvanje nije uspelo.');
    },
  });

  if (!isNew && isLoading) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Ucitavanje…</p>;
  }

  if (!isNew && (loadError || !data)) {
    return (
      <div>
        <Link href="/sales" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
          ← Nazad na Prodaju
        </Link>
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">Red nije pronadjen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/sales" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
          ← Nazad na Prodaju
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {isNew ? 'Mailovi i pozivi / Dodaj ručno' : 'Mailovi i pozivi / Edit'}
      </h1>

      <form
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const formData = new FormData(form);
          const payload = FIELD_ORDER.reduce((acc, field) => {
            acc[field.key] = String(formData.get(field.key) ?? '');
            return acc;
          }, { ...EMPTY_FORM });
          saveMutation.mutate(payload);
        }}
      >
        {error && (
          <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIELD_ORDER.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {field.label}
              </label>
              <input
                type={field.key === 'establishedAt' || field.key === 'contactDate' ? 'date' : 'text'}
                name={field.key}
                defaultValue={defaults[field.key]}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Cuvam…' : 'Sacuvaj'}
          </button>
          <Link
            href="/sales"
            className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
          >
            Otkazi
          </Link>
        </div>
      </form>
    </div>
  );
}
