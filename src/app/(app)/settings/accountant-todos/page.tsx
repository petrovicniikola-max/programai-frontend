'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';
import { useTexts } from '@/lib/use-texts';

interface AccountantTodoSettings {
  extraRecipients: string[];
  reminderTime: string;
}

export default function SettingsAccountantTodosPage() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const txt = useTexts();
  const [reminderTime, setReminderTime] = useState('08:00');
  const [recipientsText, setRecipientsText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'accountant-todos'],
    queryFn: async () => {
      const res = await api.get<AccountantTodoSettings>('/settings/accountant-todos');
      return res.data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setReminderTime(data.reminderTime ?? '08:00');
    setRecipientsText((data.extraRecipients ?? []).join('\n'));
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const extraRecipients = recipientsText
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await api.patch<AccountantTodoSettings>('/settings/accountant-todos', {
        reminderTime,
        extraRecipients,
      });
      return res.data;
    },
    onSuccess: () => {
      showSuccess(txt('settings.accountantTodos.toast.saved'));
      void queryClient.invalidateQueries({ queryKey: ['settings', 'accountant-todos'] });
    },
    onError: () => showError(txt('settings.accountantTodos.toast.error')),
  });

  return (
    <div>
      <Link href="/settings" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        {txt('settings.back')}
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {txt('settings.accountantTodos.title')}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {txt('settings.accountantTodos.description')}
      </p>

      {isLoading ? (
        <p className="mt-6 text-sm text-zinc-500">{txt('common.loading')}</p>
      ) : (
        <form
          className="mt-6 max-w-lg space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {txt('settings.accountantTodos.form.time')}
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {txt('settings.accountantTodos.form.recipients')}
            </label>
            <textarea
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              rows={4}
              placeholder={txt('settings.accountantTodos.form.recipients.placeholder')}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? txt('settings.accountantTodos.btn.saving') : txt('settings.accountantTodos.btn.save')}
          </button>
        </form>
      )}
    </div>
  );
}
