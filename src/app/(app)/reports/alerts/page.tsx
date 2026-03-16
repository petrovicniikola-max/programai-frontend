'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type User } from '@/lib/api';
import { useToast } from '@/components/toast';
import { getToken } from '@/lib/auth';
import { SearchableSelect } from '@/components/searchable-select';
import { DEVICES_ENDPOINT, LICENCES_ENDPOINT } from '@/lib/endpoints';

export interface ReportEmailConfigItem {
  email: string;
  schedule: 'daily' | 'weekly' | 'monthly' | 'yearly';
  reportType: 'tickets' | 'devices' | 'licences' | 'sales';
  companyId?: string;
  deviceIds?: string[];
  ticketStatuses?: ('OPEN' | 'IN_PROGRESS' | 'DONE')[];
  assigneeId?: string;
  salesCreatedByUserId?: string;
  salesContactMethod?: 'PHONE' | 'EMAIL';
  scheduleTime?: string;
  scheduleDayOfWeek?: number;
  scheduleMonthOption?: '1st_previous' | 'last_current';
  scheduleYearOption?: 'current' | 'previous';
}

interface AlertsConfig {
  notificationsDaysBefore: number[];
  reportSchedule: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  reportEmails: string[];
  reportEmailConfigs?: ReportEmailConfigItem[];
}

interface TenantUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface DeviceSummary {
  id: string;
  serialNo: string | null;
  name: string | null;
  company: { name: string | null } | null;
}

function userLabel(u: { displayName: string | null; email: string } | null) {
  if (!u) return '—';
  return u.displayName || u.email;
}

const baseURL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
    : 'http://localhost:3001';

type ReportTab = 'tickets' | 'devices' | 'licences' | 'sales';

const DAYS_BACK_OPTIONS = [7, 10, 14, 30];

const SCHEDULE_OPTIONS = [
  { id: 'daily' as const, label: 'Dnevno' },
  { id: 'weekly' as const, label: 'Nedeljno' },
  { id: 'monthly' as const, label: 'Mesečno' },
  { id: 'yearly' as const, label: 'Godišnje' },
];
const REPORT_TYPE_OPTIONS = [
  { id: 'tickets' as const, label: 'Tiketi' },
  { id: 'devices' as const, label: 'Uređaji' },
  { id: 'licences' as const, label: 'Licence' },
  { id: 'sales' as const, label: 'Prodaja' },
];
const TICKET_STATUS_OPTIONS: { id: 'OPEN' | 'IN_PROGRESS' | 'DONE'; label: string }[] = [
  { id: 'OPEN', label: 'Otvoreni' },
  { id: 'IN_PROGRESS', label: 'U toku' },
  { id: 'DONE', label: 'Zatvoreni' },
];
const WEEK_DAYS = [
  { value: 0, label: 'Nedelja' },
  { value: 1, label: 'Ponedeljak' },
  { value: 2, label: 'Utorak' },
  { value: 3, label: 'Sreda' },
  { value: 4, label: 'Četvrtak' },
  { value: 5, label: 'Petak' },
  { value: 6, label: 'Subota' },
];
const MONTH_OPTIONS = [
  { id: '1st_previous' as const, label: '1. u mesecu (prethodni mesec)' },
  { id: 'last_current' as const, label: '30./31. (tekući mesec)' },
];
const YEAR_OPTIONS = [
  { id: 'current' as const, label: 'Tekuća godina' },
  { id: 'previous' as const, label: 'Prethodna godina' },
];

export default function ReportsAlertsPage() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const [reportEmailConfigs, setReportEmailConfigs] = useState<ReportEmailConfigItem[]>([]);
  const [activeTab, setActiveTab] = useState<ReportTab>('tickets');
  const [devicePickerRowIndex, setDevicePickerRowIndex] = useState<number | null>(null);

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

  // Sales (Prodaja) export filters
  const [sDateFrom, setSDateFrom] = useState('');
  const [sDateTo, setSDateTo] = useState('');
  const [sCreatedByUserId, setSCreatedByUserId] = useState('');
  const [sContactMethod, setSContactMethod] = useState('');

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

  const [editingIndexes, setEditingIndexes] = useState<number[]>([]);

  useEffect(() => {
    if (config?.reportEmailConfigs != null && config.reportEmailConfigs.length >= 0) {
      setReportEmailConfigs(config.reportEmailConfigs);
      setEditingIndexes([]);
    }
  }, [config?.reportEmailConfigs]);

  const patch = useMutation({
    mutationFn: async (body: { reportEmailConfigs: ReportEmailConfigItem[] }) => {
      const res = await api.patch<AlertsConfig>('/reports/alerts/config', body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'alerts', 'config'] });
      setEditingIndexes([]);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Greška pri čuvanju.');
    },
  });

  const addConfigRow = () => {
    setReportEmailConfigs((prev) => [
      ...prev,
      {
        email: '',
        schedule: 'weekly',
        reportType: 'tickets',
        scheduleTime: '08:00',
        scheduleDayOfWeek: 3,
        scheduleMonthOption: '1st_previous',
        scheduleYearOption: 'current',
      },
    ]);
    setEditingIndexes((prev) => [...prev, reportEmailConfigs.length]);
  };

  const removeConfigRow = (index: number) => {
    setReportEmailConfigs((prev) => prev.filter((_, i) => i !== index));
    setEditingIndexes((prev) =>
      prev
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i)),
    );
    if (devicePickerRowIndex === index) setDevicePickerRowIndex(null);
    else if (devicePickerRowIndex != null && devicePickerRowIndex > index) setDevicePickerRowIndex(devicePickerRowIndex - 1);
  };

  const updateConfigRow = (index: number, patch: Partial<ReportEmailConfigItem>) => {
    setReportEmailConfigs((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  };

  const handleSaveConfigs = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = reportEmailConfigs.filter((c) => c.email?.trim());
    if (valid.length === 0) {
      showError('Dodajte bar jednu stavku sa email adresom.');
      return;
    }
    patch.mutate({
      reportEmailConfigs: valid.map((c) => ({
        ...c,
        email: c.email.trim(),
        companyId: c.companyId?.trim() || undefined,
        ticketStatuses: c.ticketStatuses?.length ? c.ticketStatuses : undefined,
        assigneeId: c.assigneeId?.trim() || undefined,
        salesCreatedByUserId: c.salesCreatedByUserId?.trim() || undefined,
        salesContactMethod: c.salesContactMethod || undefined,
        scheduleTime: c.scheduleTime?.trim() || undefined,
        scheduleDayOfWeek: c.scheduleDayOfWeek,
        scheduleMonthOption: c.scheduleMonthOption,
        scheduleYearOption: c.scheduleYearOption,
      })),
    });
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

  const salesExportParams = () => {
    const params = new URLSearchParams();
    if (sDateFrom) params.set('createdAtFrom', new Date(sDateFrom + 'T00:00:00').toISOString());
    if (sDateTo) params.set('createdAtTo', new Date(sDateTo + 'T23:59:59.999').toISOString());
    if (sCreatedByUserId) params.set('createdByUserId', sCreatedByUserId);
    if (sContactMethod) params.set('contactMethod', sContactMethod);
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

  const executeAllMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ sent: number; failed: number; message: string }>(
        '/reports/alerts/execute',
        { executeAll: true },
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

  const executeOneMutation = useMutation({
    mutationFn: async (configIndex: number) => {
      const res = await api.post<{ sent: number; failed: number; message: string }>(
        '/reports/alerts/execute',
        { configIndex },
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
      } else if (activeTab === 'sales') {
        const q = salesExportParams().toString();
        const res = await fetch(`${baseURL}/reports/sales/export${q ? `?${q}` : ''}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(res.statusText);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prodaja_${new Date().toISOString().slice(0, 10)}.csv`;
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

  const { data: deviceSearchResults = [] } = useQuery({
    queryKey: ['reports', 'alerts', 'devices-search', dStatus, dCompanyId, dSearch],
    enabled: (activeTab === 'devices' || devicePickerRowIndex != null) && dSearch.trim().length >= 2,
    queryFn: async () => {
      if (!dSearch.trim() || dSearch.trim().length < 2) return [] as DeviceSummary[];
      const res = await api.get<DeviceSummary[]>(DEVICES_ENDPOINT, {
        params: {
          status: dStatus || undefined,
          companyId: dCompanyId || undefined,
          search: dSearch.trim(),
        },
      });
      return res.data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Konfiguracija po email adresi: svaki primalac može imati svoj period (dnevno/nedeljno/mesečno/godišnje), tip izveštaja (tiketi/uređaji/licence) i filter po kompaniji ili uređajima.
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <span>Podsetnik licence: <strong>{config?.notificationsDaysBefore?.join(', ') ?? '30, 14, 7, 1'}</strong> dana</span>
        <Link href="/settings/notifications" className="text-emerald-600 hover:underline dark:text-emerald-400">
          Podesi u Settings →
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/50">
        <div className="flex min-h-[320px]">
          {/* Leva kolona: per-email config tabela + Egzekutuj sve + Export */}
          <div className="min-w-0 flex-1 border-r border-zinc-200 p-4 dark:border-zinc-700">
            {configLoading ? (
              <p className="text-sm text-zinc-500">Učitavanje…</p>
            ) : (
              <form onSubmit={handleSaveConfigs} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Konfiguracija po emailu</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addConfigRow}
                      className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:text-zinc-200"
                    >
                      + Dodaj red
                    </button>
                    <button
                      type="submit"
                      disabled={patch.isPending}
                      className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {patch.isPending ? 'Čuvam…' : 'Sačuvaj'}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-700">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                      <tr>
                        <th className="px-2 py-2 font-medium">Email</th>
                        <th className="px-2 py-2 font-medium">Period</th>
                        <th className="px-2 py-2 font-medium">Tip</th>
                        <th className="px-2 py-2 font-medium min-w-[200px]">Filter / Opcije</th>
                        <th className="px-2 py-2 font-medium min-w-[180px]">Vreme slanja</th>
                        <th className="w-10 px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingIndexes.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-2 py-4 text-center text-zinc-500">
                            Nema otvorenih stavki za uređivanje. Kliknite „Dodaj red” ili Edit u pregledu desno.
                          </td>
                        </tr>
                      )}
                      {editingIndexes.map((index) => {
                        const row = reportEmailConfigs[index];
                        if (!row) return null;
                        return (
                        <tr key={index} className="border-b border-zinc-100 dark:border-zinc-800">
                          <td className="px-2 py-1.5">
                            <input
                              type="email"
                              value={row.email}
                              onChange={(e) => updateConfigRow(index, { email: e.target.value })}
                              placeholder="admin@firma.rs"
                              className="w-full min-w-[160px] rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={row.schedule}
                              onChange={(e) => updateConfigRow(index, { schedule: e.target.value as ReportEmailConfigItem['schedule'] })}
                              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                            >
                              {SCHEDULE_OPTIONS.map((o) => (
                                <option key={o.id} value={o.id}>{o.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={row.reportType}
                              onChange={(e) => {
                                const reportType = e.target.value as ReportEmailConfigItem['reportType'];
                                const patch: Partial<ReportEmailConfigItem> = { reportType };
                                if (reportType === 'tickets') {
                                  patch.companyId = undefined;
                                  patch.deviceIds = undefined;
                                }
                                if (reportType === 'sales') {
                                  patch.companyId = undefined;
                                  patch.deviceIds = undefined;
                                  patch.ticketStatuses = undefined;
                                  patch.assigneeId = undefined;
                                }
                                if (reportType !== 'sales') {
                                  patch.salesCreatedByUserId = undefined;
                                  patch.salesContactMethod = undefined;
                                }
                                updateConfigRow(index, patch);
                              }}
                              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                            >
                              {REPORT_TYPE_OPTIONS.map((o) => (
                                <option key={o.id} value={o.id}>{o.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            {row.reportType === 'tickets' && (
                              <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap gap-2">
                                  {TICKET_STATUS_OPTIONS.map((opt) => {
                                    const selected = (row.ticketStatuses ?? []).includes(opt.id);
                                    return (
                                      <label key={opt.id} className="flex items-center gap-1 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={selected}
                                          onChange={() => {
                                            const next = selected
                                              ? (row.ticketStatuses ?? []).filter((s) => s !== opt.id)
                                              : [...(row.ticketStatuses ?? []), opt.id];
                                            updateConfigRow(index, { ticketStatuses: next.length ? next : undefined });
                                          }}
                                          className="rounded border-zinc-400"
                                        />
                                        <span className="text-xs">{opt.label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                                <SearchableSelect
                                  value={row.assigneeId ?? ''}
                                  onChange={(id) => updateConfigRow(index, { assigneeId: id || undefined })}
                                  options={[
                                    { id: '', label: 'Svi korisnici' },
                                    { id: 'unassigned', label: 'Bez kreatora' },
                                    ...(users ?? []).map((u) => ({ id: u.id, label: userLabel(u) })),
                                  ]}
                                  placeholder="Kreirao…"
                                  searchPlaceholder="Pretraži..."
                                  className="min-w-[140px]"
                                />
                              </div>
                            )}
                            {row.reportType === 'sales' && (
                              <div className="flex flex-col gap-2">
                                <SearchableSelect
                                  value={row.salesCreatedByUserId ?? ''}
                                  onChange={(id) => updateConfigRow(index, { salesCreatedByUserId: id || undefined })}
                                  options={[
                                    { id: '', label: 'Svi korisnici' },
                                    ...(users ?? []).map((u) => ({ id: u.id, label: userLabel(u) })),
                                  ]}
                                  placeholder="Kreirao…"
                                  searchPlaceholder="Pretraži..."
                                  className="min-w-[140px]"
                                />
                                <select
                                  value={row.salesContactMethod ?? ''}
                                  onChange={(e) =>
                                    updateConfigRow(index, {
                                      salesContactMethod: (e.target.value as 'PHONE' | 'EMAIL' | '') || undefined,
                                    })
                                  }
                                  className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                >
                                  <option value="">Svi načini</option>
                                  <option value="PHONE">Telefonski poziv</option>
                                  <option value="EMAIL">Mail</option>
                                </select>
                              </div>
                            )}
                            {(row.reportType === 'devices' || row.reportType === 'licences') && (
                              <div className="flex flex-col gap-1">
                                <SearchableSelect
                                  value={row.companyId ?? ''}
                                  onChange={(id) => updateConfigRow(index, { companyId: id || undefined })}
                                  options={[
                                    { id: '', label: 'Sve kompanije' },
                                    ...companies.map((c) => ({ id: c.id, label: c.name })),
                                  ]}
                                  placeholder="Kompanija"
                                  searchPlaceholder="Pretraži..."
                                  className="min-w-[120px]"
                                />
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-zinc-500">
                                    {(row.deviceIds?.length ?? 0) > 0 ? `${row.deviceIds?.length ?? 0} uređaja` : '—'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setDevicePickerRowIndex(devicePickerRowIndex === index ? null : index)}
                                    className="rounded border border-zinc-300 px-2 py-0.5 text-xs dark:border-zinc-600"
                                  >
                                    {devicePickerRowIndex === index ? 'Zatvori' : 'Izaberi uređaje'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1.5 align-top">
                            {row.schedule === 'daily' && (
                              <input
                                type="time"
                                value={row.scheduleTime ?? '08:00'}
                                onChange={(e) => updateConfigRow(index, { scheduleTime: e.target.value })}
                                className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                              />
                            )}
                            {row.schedule === 'weekly' && (
                              <div className="flex flex-wrap items-center gap-1">
                                <select
                                  value={row.scheduleDayOfWeek ?? 3}
                                  onChange={(e) => updateConfigRow(index, { scheduleDayOfWeek: Number(e.target.value) })}
                                  className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                >
                                  {WEEK_DAYS.map((d) => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                  ))}
                                </select>
                                <input
                                  type="time"
                                  value={row.scheduleTime ?? '05:15'}
                                  onChange={(e) => updateConfigRow(index, { scheduleTime: e.target.value })}
                                  className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                />
                              </div>
                            )}
                            {row.schedule === 'monthly' && (
                              <div className="flex flex-wrap items-center gap-1">
                                <select
                                  value={row.scheduleMonthOption ?? '1st_previous'}
                                  onChange={(e) =>
                                    updateConfigRow(index, {
                                      scheduleMonthOption: e.target.value as '1st_previous' | 'last_current',
                                    })
                                  }
                                  className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                >
                                  {MONTH_OPTIONS.map((o) => (
                                    <option key={o.id} value={o.id}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="time"
                                  value={row.scheduleTime ?? '08:00'}
                                  onChange={(e) => updateConfigRow(index, { scheduleTime: e.target.value })}
                                  className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                />
                              </div>
                            )}
                            {row.schedule === 'yearly' && (
                              <div className="flex flex-wrap items-center gap-1">
                                <select
                                  value={row.scheduleYearOption ?? 'current'}
                                  onChange={(e) => updateConfigRow(index, { scheduleYearOption: e.target.value as 'current' | 'previous' })}
                                  className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                >
                                  {YEAR_OPTIONS.map((o) => (
                                    <option key={o.id} value={o.id}>{o.label}</option>
                                  ))}
                                </select>
                                <input
                                  type="time"
                                  value={row.scheduleTime ?? '08:00'}
                                  onChange={(e) => updateConfigRow(index, { scheduleTime: e.target.value })}
                                  className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => executeOneMutation.mutate(index)}
                                disabled={
                                  !row.email?.trim() ||
                                  (executeOneMutation.isPending && executeOneMutation.variables === index)
                                }
                                className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                                title="Pošalji izveštaj samo na ovaj email (koristi sačuvanu konfiguraciju)"
                              >
                                {executeOneMutation.isPending && executeOneMutation.variables === index
                                  ? 'Šaljem…'
                                  : 'Pošalji'}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeConfigRow(index)}
                                className="text-red-600 hover:underline dark:text-red-400 text-xs"
                              >
                                Obriši
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </form>
            )}

            {/* Device picker za izabrani red (tip Uređaji ili Licence) */}
            {devicePickerRowIndex != null && (reportEmailConfigs[devicePickerRowIndex]?.reportType === 'devices' || reportEmailConfigs[devicePickerRowIndex]?.reportType === 'licences') && (
              <div className="mt-3 rounded border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  Izbor uređaja za: {reportEmailConfigs[devicePickerRowIndex]?.email || 'ovaj email'} ({reportEmailConfigs[devicePickerRowIndex]?.reportType === 'licences' ? 'Licence' : 'Uređaji'})
                </p>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Serial no… (min 2 slova)"
                    value={dSearch}
                    onChange={(e) => setDSearch(e.target.value)}
                    className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <SearchableSelect
                    value={dCompanyId}
                    onChange={setDCompanyId}
                    options={[{ id: '', label: 'Sve kompanije' }, ...companies.map((c) => ({ id: c.id, label: c.name }))]}
                    placeholder="Sve kompanije"
                    className="min-w-[120px]"
                  />
                </div>
                {dSearch.trim().length >= 2 && (
                  <div className="max-h-36 space-y-1 overflow-auto rounded border border-zinc-200 bg-white p-2 text-xs dark:border-zinc-700 dark:bg-zinc-800">
                    {deviceSearchResults.length === 0 ? (
                      <p className="text-zinc-500">Nema rezultata.</p>
                    ) : (
                      deviceSearchResults.map((d) => {
                        const rowDeviceIds = reportEmailConfigs[devicePickerRowIndex!]?.deviceIds ?? [];
                        const checked = rowDeviceIds.includes(d.id);
                        return (
                          <label key={d.id} className="flex cursor-pointer gap-2 rounded px-1 py-0.5 hover:bg-zinc-50 dark:hover:bg-zinc-700/60">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked ? rowDeviceIds.filter((id) => id !== d.id) : [...rowDeviceIds, d.id];
                                updateConfigRow(devicePickerRowIndex!, { deviceIds: next });
                              }}
                            />
                            <span>{d.serialNo || d.name || d.id}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Egzekutuj sve */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => executeAllMutation.mutate()}
                disabled={executeAllMutation.isPending || reportEmailConfigs.filter((c) => c.email?.trim()).length === 0}
                className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {executeAllMutation.isPending ? 'Šaljem…' : 'Egzekutuj sve (po konfiguraciji)'}
              </button>
            </div>

            {/* Tabovi za Export CSV */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Export CSV:</span>
              {(['tickets', 'sales', 'devices', 'licences'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded px-3 py-1.5 text-sm ${
                    activeTab === tab ? 'bg-zinc-200 dark:bg-zinc-600' : 'border border-zinc-300 dark:border-zinc-600'
                  }`}
                >
                  {tab === 'tickets' ? 'Tiketi' : tab === 'sales' ? 'Prodaja' : tab === 'devices' ? 'Uređaji' : 'Licence'}
                </button>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
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

            {activeTab === 'sales' && (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Od</label>
                  <input
                    type="date"
                    value={sDateFrom}
                    onChange={(e) => setSDateFrom(e.target.value)}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Do</label>
                  <input
                    type="date"
                    value={sDateTo}
                    onChange={(e) => setSDateTo(e.target.value)}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Kreirao</label>
                  <SearchableSelect
                    value={sCreatedByUserId}
                    onChange={setSCreatedByUserId}
                    options={[
                      { id: '', label: 'Svi korisnici' },
                      ...(users ?? []).map((u) => ({ id: u.id, label: userLabel(u) })),
                    ]}
                    placeholder="Svi"
                    searchPlaceholder="Pretraži..."
                    className="min-w-[10rem]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Način kontakta</label>
                  <select
                    value={sContactMethod}
                    onChange={(e) => setSContactMethod(e.target.value)}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="">Svi</option>
                    <option value="PHONE">Telefonski poziv</option>
                    <option value="EMAIL">Mail</option>
                  </select>
                </div>
              </div>
            )}

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
                      { id: '', label: 'Sve kompanije' },
                      ...companies.map((c) => ({ id: c.id, label: c.name })),
                    ]}
                    placeholder="Sve kompanije"
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
                      { id: '', label: 'Sve kompanije' },
                      ...companies.map((c) => ({ id: c.id, label: c.name })),
                    ]}
                    placeholder="Sve kompanije"
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

          {/* Desna kolona: pregled konfiguracije */}
          <div className="w-[380px] shrink-0 overflow-hidden border-zinc-200 dark:border-zinc-700">
            <div className="sticky top-0 flex h-full flex-col border-l border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/30">
              <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
                <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Pregled konfiguracije
                  <span className="ml-2 text-zinc-500">({reportEmailConfigs.filter((c) => c.email?.trim()).length})</span>
                </h3>
              </div>
              <div className="flex-1 overflow-auto p-2">
                {reportEmailConfigs.filter((c) => c.email?.trim()).length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500">
                    Nema stavki. Dodajte red i unesite email, period i tip; zatim Sačuvaj.
                  </p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-700">
                        <th className="py-1.5 pr-2 font-medium">Email</th>
                        <th className="py-1.5 font-medium">Period</th>
                        <th className="py-1.5 font-medium">Tip</th>
                        <th className="py-1.5 font-medium text-right">Akcije</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportEmailConfigs.filter((c) => c.email?.trim()).map((c, i) => (
                        <tr key={`${c.email}-${i}`} className="border-b border-zinc-100 dark:border-zinc-800">
                          <td className="truncate py-1.5 max-w-[140px]" title={c.email}>{c.email}</td>
                          <td className="py-1.5 text-zinc-600 dark:text-zinc-400">{SCHEDULE_OPTIONS.find((o) => o.id === c.schedule)?.label ?? c.schedule}</td>
                          <td className="py-1.5 text-zinc-600 dark:text-zinc-400">{REPORT_TYPE_OPTIONS.find((o) => o.id === c.reportType)?.label ?? c.reportType}</td>
                          <td className="py-1.5 text-right">
                            <button
                              type="button"
                              onClick={() => setEditingIndexes((prev) => (prev.includes(i) ? prev : [...prev, i]))}
                              className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
