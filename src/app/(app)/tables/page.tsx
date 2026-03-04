'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface FormItem {
  id: string;
  title: string;
  status: string;
}

interface FormsResponse {
  items: FormItem[];
  total: number;
}

export default function TablesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: async () => {
      const res = await api.get<FormsResponse>('/forms');
      return res.data;
    },
  });

  const forms = data?.items ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Tables</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Choose a form to view pivot table (questions × submissions).
      </p>
      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((f) => (
            <Link
              key={f.id}
              href={`/tables/${f.id}`}
              className="rounded-lg border border-zinc-200 p-4 transition hover:border-emerald-500 hover:bg-emerald-50/50 dark:border-zinc-700 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/10"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-50">{f.title}</span>
              <span className="ml-2 text-xs text-zinc-500">{f.status}</span>
            </Link>
          ))}
        </div>
      )}
      {!isLoading && forms.length === 0 && (
        <p className="mt-4 text-sm text-zinc-500">No forms. Create one under Forms.</p>
      )}
    </div>
  );
}
