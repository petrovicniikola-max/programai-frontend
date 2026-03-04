'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type User } from '@/lib/api';
import { Modal } from '@/components/modal';
import { useToast } from '@/components/toast';

const canSubmitForm = (role: string) => role === 'SUPER_ADMIN' || role === 'SALES';

interface Option {
  id: string;
  label: string;
  value: string | null;
  orderNo: number;
}

interface Question {
  id: string;
  type: string;
  title: string;
  helpText: string | null;
  isRequired: boolean;
  orderNo: number;
  options: Option[];
}

interface Form {
  id: string;
  title: string;
  description: string | null;
  status: string;
  questions: Question[];
}

interface Submission {
  id: string;
  createdAt: string;
  submittedByUserId: string | null;
  metadata: Record<string, unknown> | null;
}

interface PivotQuestion {
  id: string;
  orderNo: number;
  title: string;
  type: string;
  isRequired: boolean;
}

interface PivotSubmission {
  id: string;
  createdAt: string;
  submittedByUserId: string | null;
  metadata: Record<string, unknown> | null;
}

interface PivotResponse {
  form: { id: string; title: string };
  questions: PivotQuestion[];
  submissions: PivotSubmission[];
  matrix: string[][];
}

type FormAnswerPayload = {
  questionId: string;
  valueText?: string;
  valueNumber?: number;
  valueDate?: string;
  valueJson?: unknown;
};

type SubmitFormBody = {
  answers: FormAnswerPayload[];
  metadata?: Record<string, string>;
};

const CHOICE_TYPES = ['MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN'];

/** Parse "dd/mm/yyyy" or "d/m/yyyy" to ISO "YYYY-MM-DD", or null if invalid */
function parseDdMmYyyyToIso(input: string): string | null {
  const t = input.trim().replace(/\s/g, '');
  const parts = t.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(y)) return null;
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Format ISO "YYYY-MM-DD" to "dd/mm/yyyy" for display */
function formatIsoToDdMmYyyy(iso: string): string {
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(y)) return iso;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export default function FormResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [fillOpen, setFillOpen] = useState(false);

  const { data: form, isLoading: formLoading } = useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      const res = await api.get<Form>(`/forms/${id}`);
      return res.data;
    },
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
  });

  const { data: submissionsData, isLoading: subLoading } = useQuery({
    queryKey: ['form', id, 'submissions'],
    queryFn: async () => {
      const res = await api.get<{ items: Submission[]; total: number }>(`/forms/${id}/submissions?limit=50`);
      return res.data;
    },
  });

  const { data: pivotData, isLoading: pivotLoading } = useQuery({
    queryKey: ['form', id, 'pivot'],
    queryFn: async () => {
      const res = await api.get<PivotResponse>(`/forms/${id}/responses/pivot?limit=50`);
      return res.data;
    },
  });

  const submitForm = useMutation({
    mutationFn: async (body: SubmitFormBody) => {
      const res = await api.post(`/forms/${id}/submissions`, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form', id, 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['form', id, 'pivot'] });
      setFillOpen(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to submit');
    },
  });

  const submissions = submissionsData?.items ?? [];

  if (formLoading || !form) {
    return (
      <div>
        <Link href="/forms" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">← Forms</Link>
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <Link href="/forms" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">← Forms</Link>
        <Link href={`/forms/${id}/builder`} className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">Builder</Link>
      </div>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{form.title}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Responses & fill form</p>
      {canSubmitForm(user?.role ?? '') && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setFillOpen(true)}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Fill form
          </button>
        </div>
      )}
      <div className="mt-6">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Odgovori (prvi red = pitanja, svaki naredni red = jedan odgovor)
        </h2>
        {pivotLoading ? (
          <p className="mt-2 text-sm text-zinc-500">Učitavanje…</p>
        ) : pivotData && pivotData.questions.length > 0 && pivotData.submissions.length > 0 ? (
          <div className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700 text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="sticky left-0 z-10 min-w-[12rem] bg-zinc-50 px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                    Odgovor
                  </th>
                  {pivotData.questions.map((q) => (
                    <th
                      key={q.id}
                      className="min-w-[10rem] px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400"
                    >
                      {q.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {pivotData.submissions.map((s, colIndex) => (
                  <tr key={s.id} className="bg-white dark:bg-zinc-800/30">
                    <td className="sticky left-0 z-10 min-w-[12rem] bg-white font-medium text-zinc-900 dark:bg-zinc-800/30 dark:text-zinc-100">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    {pivotData.questions.map((q, rowIndex) => (
                      <td
                        key={q.id}
                        className="min-w-[10rem] px-4 py-2 text-zinc-600 dark:text-zinc-400"
                      >
                        {pivotData.matrix[rowIndex]?.[colIndex] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : pivotData && pivotData.submissions.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nema odgovora. Koristite &quot;Fill form&quot; da dodate prvi.</p>
        ) : !pivotData ? (
          <p className="mt-2 text-sm text-zinc-500">Učitavanje…</p>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">Nema pitanja u formi.</p>
        )}
      </div>
      <Modal open={fillOpen} onClose={() => setFillOpen(false)} title={`Fill: ${form.title}`}>
        <FillFormForm
          form={form}
          onSubmit={(answers, metadata) => submitForm.mutate({ answers, metadata })}
          onCancel={() => setFillOpen(false)}
          isLoading={submitForm.isPending}
        />
      </Modal>
    </div>
  );
}

interface AnswerInput {
  questionId: string;
  valueText?: string;
  valueNumber?: number;
  valueDate?: string;
  valueJson?: unknown;
}

function FillFormForm({
  form,
  onSubmit,
  onCancel,
  isLoading,
}: {
  form: Form;
  onSubmit: (answers: AnswerInput[], metadata?: Record<string, string>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string | number | string[]>>({});
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDateError(null);
    const list: AnswerInput[] = [];
    for (const q of form.questions) {
      const v = answers[q.id];
      if (v === undefined || v === '') {
        if (q.isRequired && q.type === 'DATE') {
          setDateError(`Polje "${q.title}" je obavezno (unesite datum u formatu dd/mm/yyyy).`);
          return;
        }
        list.push({ questionId: q.id });
        continue;
      }
      switch (q.type) {
        case 'SHORT_TEXT':
        case 'PARAGRAPH':
        case 'MULTIPLE_CHOICE':
        case 'DROPDOWN':
          list.push({ questionId: q.id, valueText: String(v) });
          break;
        case 'CHECKBOXES':
          list.push({ questionId: q.id, valueJson: Array.isArray(v) ? v : [v] });
          break;
        case 'NUMBER':
          list.push({ questionId: q.id, valueNumber: Number(v) });
          break;
        case 'DATE': {
          const iso = parseDdMmYyyyToIso(String(v));
          if (!iso) {
            setDateError(`Neispravan datum u polju "${q.title}". Koristite format dd/mm/yyyy (npr. 25/12/2024).`);
            return;
          }
          list.push({ questionId: q.id, valueDate: iso, valueText: iso });
          break;
        }
        case 'TIME':
          list.push({ questionId: q.id, valueDate: String(v), valueText: String(v) });
          break;
        default:
          list.push({ questionId: q.id, valueText: String(v) });
      }
    }
    const metadata: Record<string, string> = {};
    if (leadName.trim()) metadata.leadName = leadName.trim();
    if (leadEmail.trim()) metadata.leadEmail = leadEmail.trim();
    if (leadPhone.trim()) metadata.leadPhone = leadPhone.trim();
    if (companyName.trim()) metadata.companyName = companyName.trim();
    onSubmit(list, Object.keys(metadata).length ? metadata : undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto">
      {dateError && (
        <p className="rounded bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" role="alert">
          {dateError}
        </p>
      )}
      {form.questions.map((q) => (
        <div key={q.id}>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {q.title}
            {q.isRequired && <span className="text-red-500"> *</span>}
          </label>
          {q.type === 'SHORT_TEXT' && (
            <input
              type="text"
              value={(answers[q.id] as string) ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              required={q.isRequired}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          )}
          {q.type === 'PARAGRAPH' && (
            <textarea
              value={(answers[q.id] as string) ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              required={q.isRequired}
              rows={3}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          )}
          {q.type === 'MULTIPLE_CHOICE' && (
            <div className="mt-2 space-y-1">
              {q.options.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={q.id}
                    value={opt.label}
                    checked={(answers[q.id] as string) === opt.label}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.label }))}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          )}
          {q.type === 'CHECKBOXES' && (
            <div className="mt-2 space-y-1">
              {q.options.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={((answers[q.id] as string[]) ?? []).includes(opt.label)}
                    onChange={(e) => {
                      const prev = (answers[q.id] as string[]) ?? [];
                      const next = e.target.checked ? [...prev, opt.label] : prev.filter((x) => x !== opt.label);
                      setAnswers((a) => ({ ...a, [q.id]: next }));
                    }}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          )}
          {q.type === 'DROPDOWN' && (
            <select
              value={(answers[q.id] as string) ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              required={q.isRequired}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">—</option>
              {q.options.map((opt) => (
                <option key={opt.id} value={opt.label}>{opt.label}</option>
              ))}
            </select>
          )}
          {q.type === 'NUMBER' && (
            <input
              type="number"
              value={(answers[q.id] as number) ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value === '' ? '' : Number(e.target.value) }))}
              required={q.isRequired}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          )}
          {q.type === 'DATE' && (
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              value={(answers[q.id] as string) ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                setAnswers((a) => ({ ...a, [q.id]: raw }));
              }}
              required={q.isRequired}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              aria-describedby={q.helpText ? `help-${q.id}` : undefined}
            />
          )}
          {q.type === 'TIME' && (
            <input
              type="time"
              value={(answers[q.id] as string) ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              required={q.isRequired}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          )}
        </div>
      ))}
      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Lead (optional)</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Name"
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <input
            type="email"
            placeholder="Email"
            value={leadEmail}
            onChange={(e) => setLeadEmail(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <input
            type="text"
            placeholder="Phone"
            value={leadPhone}
            onChange={(e) => setLeadPhone(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <input
            type="text"
            placeholder="Company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400">Cancel</button>
        <button type="submit" disabled={isLoading} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {isLoading ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </form>
  );
}
