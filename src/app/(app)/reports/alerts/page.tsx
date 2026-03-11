'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type User } from '@/lib/api';
import { useToast } from '@/components/toast';
import { getToken } from '@/lib/auth';
import { SearchableSelect } from '@/components/searchable-select';
import { DEVICES_ENDPOINT, LICENCES_ENDPOINT } from '@/lib/endpoints';

interface AlertsConfig {
  notificationsDaysBefore: number[];
  reportSchedule: 'none' | 'daily' | 'weekly';
  reportEmails: string[];
}

interface TenantUser {
  id: string;
  email: string;
  displayName: string | null;
}

function userLabel(u: { displayName: string | null; email: string } | null) {
  if (!u) return '—';
  return u.displayName || u.email;
}

const baseURL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
    : 'http://localhost:3001';

type ReportTab = 'tickets' | 'devices' | 'licences';

const DAYS_BACK_OPTIONS = [7, 10, 14, 30];

export default function ReportsAlertsPage() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const [reportSchedule, setReportSchedule] = useState<'none' | 'daily' | 'weekly'>('none');
  const [reportEmailsText, setReportEmailsText] = useState('');
  const [daysBack, setDaysBack] = useState(10);
  const [activeTab, setActiveTab] = useState<ReportTab>('tickets');

  // Tickets filters
  const [tStatus, setTStatus] = useState('');
  const [tType, setTType] = useState('');
  const [tAssigneeId, setTAssigneeId] = useState('');
  const [tCompanyId, setTCompanyId] = useState('');

  // Devices filters
  const [dStatus, setDStatus] = useState('');
  const [dCompanyId, setDCompanyId] = useState('');
  const [dSearch, setDSearch] = useState('');

  // Licences filters
  const [lStatus, setLStatus] = useState('');
  const [lCompanyId, setLCompanyId] = useState('');
  const [lExpiringInDays, setLExpiringInDays] = useState<number | null>(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
  });

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['reports', 'alerts', 'config'],
    queryFn: async () => {
      const res = await api.get<AlertsConfig>('/reports/alerts/config');
      return res.data;
    },
    enabled: user?.role === 'SUPER_ADMIN',
  });

  useEffect(() => {
    if (config) {
      setReportSchedule(config.reportSchedule ?? 'none');
      setReportEmailsText((config.reportEmails ?? []).join('\n'));
    }
  }, [config]);

  const patch = useMutation({
    mutationFn: async (body: { reportSchedule?: 'none' | 'daily' | 'weekly'; reportEmails?: string[] }) => {
      const res = await api.patch<AlertsConfig>('/reports/alerts/config', body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'alerts', 'config'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Greška pri čuvanju.');
    },
  });

  const handleSaveReportConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const emails = reportEmailsText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    patch.mutate({ reportSchedule, reportEmails: emails });
  };

  const { data: users } = useQuery({
    queryKey: ['auth', 'users'],
    queryFn: async () => {
      const res = await api.get<TenantUser[]>('/auth/users');
      return res.data;
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/companies');
      return res.data ?? [];
    },
  });

  const ticketParams = () => {
    const params = new URLSearchParams();
    if (tStatus) params.set('status', tStatus);
    if (tType) params.set('type', tType);
    if (tAssigneeId) params.set('assigneeId', tAssigneeId);
    if (tCompanyId) params.set('companyId', tCompanyId);
    params.set('page', '1');
    params.set('limit', '100');
    return params;
  };

  const deviceParams = () => {
    const params: { status?: string; companyId?: string; search?: string } = {};
    if (dStatus) params.status = dStatus;
    if (dCompanyId) params.companyId = dCompanyId;
    if (dSearch.trim()) params.search = dSearch.trim();
    return params;
  };

  const licenceParams = () => {
    const params: { status?: string; companyId?: string; expiringInDays?: number } = {};
    if (lStatus) params.status = lStatus;
    if (lCompanyId) params.companyId = lCompanyId;
    if (lExpiringInDays != null) params.expiringInDays = lExpiringInDays;
    return params;
  };

  const executeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ sent: number; failed: number; message: string }>(
        '/reports/alerts/execute',
        { reportType: activeTab, daysBack },
      );
      return res.data;
    },
    onSuccess: (data) => {
      showSuccess(data.message);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Slanje izveštaja nije uspelo.');
    },
  });

  async function exportCsv() {
    try {
      const token = getToken();
      if (activeTab === 'tickets') {
        const res = await fetch(`${baseURL}/reports/tickets/export?${ticketParams().toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(res.statusText);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tickets_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (activeTab === 'devices') {
        const params = new URLSearchParams();
        const qp = deviceParams();
        if (qp.status) params.set('status', qp.status);
        if (qp.companyId) params.set('companyId', qp.companyId);
        if (qp.search) params.set('search', qp.search);
        const q = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${baseURL}${DEVICES_ENDPOINT}/export${q}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(res.statusText);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devices_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const params = new URLSearchParams();
        const qp = licenceParams();
        if (qp.status) params.set('status', qp.status);
        if (qp.companyId) params.set('companyId', qp.companyId);
        if (qp.expiringInDays != null) params.set('expiringInDays', String(qp.expiringInDays));
        const q = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${baseURL}${LICENCES_ENDPOINT}/export${q}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(res.statusText);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `licences_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Export nije uspeo.');
    }
  }

  if (userLoading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
        <p className="text-sm text-zinc-500">Učitavanje…</p>
      </div>
    );
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
        <p className="font-medium">Pristup samo za SUPER_ADMIN.</p>
        <Link href="/reports/overview" className="mt-2 inline-block text-sm text-emerald-600 hover:underline dark:text-emerald-400">
          ← Nazad na Reports
        </Link>
      </div>
    );
  }

  const savedEmails = config?.reportEmails ?? [];

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Podešavanje izveštaja po tabu (tiketi, uređaji, licence). Sačuvane email adrese prikazane su u tabeli desno.
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <span>Podsetnik licence: <strong>{config?.notificationsDaysBefore?.join(', ') ?? '30, 14, 7, 1'}</strong> dana</span>
        <Link href="/settings/notifications" className="text-emerald-600 hover:underline dark:text-emerald-400">
          Podesi u Settings →
        </Link>
      </div>

      {/* Tabovi: Izveštaj Tiketi / Uređaji / Licence */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/50">
        <div className="flex border-b border-zinc-200 dark:border-zinc-700">
          {(
            [
              { id: 'tickets' as const, label: 'Izveštaj – Tiketi' },
              { id: 'devices' as const, label: 'Izveštaj – Uređaji' },
              { id: 'licences' as const, label: 'Izveštaj – Licence' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex min-h-[320px]">
          {/* Leva kolona: config + opseg + Egzekutuj + filteri + Export */}
          <div className="min-w-0 flex-1 border-r border-zinc-200 p-4 dark:border-zinc-700">
            {/* U svakom tabu: Šalji izveštaj, Email adrese, Sačuvaj */}
            {configLoading ? (
              <p className="text-sm text-zinc-500">Učitavanje…</p>
            ) : (
              <form onSubmit={handleSaveReportConfig} className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/30">
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Šalji izveštaj</label>
                    <select
                      value={reportSchedule}
                      onChange={(e) => setReportSchedule(e.target.value as 'none' | 'daily' | 'weekly')}
                      className="mt-1 rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="none">Nikad</option>
                      <option value="daily">Dnevno</option>
                      <option value="weekly">Nedeljno</option>
                    </select>
                  </div>
                  <div className="min-w-[200px] flex-1">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email adrese</label>
                    <textarea
                      value={reportEmailsText}
                      onChange={(e) => setReportEmailsText(e.target.value)}
                      rows={2}
                      placeholder="admin@firma.rs (jedna po liniji)"
                      className="mt-1 w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={patch.isPending}
                    className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {patch.isPending ? 'Čuvam…' : 'Sačuvaj'}
                  </button>
                </div>
              </form>
            )}

            {/* Opseg izveštaja + Egzekutuj */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Opseg izveštaja</span>
                <div className="flex gap-1">
                  {DAYS_BACK_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDaysBack(d)}
                      className={`rounded px-3 py-1.5 text-sm ${
                        daysBack === d
                          ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                          : 'border border-zinc-300 dark:border-zinc-600'
                      }`}
                    >
                      {d} dana unazad
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => executeMutation.mutate()}
                disabled={executeMutation.isPending || savedEmails.length === 0}
                className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {executeMutation.isPending ? 'Šaljem…' : 'Egzekutuj'}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Filteri za Export CSV.
              </span>
              <button
                type="button"
                onClick={exportCsv}
                className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600 dark:text-zinc-200"
              >
                Export CSV
              </button>
            </div>

            {activeTab === 'tickets' && (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Status</label>
                  <select
                    value={tStatus}
                    onChange={(e) => setTStatus(e.target.value)}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="">Svi</option>
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="DONE">DONE</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Tip</label>
                  <select
                    value={tType}
                    onChange={(e) => setTType(e.target.value)}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="">Svi</option>
                    <option value="CALL">CALL</option>
                    <option value="SUPPORT">SUPPORT</option>
                    <option value="SALES">SALES</option>
                    <option value="FIELD">FIELD</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Dodeljen</label>
                  <SearchableSelect
                    value={tAssigneeId}
                    onChange={setTAssigneeId}
                    options={[
                      { id: '', label: 'Svi' },
                      { id: 'unassigned', label: 'Unassigned' },
                      ...(users ?? []).map((u) => ({ id: u.id, label: userLabel(u) })),
                    ]}
                    placeholder="Svi"
                    searchPlaceholder="Pretraži..."
                    className="min-w-[10rem]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Kompanija</label>
                  <SearchableSelect
                    value={tCompanyId}
                    onChange={setTCompanyId}
                    options={[
                      { id: '', label: 'Svi' },
                      ...companies.map((c) => ({ id: c.id, label: c.name })),
                    ]}
                    placeholder="Svi"
                    searchPlaceholder="Pretraži..."
                    className="min-w-[12rem]"
                  />
                </div>
              </div>
            )}

            {activeTab === 'devices' && (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Status</label>
                  <select
                    value={dStatus}
                    onChange={(e) => setDStatus(e.target.value)}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="">Svi</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="RETIRED">RETIRED</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Kompanija</label>
                  <SearchableSelect
                    value={dCompanyId}
                    onChange={setDCompanyId}
                    options={[
                      { id: '', label: 'Svi' },
                      ...companies.map((c) => ({ id: c.id, label: c.name })),
                    ]}
                    placeholder="Svi"
                    searchPlaceholder="Pretraži..."
                    className="min-w-[12rem]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Pretraga</label>
                  <input
                    type="text"
                    placeholder="Serial no…"
                    value={dSearch}
                    onChange={(e) => setDSearch(e.target.value)}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>
            )}

            {activeTab === 'licences' && (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Status</label>
                  <select
                    value={lStatus}
                    onChange={(e) => setLStatus(e.target.value)}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="">Svi</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Kompanija</label>
                  <SearchableSelect
                    value={lCompanyId}
                    onChange={setLCompanyId}
                    options={[
                      { id: '', label: 'Svi' },
                      ...companies.map((c) => ({ id: c.id, label: c.name })),
                    ]}
                    placeholder="Svi"
                    searchPlaceholder="Pretraži..."
                    className="min-w-[12rem]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Ističe za</label>
                  <div className="flex gap-1">
                    {([30, 14, 7, 1] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setLExpiringInDays((prev) => (prev === d ? null : d))}
                        className={`rounded px-2 py-1 text-sm ${
                          lExpiringInDays === d
                            ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                            : 'border border-zinc-300 dark:border-zinc-600'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                    {lExpiringInDays != null && (
                      <button
                        type="button"
                        onClick={() => setLExpiringInDays(null)}
                        className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desna kolona: sačuvane email adrese */}
          <div className="w-[380px] shrink-0 overflow-hidden border-zinc-200 dark:border-zinc-700">
            <div className="sticky top-0 flex h-full flex-col border-l border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/30">
              <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
                <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Sačuvane email adrese
                  <span className="ml-2 text-zinc-500">({savedEmails.length})</span>
                </h3>
              </div>
              <div className="flex-1 overflow-auto p-2">
                {savedEmails.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500">
                    Nema sačuvanih adresa. Unesite email adrese i kliknite Sačuvaj.
                  </p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-700">
                        <th className="py-1.5 pr-2 font-medium">#</th>
                        <th className="py-1.5 font-medium">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedEmails.map((email, i) => (
                        <tr key={`${email}-${i}`} className="border-b border-zinc-100 dark:border-zinc-800">
                          <td className="py-1.5 pr-2 text-zinc-500">{i + 1}</td>
                          <td className="truncate py-1.5">{email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
