'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Licence, type User } from '@/lib/api';
import { useToast } from '@/components/toast';

const STATUS_OPTIONS = ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'] as const;

function toDateInputValue(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function LicenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { showSuccess } = useToast();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
  });

  const { data: licence, isLoading, error: loadError } = useQuery({
    queryKey: ['licence', id],
    queryFn: async () => {
      const res = await api.get<
        Licence & {
          company?: { id: string; name: string } | null;
          device?: { id: string; name: string | null; serialNo: string | null } | null;
        }
      >(`/licences/${id}`);
      return res.data;
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/companies');
      return res.data ?? [];
    },
    enabled: me?.role === 'SUPER_ADMIN',
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string | null; serialNo: string | null; model: string | null }[]>('/devices');
      return res.data ?? [];
    },
    enabled: me?.role === 'SUPER_ADMIN',
  });

  const updateMutation = useMutation({
    mutationFn: async (body: {
      companyId?: string;
      deviceId?: string;
      productName?: string;
      licenceKey?: string;
      validFrom?: string;
      validTo?: string;
      status?: string;
      notes?: string;
    }) => {
      await api.patch(`/licences/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licence', id] });
      queryClient.invalidateQueries({ queryKey: ['licences'] });
      setError(null);
      showSuccess('Licenca je sačuvana.');
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || 'Čuvanje nije uspelo.');
    },
  });

  const isSuperAdmin = me?.role === 'SUPER_ADMIN';

  if (isLoading) {
    return (
      <div>
        <p className="mt-4 text-sm text-zinc-500">Učitavanje…</p>
      </div>
    );
  }

  if (loadError || !licence) {
    return (
      <div>
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">Licenca nije pronađena.</p>
      </div>
    );
  }

  if (isSuperAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Licence / Izmeni</h1>

        <form
          className="max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const formData = new FormData(form);
            const validFrom = (formData.get('validFrom') as string)?.trim();
            const validTo = (formData.get('validTo') as string)?.trim();
            updateMutation.mutate({
              companyId: (formData.get('companyId') as string) || undefined,
              deviceId: (formData.get('deviceId') as string) || undefined,
              productName: (formData.get('productName') as string) || undefined,
              licenceKey: (formData.get('licenceKey') as string) || undefined,
              validFrom: validFrom || undefined,
              validTo: validTo || undefined,
              status: (formData.get('status') as string) || undefined,
              notes: (formData.get('notes') as string) || undefined,
            });
          }}
        >
          {error && (
            <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Kompanija (korisnik)</label>
              <select
                name="companyId"
                defaultValue={licence.companyId ?? ''}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                <option value="">—</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Uređaj</label>
              <select
                name="deviceId"
                defaultValue={licence.deviceId ?? ''}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                <option value="">—</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.serialNo ?? d.id} {d.model ? `(${d.model})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Naziv proizvoda / paketa</label>
              <input
                type="text"
                name="productName"
                defaultValue={licence.productName}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Licencni ključ</label>
              <input
                type="text"
                name="licenceKey"
                defaultValue={licence.licenceKey ?? ''}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Važenje od</label>
              <input
                type="date"
                name="validFrom"
                defaultValue={toDateInputValue(licence.validFrom)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Važenje do</label>
              <input
                type="date"
                name="validTo"
                defaultValue={toDateInputValue(licence.validTo)}
                required
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</label>
              <select
                name="status"
                defaultValue={licence.status}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Napomene</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={licence.notes ?? ''}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Čuvanje…' : 'Sačuvaj'}
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200"
            >
              Nazad
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {licence.productName}
      </h1>
      <div className="max-w-lg rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Kompanija</span>
          <span className="text-zinc-900 dark:text-zinc-50">
            {licence.company ? licence.company.name : '—'}
          </span>
        </div>
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Uređaj</span>
          <span className="text-zinc-900 dark:text-zinc-50">
            {licence.device
              ? `${licence.device.name ?? licence.device.serialNo ?? ''} (${licence.device.serialNo ?? ''})`
              : '—'}
          </span>
        </div>
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Status</span>
          <span className="text-zinc-900 dark:text-zinc-50">{licence.status}</span>
        </div>
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Važenje od</span>
          <span className="text-zinc-900 dark:text-zinc-50">
            {licence.validFrom ? new Date(licence.validFrom).toLocaleDateString() : '—'}
          </span>
        </div>
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Važenje do</span>
          <span className="text-zinc-900 dark:text-zinc-50">
            {new Date(licence.validTo).toLocaleDateString()}
          </span>
        </div>
        {licence.notes && (
          <div className="flex gap-3 py-1">
            <span className="w-32 text-zinc-500 dark:text-zinc-400">Napomene</span>
            <span className="text-zinc-900 dark:text-zinc-50">{licence.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
