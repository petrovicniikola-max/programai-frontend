'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';
import { getToken } from '@/lib/auth';

const baseURL = typeof window !== 'undefined'
  ? process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'
  : 'http://localhost:3000';

interface FormItem {
  id: string;
  title: string;
  status: string;
}

export default function SettingsExportPage() {
  const { showError } = useToast();
  const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(new Set());

  const { data: formsData, isLoading: formsLoading, error: formsError } = useQuery({
    queryKey: ['forms', 'list'],
    queryFn: async () => {
      const res = await api.get<{ items: FormItem[] }>('/forms?limit=100');
      return res.data;
    },
  });

  const forms = formsData?.items ?? [];

  async function downloadCsv(path: string, filename: string) {
    try {
      const token = getToken();
      const res = await fetch(`${baseURL}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(res.statusText);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Download failed');
    }
  }

  function toggleForm(id: string) {
    setSelectedFormIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllForms() {
    setSelectedFormIds(new Set(forms.map((f) => f.id)));
  }

  function clearFormSelection() {
    setSelectedFormIds(new Set());
  }

  function downloadSelectedFormsList() {
    if (selectedFormIds.size === 0) {
      showError('Izaberite bar jednu formu.');
      return;
    }
    const q = `?formIds=${Array.from(selectedFormIds).join(',')}`;
    downloadCsv(`/settings/export/forms.csv${q}`, 'forms-selected.csv');
  }

  function downloadAllFormsList() {
    downloadCsv('/settings/export/forms.csv', 'forms-list.csv');
  }

  function downloadSelectedFormsResponses() {
    if (selectedFormIds.size === 0) {
      showError('Izaberite bar jednu formu.');
      return;
    }
    const list = forms.filter((f) => selectedFormIds.has(f.id));
    const safe = (s: string) => s.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') || 'form';
    list.forEach((form, i) => {
      setTimeout(() => {
        downloadCsv(`/forms/${form.id}/responses.csv`, `${safe(form.title)}-responses.csv`);
      }, i * 300);
    });
  }

  return (
    <div>
      <Link href="/settings" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Settings
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Data Export</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">Download CSV exports (SUPER_ADMIN only).</p>

      <div className="mt-6 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => downloadCsv('/settings/export/companies.csv', 'companies.csv')}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Download companies.csv
        </button>
        <button
          type="button"
          onClick={() => downloadCsv('/settings/export/contacts.csv', 'contacts.csv')}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Download contacts.csv
        </button>
        <button
          type="button"
          onClick={() => downloadCsv('/settings/export/tickets.csv', 'tickets.csv')}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Download tickets.csv
        </button>
      </div>

      <div className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-700">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Forms</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Izvoz liste formi (metadata) ili odgovora (responses) za izabrane forme.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={downloadAllFormsList}
            className="rounded bg-zinc-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Download sve forme (lista)
          </button>
          <button
            type="button"
            onClick={downloadSelectedFormsList}
            disabled={selectedFormIds.size === 0}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Download izabrane forme (lista)
          </button>
          <button
            type="button"
            onClick={downloadSelectedFormsResponses}
            disabled={selectedFormIds.size === 0}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Download odgovore za izabrane forme
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <button type="button" onClick={selectAllForms} className="underline hover:text-zinc-900 dark:hover:text-zinc-100">
            Izaberi sve
          </button>
          <span>|</span>
          <button type="button" onClick={clearFormSelection} className="underline hover:text-zinc-900 dark:hover:text-zinc-100">
            Poništi izbor
          </button>
        </div>
        <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          {formsLoading && <p className="p-4 text-sm text-zinc-500">Učitavanje formi…</p>}
          {formsError && (
            <p className="p-4 text-sm text-red-600 dark:text-red-400">
              Greška pri učitavanju formi. Proverite da ste ulogovani kao korisnik tenanta (ne platform admin).
            </p>
          )}
          {!formsLoading && !formsError && forms.length === 0 && (
            <p className="p-4 text-sm text-zinc-500">Nema formi.</p>
          )}
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {!formsLoading && !formsError && forms.map((form) => (
              <li key={form.id} className="flex items-center gap-3 px-3 py-2">
                <input
                  type="checkbox"
                  id={`form-${form.id}`}
                  checked={selectedFormIds.has(form.id)}
                  onChange={() => toggleForm(form.id)}
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
                />
                <label htmlFor={`form-${form.id}`} className="cursor-pointer text-sm text-zinc-900 dark:text-zinc-100">
                  {form.title}
                </label>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{form.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
