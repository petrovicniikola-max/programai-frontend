'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

const QUESTION_TYPES = [
  'SHORT_TEXT',
  'PARAGRAPH',
  'MULTIPLE_CHOICE',
  'CHECKBOXES',
  'DROPDOWN',
  'NUMBER',
  'DATE',
  'TIME',
] as const;

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

const CHOICE_TYPES = ['MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN'];

export default function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addQuestionType, setAddQuestionType] = useState<string>('SHORT_TEXT');

  const { data: form, isLoading } = useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      const res = await api.get<Form>(`/forms/${id}`);
      return res.data;
    },
  });

  const createQuestion = useMutation({
    mutationFn: async (body: { type: string; title: string; isRequired?: boolean; orderNo?: number }) => {
      const res = await api.post<Question>(`/forms/${id}/questions`, body);
      return res.data;
    },
    onSuccess: (q) => {
      queryClient.invalidateQueries({ queryKey: ['form', id] });
      setSelectedId(q.id);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to add question');
    },
  });
  const addQuestion = () => {
    createQuestion.mutate({
      type: addQuestionType,
      title: 'New question',
      orderNo: questions.length,
    });
  };

  const updateQuestion = useMutation({
    mutationFn: async ({ questionId, body }: { questionId: string; body: Partial<Question> }) => {
      const res = await api.patch<Question>(`/forms/${id}/questions/${questionId}`, body);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['form', id] }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to update question');
    },
  });

  const archiveQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      await api.delete(`/forms/${id}/questions/${questionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form', id] });
      setSelectedId(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to remove question');
    },
  });

  const createOption = useMutation({
    mutationFn: async ({ questionId, label }: { questionId: string; label: string }) => {
      const res = await api.post<Option>(`/forms/${id}/questions/${questionId}/options`, { label });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['form', id] }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to add option');
    },
  });

  const updateOption = useMutation({
    mutationFn: async ({
      questionId,
      optionId,
      body,
    }: {
      questionId: string;
      optionId: string;
      body: { label?: string };
    }) => {
      await api.patch(`/forms/${id}/questions/${questionId}/options/${optionId}`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['form', id] }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to update option');
    },
  });

  const deleteOption = useMutation({
    mutationFn: async ({ questionId, optionId }: { questionId: string; optionId: string }) => {
      await api.delete(`/forms/${id}/questions/${questionId}/options/${optionId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['form', id] }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to delete option');
    },
  });

  const reorderQuestions = useMutation({
    mutationFn: async (order: { questionId: string; orderNo: number }[]) => {
      await api.post(`/forms/${id}/questions/reorder`, { order });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['form', id] }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to reorder');
    },
  });

  const questions = [...(form?.questions ?? [])].sort((a, b) => a.orderNo - b.orderNo);
  const selected = questions.find((q) => q.id === selectedId) ?? questions[0] ?? null;

  const moveQuestion = (questionId: string, direction: 'up' | 'down') => {
    if (!questions.length || reorderQuestions.isPending) return;
    const index = questions.findIndex((q) => q.id === questionId);
    if (index === -1) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= questions.length) return;
    const reordered = [...questions];
    const [removed] = reordered.splice(index, 1);
    reordered.splice(target, 0, removed);
    const payload = reordered.map((q, i) => ({ questionId: q.id, orderNo: i }));
    reorderQuestions.mutate(payload);
  };

  if (isLoading || !form) {
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
        <Link href={`/forms/${id}/responses`} className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">Responses</Link>
      </div>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{form.title}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Form builder</p>

      <div className="mt-6 flex gap-6">
        <div className="w-72 shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Questions</span>
            <div className="flex items-center gap-1">
              <select
                value={addQuestionType}
                onChange={(e) => setAddQuestionType(e.target.value)}
                className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={addQuestion}
                disabled={createQuestion.isPending}
                className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                + Add
              </button>
            </div>
          </div>
          {questions.map((q, index) => (
            <div key={q.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedId(q.id)}
                className={`flex-1 rounded-lg border p-3 text-left text-sm ${
                  selectedId === q.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-zinc-200 dark:border-zinc-700'
                }`}
              >
                {q.title || '(No title)'}
              </button>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={index === 0 || reorderQuestions.isPending}
                  onClick={() => moveQuestion(q.id, 'up')}
                  className="rounded border border-zinc-300 px-1 text-[10px] leading-none text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === questions.length - 1 || reorderQuestions.isPending}
                  onClick={() => moveQuestion(q.id, 'down')}
                  className="rounded border border-zinc-300 px-1 text-[10px] leading-none text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/30">
          {selected ? (
            <QuestionEditor
              question={selected}
              onUpdate={(body) => updateQuestion.mutate({ questionId: selected.id, body })}
              onDelete={() => archiveQuestion.mutate(selected.id)}
              onAddOption={(label) => createOption.mutate({ questionId: selected.id, label })}
              onUpdateOption={(optionId, body) => updateOption.mutate({ questionId: selected.id, optionId, body })}
              onDeleteOption={(optionId) => deleteOption.mutate({ questionId: selected.id, optionId })}
              isChoice={CHOICE_TYPES.includes(selected.type)}
            />
          ) : (
            <p className="text-sm text-zinc-500">Select a question or add one.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  onUpdate,
  onDelete,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  isChoice,
}: {
  question: Question;
  onUpdate: (body: Partial<Question>) => void;
  onDelete: () => void;
  onAddOption: (label: string) => void;
  onUpdateOption: (optionId: string, body: { label?: string }) => void;
  onDeleteOption: (optionId: string) => void;
  isChoice: boolean;
}) {
  const [newOptionLabel, setNewOptionLabel] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Title</label>
        <input
          type="text"
          value={question.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          onBlur={(e) => e.target.value !== question.title && onUpdate({ title: e.target.value })}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Type</label>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{question.type}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="required"
          checked={question.isRequired}
          onChange={(e) => onUpdate({ isRequired: e.target.checked })}
        />
        <label htmlFor="required" className="text-sm text-zinc-700 dark:text-zinc-300">Required</label>
      </div>
      {isChoice && (
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Options</label>
          <ul className="mt-2 space-y-2">
            {question.options.map((opt) => (
              <li key={opt.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => onUpdateOption(opt.id, { label: e.target.value })}
                  onBlur={(e) => e.target.value !== opt.label && onUpdateOption(opt.id, { label: e.target.value })}
                  className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => onDeleteOption(opt.id)}
                  className="text-red-600 hover:underline dark:text-red-400"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newOptionLabel}
              onChange={(e) => setNewOptionLabel(e.target.value)}
              placeholder="New option"
              className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={() => {
                if (newOptionLabel.trim()) {
                  onAddOption(newOptionLabel.trim());
                  setNewOptionLabel('');
                }
              }}
              className="rounded bg-zinc-200 px-2 py-1 text-sm dark:bg-zinc-700"
            >
              Add option
            </button>
          </div>
        </div>
      )}
      <div className="pt-4">
        <button
          type="button"
          onClick={onDelete}
          className="text-sm text-red-600 hover:underline dark:text-red-400"
        >
          Remove question
        </button>
      </div>
    </div>
  );
}
