'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

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

export default function SalesPage() {
  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    [now],
  );
  const defaultTo = useMemo(() => now.toISOString().slice(0, 10), [now]);

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [createdByUserId, setCreatedByUserId] = useState<string>('');
  const [contactMethodFilter, setContactMethodFilter] = useState<string>('');
  const [page, setPage] = useState(1);

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
  });

  const items =
    contactMethodFilter === ''
      ? data?.items ?? []
      : (data?.items ?? []).filter((t) => t.contactMethod === contactMethodFilter);
  const total = contactMethodFilter === '' ? (data?.total ?? 0) : items.length;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Prodaja – pregled odlaznih poziva
        </h1>
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Samo tiketi iz forme Outgoing Call (ključ O-00001, O-00002, …). Filtriranje po periodu i korisniku koji je kreirao.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Od
          </label>
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
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Do
          </label>
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
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Kreirao
          </label>
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
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Način kontakta
          </label>
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
        {error && (
          <p className="p-4 text-red-600 dark:text-red-400">
            Greška pri učitavanju. Proverite backend.
          </p>
        )}
        {isLoading && (
          <p className="p-4 text-zinc-500 dark:text-zinc-400">Učitavanje…</p>
        )}
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
                  <tr
                    key={t.id}
                    className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/tickets/${t.id}`}
                        className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        {t.key}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">
                      {t.title}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {t.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {t.contactMethod === 'PHONE'
                        ? 'Telefonski poziv'
                        : t.contactMethod === 'EMAIL'
                          ? 'Mail'
                          : '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {userLabel(t.createdBy)}
                    </td>
                    <td className="px-4 py-2 text-zinc-500 dark:text-zinc-500">
                      {t.callOccurredAt
                        ? new Date(t.callOccurredAt).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-500 dark:text-zinc-500">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/tickets/${t.id}`}
                        className="text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        Otvori
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <p className="p-4 text-zinc-500 dark:text-zinc-400">
                Nema tiketa za prikaz.
              </p>
            )}
            {total > (data?.limit ?? 0) && (
              <div className="flex justify-end gap-2 border-t border-zinc-200 p-2 dark:border-zinc-700">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                >
                  Prethodna
                </button>
                <span className="py-1 text-sm">
                  Strana {page} od {Math.ceil(total / (data?.limit ?? 1))}
                </span>
                <button
                  type="button"
                  disabled={page >= Math.ceil(total / (data?.limit ?? 1))}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                >
                  Sledeća
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
