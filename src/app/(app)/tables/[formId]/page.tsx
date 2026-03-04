'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const LIMIT = 20;

interface PivotResponse {
  form: { id: string; title: string };
  questions: Array<{ id: string; orderNo: number; title: string; type: string; isRequired: boolean }>;
  submissions: Array<{
    id: string;
    createdAt: string;
    submittedByUserId: string | null;
    metadata: Record<string, unknown> | null;
  }>;
  matrix: string[][];
}

export default function TablePivotPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = use(params);
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['forms', formId, 'pivot', offset],
    queryFn: async () => {
      const res = await api.get<PivotResponse>(
        `/forms/${formId}/responses/pivot?limit=${LIMIT}&offset=${offset}&sort=desc`
      );
      return res.data;
    },
  });

  if (isLoading || !data) {
    return (
      <div>
        <Link href="/tables" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">← Tables</Link>
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  const { form, questions, submissions, matrix } = data;
  const hasNext = submissions.length === LIMIT;
  const hasPrev = offset > 0;

  return (
    <div>
      <Link href="/tables" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">← Tables</Link>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{form.title}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Pivot: prvi red su pitanja, svaki naredni red je jedan odgovor.
      </p>

      <div className="mt-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
          disabled={!hasPrev}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-600"
        >
          Previous
        </button>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {offset + 1}–{offset + submissions.length}
        </span>
        <button
          type="button"
          onClick={() => setOffset((o) => o + LIMIT)}
          disabled={!hasNext}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-600"
        >
          Next
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
              <th className="sticky left-0 z-10 min-w-[200px] border-r border-zinc-200 bg-zinc-50 px-4 py-2 text-left font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
                Odgovor
              </th>
              {questions.map((q) => (
                <th
                  key={q.id}
                  className="min-w-[140px] max-w-[200px] truncate px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400"
                  title={q.title}
                >
                  {q.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {submissions.map((s, colIndex) => (
              <tr key={s.id} className="border-b border-zinc-200 dark:border-zinc-700">
                <td className="sticky left-0 z-10 border-r border-zinc-200 bg-white px-4 py-2 font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-50">
                  {new Date(s.createdAt).toLocaleString()}
                </td>
                {questions.map((q, rowIndex) => (
                  <td
                    key={q.id}
                    className="max-w-[200px] truncate px-4 py-2 text-zinc-600 dark:text-zinc-400"
                    title={matrix[rowIndex]?.[colIndex] ?? ''}
                  >
                    {matrix[rowIndex]?.[colIndex] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {questions.length === 0 && (
          <p className="p-4 text-center text-sm text-zinc-500">No questions. Add questions in the form builder.</p>
        )}
        {submissions.length === 0 && questions.length > 0 && (
          <p className="p-4 text-center text-sm text-zinc-500">No submissions in this range.</p>
        )}
      </div>
    </div>
  );
}
