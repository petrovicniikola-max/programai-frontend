'use client';

import { useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Ticket {
  id: string;
  key: string;
  title: string;
  status: string;
  type: string;
  contactMethod?: string | null;
  callOccurredAt?: string | null;
  createdAt: string;
  company: { id: string; name: string } | null;
  createdBy: { id: string; email: string; displayName: string | null } | null;
}

interface TicketsResponse {
  items: Ticket[];
  total: number;
  page: number;
  limit: number;
}

interface SalesDirectoryRow {
  id: string;
  mb?: string | null;
  pib?: string | null;
  establishedAt?: string | null;
  companyName?: string | null;
  city?: string | null;
  postalCode?: string | null;
  address?: string | null;
  phone?: string | null;
  legalForm?: string | null;
  activityCode?: string | null;
  activityName?: string | null;
  aprStatus?: string | null;
  email?: string | null;
  representative?: string | null;
  description?: string | null;
  sizeClass?: string | null;
  contactDate?: string | null;
  fieldColors?: Record<string, string> | null;
  updatedAt: string;
}

type EditableDirectoryField =
  | 'mb'
  | 'pib'
  | 'establishedAt'
  | 'companyName'
  | 'city'
  | 'postalCode'
  | 'address'
  | 'phone'
  | 'legalForm'
  | 'activityCode'
  | 'activityName'
  | 'aprStatus'
  | 'email'
  | 'representative'
  | 'description'
  | 'sizeClass'
  | 'contactDate';

interface SalesDirectoryResponse {
  items: SalesDirectoryRow[];
  total: number;
  page: number;
  limit: number;
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

function startOfDay(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toISOString();
}
function endOfDay(dateStr: string): string {
  return new Date(dateStr + 'T23:59:59.999').toISOString();
}

function formatDateDdMmYyyy(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(String(dateStr));
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

const DIRECTORY_COLUMNS: { key: EditableDirectoryField; label: string }[] = [
  { key: 'mb', label: 'MB' },
  { key: 'pib', label: 'PIB' },
  { key: 'establishedAt', label: 'Datum osnivanja' },
  { key: 'companyName', label: 'Naziv preduzeća' },
  { key: 'city', label: 'Mesto' },
  { key: 'postalCode', label: 'Poštanski broj' },
  { key: 'address', label: 'Adresa' },
  { key: 'phone', label: 'Telefon' },
  { key: 'legalForm', label: 'Pravni oblik' },
  { key: 'activityCode', label: 'Šifra delatnosti' },
  { key: 'activityName', label: 'Naziv delatnosti' },
  { key: 'aprStatus', label: 'APR status' },
  { key: 'email', label: 'Email' },
  { key: 'representative', label: 'Zastupnik' },
  { key: 'description', label: 'Opis' },
  { key: 'sizeClass', label: 'Poziv/mail' },
  { key: 'contactDate', label: 'Datum' },
];

export default function SalesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    [now],
  );
  const defaultTo = useMemo(() => now.toISOString().slice(0, 10), [now]);

  const [activeTab, setActiveTab] = useState<'calls' | 'directory'>('calls');
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [createdByUserId, setCreatedByUserId] = useState<string>('');
  const [contactMethodFilter, setContactMethodFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryFilterField, setDirectoryFilterField] = useState('all');
  const [directoryFilterValue, setDirectoryFilterValue] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');

  const { data: users } = useQuery({
    queryKey: ['auth', 'users'],
    queryFn: async () => {
      const res = await api.get<TenantUser[]>('/auth/users');
      return res.data;
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', 'sales', 'O', dateFrom, dateTo, createdByUserId, contactMethodFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('keyStartsWith', 'O');
      params.set('page', String(page));
      params.set('limit', '50');
      params.set('createdAtFrom', startOfDay(dateFrom));
      params.set('createdAtTo', endOfDay(dateTo));
      if (createdByUserId.trim()) params.set('createdByUserId', createdByUserId.trim());
      const res = await api.get<TicketsResponse>(`/tickets?${params.toString()}`);
      return res.data;
    },
    enabled: activeTab === 'calls',
  });

  const {
    data: directory,
    isLoading: directoryLoading,
    error: directoryError,
  } = useQuery({
    queryKey: ['sales', 'directory', directoryPage, directoryFilterField, directoryFilterValue],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(directoryPage));
      params.set('limit', '50');
      if (directoryFilterValue.trim()) {
        params.set('filterValue', directoryFilterValue.trim());
        if (directoryFilterField !== 'all') params.set('filterField', directoryFilterField);
      }
      const res = await api.get<SalesDirectoryResponse>(`/sales/import-rows?${params.toString()}`);
      return res.data;
    },
    enabled: activeTab === 'directory',
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/sales/import-rows/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'directory'] });
    },
  });

  const items =
    contactMethodFilter === ''
      ? data?.items ?? []
      : (data?.items ?? []).filter((t) => t.contactMethod === contactMethodFilter);
  const total = contactMethodFilter === '' ? (data?.total ?? 0) : items.length;

  async function exportDirectory(
    format: 'csv' | 'xlsx',
    dateFrom?: string,
    dateTo?: string,
  ) {
    const params = new URLSearchParams();
    params.set('format', format);
    if (dateFrom) params.set('contactDateFrom', startOfDay(dateFrom));
    if (dateTo) params.set('contactDateTo', endOfDay(dateTo));
    const res = await api.get(`/sales/import-rows/export?${params.toString()}`, { responseType: 'blob' });
    const blob = new Blob([res.data], {
      type:
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prodaja_mailovi_pozivi_${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function exportDirectoryFallback(
    format: 'csv' | 'xlsx',
    dateFrom?: string,
    dateTo?: string,
  ) {
    const token = getToken();
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    const params = new URLSearchParams();
    params.set('format', format);
    if (dateFrom) params.set('contactDateFrom', startOfDay(dateFrom));
    if (dateTo) params.set('contactDateTo', endOfDay(dateTo));
    const res = await fetch(`${base}/sales/import-rows/export?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prodaja_mailovi_pozivi_${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Prodaja</h1>
        {activeTab === 'directory' && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importMutation.mutate(f);
                e.currentTarget.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
            >
              {importMutation.isPending ? 'Importujem…' : 'Import'}
            </button>
            <button
              type="button"
              onClick={() => {
                setExportFormat('csv');
                setShowExportModal(true);
              }}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setExportFormat('xlsx');
                setShowExportModal(true);
              }}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
            >
              Export XLSX
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 inline-flex rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setActiveTab('calls')}
          className={`rounded px-3 py-1.5 text-sm ${
            activeTab === 'calls' ? 'bg-emerald-600 text-white' : 'text-zinc-600 dark:text-zinc-300'
          }`}
        >
          Pozivi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`rounded px-3 py-1.5 text-sm ${
            activeTab === 'directory' ? 'bg-emerald-600 text-white' : 'text-zinc-600 dark:text-zinc-300'
          }`}
        >
          Mailovi i pozivi
        </button>
      </div>

      {activeTab === 'calls' && (
        <>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Samo tiketi iz forme Outgoing Call (ključ O-00001, O-00002, …). Filtriranje po periodu i korisniku koji je kreirao.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Od</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Do</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Kreirao</label>
              <select
                value={createdByUserId}
                onChange={(e) => {
                  setCreatedByUserId(e.target.value);
                  setPage(1);
                }}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">Svi korisnici</option>
                {(users ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {userLabel(u)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Način kontakta</label>
              <select
                value={contactMethodFilter}
                onChange={(e) => {
                  setContactMethodFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">Svi</option>
                <option value="PHONE">Telefonski poziv</option>
                <option value="EMAIL">Mail</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            {error && <p className="p-4 text-red-600 dark:text-red-400">Greška pri učitavanju. Proverite backend.</p>}
            {isLoading && <p className="p-4 text-zinc-500 dark:text-zinc-400">Učitavanje…</p>}
            {data && !error && (
              <>
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                    <tr>
                      <th className="px-4 py-2 font-medium">Key</th>
                      <th className="px-4 py-2 font-medium">Naziv</th>
                      <th className="px-4 py-2 font-medium">Kompanija</th>
                      <th className="px-4 py-2 font-medium">Način kontakta</th>
                      <th className="px-4 py-2 font-medium">Kreirao</th>
                      <th className="px-4 py-2 font-medium">Vreme poziva</th>
                      <th className="px-4 py-2 font-medium">Kreirano</th>
                      <th className="px-4 py-2 font-medium">Otvoriti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((t) => (
                      <tr key={t.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-4 py-2">
                          <Link href={`/tickets/${t.id}`} className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">{t.key}</Link>
                        </td>
                        <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">{t.title}</td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{t.company?.name ?? '—'}</td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{t.contactMethod === 'PHONE' ? 'Telefonski poziv' : t.contactMethod === 'EMAIL' ? 'Mail' : '—'}</td>
                        <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{userLabel(t.createdBy)}</td>
                        <td className="px-4 py-2 text-zinc-500 dark:text-zinc-500">{t.callOccurredAt ? new Date(t.callOccurredAt).toLocaleString() : '—'}</td>
                        <td className="px-4 py-2 text-zinc-500 dark:text-zinc-500">{new Date(t.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-2"><Link href={`/tickets/${t.id}`} className="text-emerald-600 hover:underline dark:text-emerald-400">Otvori</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {items.length === 0 && <p className="p-4 text-zinc-500 dark:text-zinc-400">Nema tiketa za prikaz.</p>}
                {total > (data?.limit ?? 0) && (
                  <div className="flex justify-end gap-2 border-t border-zinc-200 p-2 dark:border-zinc-700">
                    <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-2 py-1 text-sm disabled:opacity-50">Prethodna</button>
                    <span className="py-1 text-sm">Strana {page} od {Math.ceil(total / (data?.limit ?? 1))}</span>
                    <button type="button" disabled={page >= Math.ceil(total / (data?.limit ?? 1))} onClick={() => setPage((p) => p + 1)} className="rounded border px-2 py-1 text-sm disabled:opacity-50">Sledeća</button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'directory' && (
        <>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Tabela za mailove i pozive. Podržan je import u formatima CSV i XLSX (sa bojama polja iz XLSX fajla).
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-sm text-zinc-600 dark:text-zinc-400">Filter</label>
            <select
              value={directoryFilterField}
              onChange={(e) => {
                setDirectoryFilterField(e.target.value);
                setDirectoryPage(1);
              }}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="all">Sva polja</option>
              {DIRECTORY_COLUMNS.map((c) => (
                <option key={String(c.key)} value={String(c.key)}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              value={directoryFilterValue}
              onChange={(e) => {
                setDirectoryFilterValue(e.target.value);
                setDirectoryPage(1);
              }}
              placeholder="unesi vrednost za pretragu..."
              className="min-w-[260px] rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={() => {
                setDirectoryFilterField('all');
                setDirectoryFilterValue('');
                setDirectoryPage(1);
              }}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
            >
              Očisti filter
            </button>
            <div className="ml-auto">
              <Link
                href="/sales/directory/new"
                className="inline-flex rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
              >
                Dodaj ručno
              </Link>
            </div>
          </div>
          <div className="mt-4 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            {directoryError && <p className="p-4 text-red-600 dark:text-red-400">Greška pri učitavanju tabele.</p>}
            {directoryLoading && <p className="p-4 text-zinc-500 dark:text-zinc-400">Učitavanje…</p>}
            {directory && !directoryError && (
              <>
                <table className="min-w-[1500px] w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                    <tr>
                      {DIRECTORY_COLUMNS.map((c) => (
                        <th key={String(c.key)} className="px-3 py-2 font-medium">{c.label}</th>
                      ))}
                      <th className="px-3 py-2 font-medium">Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directory.items.map((row) => (
                      <tr key={row.id} className="border-b border-zinc-100 dark:border-zinc-800">
                        {DIRECTORY_COLUMNS.map((c) => {
                          const raw = row[c.key];
                          const text =
                            (c.key === 'establishedAt' || c.key === 'contactDate') && raw
                              ? formatDateDdMmYyyy(String(raw))
                              : String(raw ?? '');
                          const bg = row.fieldColors?.[String(c.key)];
                          return (
                            <td
                              key={`${row.id}-${String(c.key)}`}
                              className="px-3 py-2 text-zinc-700 dark:text-zinc-200"
                              style={bg ? { backgroundColor: bg } : undefined}
                            >
                              {text || '—'}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2">
                          <Link
                            href={`/sales/directory/${row.id}`}
                            className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {directory.items.length === 0 && (
                  <p className="p-4 text-zinc-500 dark:text-zinc-400">Nema importovanih redova.</p>
                )}
                {directory.total > directory.limit && (
                  <div className="flex justify-end gap-2 border-t border-zinc-200 p-2 dark:border-zinc-700">
                    <button
                      type="button"
                      disabled={directoryPage <= 1}
                      onClick={() => setDirectoryPage((p) => p - 1)}
                      className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                    >
                      Prethodna
                    </button>
                    <span className="py-1 text-sm">
                      Strana {directoryPage} od {Math.ceil(directory.total / directory.limit)}
                    </span>
                    <button
                      type="button"
                      disabled={directoryPage >= Math.ceil(directory.total / directory.limit)}
                      onClick={() => setDirectoryPage((p) => p + 1)}
                      className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                    >
                      Sledeća
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          {showExportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-xl rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Export po periodu (polje Datum)
                </h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Izaberi kalendarski period od-do za koji želiš izvoz podataka.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Od datuma</label>
                    <input
                      type="date"
                      value={exportDateFrom}
                      onChange={(e) => setExportDateFrom(e.target.value)}
                      className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Do datuma</label>
                    <input
                      type="date"
                      value={exportDateTo}
                      onChange={(e) => setExportDateTo(e.target.value)}
                      className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
                  >
                    Otkaži
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (exportDateFrom && exportDateTo && exportDateFrom > exportDateTo) {
                        window.alert('Datum "Od" ne može biti posle datuma "Do".');
                        return;
                      }
                      try {
                        await exportDirectory(exportFormat, exportDateFrom, exportDateTo);
                      } catch {
                        await exportDirectoryFallback(exportFormat, exportDateFrom, exportDateTo);
                      }
                      setShowExportModal(false);
                    }}
                    className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
                  >
                    Izvezi {exportFormat.toUpperCase()}
                  </button>
                </div>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}

