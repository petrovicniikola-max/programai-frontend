'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Device, type User } from '@/lib/api';
import { DEVICE_MODELS, getMdmProfilesForModel, getDefaultMdmProfileForModel } from '@/lib/mdm-profiles';
import { useToast } from '@/components/toast';

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'RETIRED'] as const;

export default function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: device, isLoading, error: loadError } = useQuery({
    queryKey: ['device', id],
    queryFn: async () => {
      const res = await api.get<Device & { company?: { id: string; name: string } | null }>(`/devices/${id}`);
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

  const updateMutation = useMutation({
    mutationFn: async (body: { companyId?: string; name?: string; model?: string; serialNo?: string; status?: string; notes?: string; mdmProfileName?: string }) => {
      await api.patch(`/devices/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device', id] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setError(null);
      showSuccess('Uređaj je sačuvan.');
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
  const isEditing = isSuperAdmin;

  const [editModel, setEditModel] = useState('');
  const [editMdmProfile, setEditMdmProfile] = useState('');
  useEffect(() => {
    if (device) {
      setEditModel(device.model ?? '');
      setEditMdmProfile(device.mdmProfileName ?? getDefaultMdmProfileForModel(device.model));
    }
  }, [device?.id, device?.model, device?.mdmProfileName]);

  const editMdmProfiles = getMdmProfilesForModel(device?.model ?? editModel);
  useEffect(() => {
    if (!device) return;
    const model = editModel || device.model;
    const profiles = getMdmProfilesForModel(model);
    if (profiles.length > 0 && !profiles.some((p) => p.value === editMdmProfile)) {
      setEditMdmProfile(getDefaultMdmProfileForModel(model));
    }
  }, [editModel]);

  if (isLoading) {
    return (
      <div>
        <Link href="/devices" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
          ← Nazad na Uređaje
        </Link>
        <p className="mt-4 text-sm text-zinc-500">Učitavanje…</p>
      </div>
    );
  }

  if (loadError || !device) {
    return (
      <div>
        <Link href="/devices" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
          ← Nazad na Uređaje
        </Link>
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">Uređaj nije pronađen.</p>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/devices" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
            ← Nazad na Uređaje
          </Link>
        </div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Uređaji / Izmeni</h1>

        <form
          className="max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const formData = new FormData(form);
            updateMutation.mutate({
              companyId: (formData.get('companyId') as string) || undefined,
              name: (formData.get('name') as string) || undefined,
              model: editModel || undefined,
              serialNo: (formData.get('serialNo') as string) || undefined,
              status: (formData.get('status') as string) || undefined,
              notes: (formData.get('notes') as string) || undefined,
              mdmProfileName: editMdmProfile || undefined,
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
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Naziv korisnika (kompanija)
              </label>
              <select
                name="companyId"
                defaultValue={device.companyId ?? ''}
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
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Naziv uređaja (opciono)
              </label>
              <input
                type="text"
                name="name"
                defaultValue={device.name ?? ''}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Model uređaja
              </label>
              <select
                value={editModel}
                onChange={(e) => setEditModel(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                <option value="">—</option>
                {device.model && !DEVICE_MODELS.includes(device.model as (typeof DEVICE_MODELS)[number]) && (
                  <option value={device.model}>{device.model}</option>
                )}
                {DEVICE_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Serijski broj
              </label>
              <input
                type="text"
                name="serialNo"
                defaultValue={device.serialNo ?? ''}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Status
              </label>
              <select
                name="status"
                defaultValue={device.status}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === 'ACTIVE' ? 'aktivan' : s === 'INACTIVE' ? 'neaktivan' : s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Napomene
            </label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={device.notes ?? ''}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>

          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-600">
            <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">MDM profili</h3>
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">Naziv profila zavisi od modela uređaja.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Naziv profila</label>
                <select
                  value={editMdmProfile}
                  onChange={(e) => setEditMdmProfile(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                >
                  <option value="">—</option>
                  {editMdmProfiles.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                {(editModel || device.model) && editMdmProfiles.length === 0 && (
                  <p className="mt-1 text-xs text-zinc-500">Nema definisanih MDM profila za ovaj model.</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Dodaci</label>
                <input
                  type="text"
                  value="nije dostupno"
                  readOnly
                  className="w-full rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Čuvanje…' : 'Sačuvaj'}
            </button>
            <Link
              href="/devices"
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
            >
              Nazad
            </Link>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/devices" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Nazad na Uređaje
      </Link>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {device.name || device.model || device.serialNo || 'Uređaj'}
      </h1>
      <div className="max-w-lg rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Serijski broj</span>
          <span className="text-zinc-900 dark:text-zinc-50">{device.serialNo || '—'}</span>
        </div>
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Model</span>
          <span className="text-zinc-900 dark:text-zinc-50">{device.model || '—'}</span>
        </div>
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Status</span>
          <span className="text-zinc-900 dark:text-zinc-50">{device.status}</span>
        </div>
        <div className="flex gap-3 py-1">
          <span className="w-32 text-zinc-500 dark:text-zinc-400">Kompanija</span>
          <span className="text-zinc-900 dark:text-zinc-50">{device.company ? device.company.name : '—'}</span>
        </div>
        {device.notes && (
          <div className="flex gap-3 py-1">
            <span className="w-32 text-zinc-500 dark:text-zinc-400">Napomene</span>
            <span className="text-zinc-900 dark:text-zinc-50">{device.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
