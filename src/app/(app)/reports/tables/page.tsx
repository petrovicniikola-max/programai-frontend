'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useToast } from '@/components/toast';

interface FormItem {
  id: string;
  title: string;
  status: string;
}

interface FormsResponse {
  items: FormItem[];
  total: number;
}

const baseURL =
  typeof window !== 'undefined'
  ? process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
  : 'http://localhost:3001';

export default function ReportsTablesPage() {
  const [formId, setFormId] = useState('');
  const { showError } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: async () => {
      const res = await api.get<FormsResponse>('/forms');
      return res.data;
    },
  });

  const forms = data?.items ?? [];

  async function exportCsv() {
    if (!formId.trim()) {
      showError('Izaberi tabelu (formu).');
      return;
    }
    try {
      const token = getToken();
      const res = await fetch(
        `${baseURL}/reports/tables/export?formId=${encodeURIComponent(formId)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error(res.statusText);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `table_${formId}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Export nije uspeo.');
    }
  }

  return (
    <div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Izaberi tabelu (formu) i preuzmi CSV sa odgovorima.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Tabela</label>
          <select
            value={formId}
            onChange={(e) => setFormId(e.target.value)}
            className="min-w-[16rem] rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">— Izaberi tabelu —</option>
            {forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title} ({f.status})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!formId || isLoading}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200"
        >
          Export CSV
        </button>
      </div>
      {!isLoading && forms.length === 0 && (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Nema formi. Kreiraj formu u Forms, pa je koristi kao tabelu u Tables.
        </p>
      )}
    </div>
  );
}
