'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type User } from '@/lib/api';
import { AssignDeviceModal } from '@/components/assign-device-modal';
import { AddCompanyUserModal } from '@/components/add-company-user-modal';

interface Company {
  id: string;
  name: string;
  city: string | null;
  postalCode: string | null;
  address: string | null;
  pib: string | null;
  mb: string | null;
  addOnViewInvoicesAllDevices?: boolean;
  addOnLastInvoice?: boolean;
  addOnAlarmsEmail?: boolean;
  addOnCashInvoice?: boolean;
  addOnApiAccess?: boolean;
  addOnReportScheduling?: boolean;
}

interface DeviceRow {
  id: string;
  serialNo: string | null;
  model: string | null;
  name: string | null;
  status: string;
  company?: { id: string; name: string } | null;
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
  });

  const { data: company, isLoading, error: loadError } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const res = await api.get<Company>(`/companies/${id}`);
      return res.data;
    },
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['company-devices', id],
    queryFn: async () => {
      const res = await api.get<DeviceRow[]>(`/companies/${id}/devices`);
      return res.data ?? [];
    },
    enabled: !!company?.id,
  });

  const isSuperAdmin = me?.role === 'SUPER_ADMIN';
  const canEditAddons = me?.role !== 'USER'; // svi sem USER-a mogu da menjaju Dodatke

  interface CompanyUserRow {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
  }
  const { data: companyUsers = [] } = useQuery({
    queryKey: ['company-users', id],
    queryFn: async () => {
      const res = await api.get<CompanyUserRow[]>(`/companies/${id}/users`);
      return res.data ?? [];
    },
    enabled: !!company?.id && isSuperAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: async (body: { name?: string; pib?: string; mb?: string; address?: string; city?: string; postalCode?: string }) => {
      await api.patch(`/companies/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', id] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setError(null);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || 'Čuvanje nije uspelo.');
    },
  });

  const addOnKeys = [
    { key: 'addOnViewInvoicesAllDevices', label: 'Pregled računa za sve uređaje' },
    { key: 'addOnLastInvoice', label: 'Prikaz poslednjeg računa' },
    { key: 'addOnAlarmsEmail', label: 'Prijem alarma na email' },
    { key: 'addOnCashInvoice', label: 'Izdavanje gotovinskog računa' },
    { key: 'addOnApiAccess', label: 'API pristup' },
    { key: 'addOnReportScheduling', label: 'Zakazivanje slanja izveštaja' },
  ] as const;

  const toggleAddOnMutation = useMutation({
    mutationFn: async (payload: { [k: string]: boolean }) => {
      await api.patch(`/companies/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', id] });
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || 'Izmena dodatka nije uspela.');
    },
  });

  if (isLoading || !company) {
    return (
      <div>
        <p className="mt-4 text-sm text-zinc-500">{loadError ? 'Greška u učitavanju.' : 'Učitavanje…'}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">Korisnik nije pronađen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Korisnici / Izmeni</h1>

      {/* Podaci korisnika */}
      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Podaci korisnika</h2>
        {isSuperAdmin ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              updateMutation.mutate({
                name: (fd.get('name') as string) || undefined,
                pib: (fd.get('pib') as string) || undefined,
                mb: (fd.get('mb') as string) || undefined,
                address: (fd.get('address') as string) || undefined,
                city: (fd.get('city') as string) || undefined,
                postalCode: (fd.get('postalCode') as string) || undefined,
              });
            }}
          >
            {error && (
              <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                {error}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Naziv korisnika</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={company.name}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">PIB</label>
                <input
                  type="text"
                  name="pib"
                  defaultValue={company.pib ?? ''}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Matični broj</label>
                <input
                  type="text"
                  name="mb"
                  defaultValue={company.mb ?? ''}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ulica i broj</label>
                <input
                  type="text"
                  name="address"
                  defaultValue={company.address ?? ''}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Mesto</label>
                <input
                  type="text"
                  name="city"
                  defaultValue={company.city ?? ''}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Poštanski broj</label>
                <input
                  type="text"
                  name="postalCode"
                  defaultValue={company.postalCode ?? ''}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                />
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
              <button
                type="button"
                onClick={() => window.history.back()}
                className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200"
              >
                Nazad
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-2 text-sm">
            <div className="flex gap-3 py-1">
              <span className="w-36 text-zinc-500 dark:text-zinc-400">Naziv</span>
              <span className="text-zinc-900 dark:text-zinc-50">{company.name}</span>
            </div>
            <div className="flex gap-3 py-1">
              <span className="w-36 text-zinc-500 dark:text-zinc-400">PIB</span>
              <span className="text-zinc-900 dark:text-zinc-50">{company.pib ?? '—'}</span>
            </div>
            <div className="flex gap-3 py-1">
              <span className="w-36 text-zinc-500 dark:text-zinc-400">Matični broj</span>
              <span className="text-zinc-900 dark:text-zinc-50">{company.mb ?? '—'}</span>
            </div>
            <div className="flex gap-3 py-1">
              <span className="w-36 text-zinc-500 dark:text-zinc-400">Ulica i broj</span>
              <span className="text-zinc-900 dark:text-zinc-50">{company.address ?? '—'}</span>
            </div>
            <div className="flex gap-3 py-1">
              <span className="w-36 text-zinc-500 dark:text-zinc-400">Mesto</span>
              <span className="text-zinc-900 dark:text-zinc-50">{company.city ?? '—'}</span>
            </div>
            <div className="flex gap-3 py-1">
              <span className="w-36 text-zinc-500 dark:text-zinc-400">Poštanski broj</span>
              <span className="text-zinc-900 dark:text-zinc-50">{company.postalCode ?? '—'}</span>
            </div>
          </div>
        )}
      </section>

      {/* Dodaci */}
      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Dodaci</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {addOnKeys.map(({ key, label }) => {
            const active = !!company[key];
            return (
              <div
                key={key}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-600"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: active ? '#22c55e' : '#ef4444' }}
                  aria-hidden
                />
                <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                {canEditAddons && (
                  <button
                    type="button"
                    onClick={() => toggleAddOnMutation.mutate({ [key]: !active })}
                    disabled={toggleAddOnMutation.isPending}
                    className={
                      active
                        ? 'rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                        : 'rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800'
                    }
                  >
                    {active ? 'Deaktiviraj' : 'Aktiviraj'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Dodeljeni uređaji */}
      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Dodeljeni uređaji {devices.length > 0 && `(poslednjih ${Math.min(devices.length, 10)})`}
        </h2>
        {isSuperAdmin && (
          <div className="mb-3 flex flex-wrap gap-2">
            <Link
              href={`/devices/add${id ? `?companyId=${id}` : ''}`}
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200"
            >
              Dodaj novi
            </Link>
            <button
              type="button"
              onClick={() => setAssignModalOpen(true)}
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200"
            >
              Dodeli
            </button>
            <Link
              href={`/devices?companyId=${id}`}
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200"
            >
              Pogledaj sve
            </Link>
          </div>
        )}
        {devices.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nema dodeljenih uređaja.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-700">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Serijski broj</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Naziv uređaja</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Model</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                  {isSuperAdmin && <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Akcije</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {devices.slice(0, 10).map((d) => (
                  <tr key={d.id} className="bg-white dark:bg-zinc-800/30">
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{d.serialNo ?? '—'}</td>
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{d.name ?? '—'}</td>
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{d.model ?? '—'}</td>
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{d.status}</td>
                    {isSuperAdmin && (
                      <td className="px-4 py-2">
                        <Link
                          href={`/devices/${d.id}`}
                          className="text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          Izmeni
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Korisnički nalozi */}
      {isSuperAdmin && (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Korisnički nalozi</h2>
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setAddUserModalOpen(true)}
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200"
            >
              Dodaj novi
            </button>
          </div>
          {companyUsers.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Nema korisničkih naloga za ovog korisnika.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">E-mail</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Ime</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Rola</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {companyUsers.map((u) => (
                    <tr key={u.id} className="bg-white dark:bg-zinc-800/30">
                      <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{u.email}</td>
                      <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{u.displayName ?? '—'}</td>
                      <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{u.role}</td>
                      <td className="px-4 py-2 text-zinc-900 dark:text-zinc-50">{u.isActive ? 'aktivan' : 'neaktivan'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <AssignDeviceModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        companyId={id}
        companyName={company.name}
      />
      <AddCompanyUserModal
        open={addUserModalOpen}
        onClose={() => setAddUserModalOpen(false)}
        companyId={id}
        companyName={company.name}
      />
    </div>
  );
}
