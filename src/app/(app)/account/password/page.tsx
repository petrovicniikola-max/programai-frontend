'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTexts } from '@/lib/use-texts';

function errorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string' && msg.length > 0) return msg;
  return fallback;
}

export default function ChangePasswordPage() {
  const t = useTexts();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const change = useMutation({
    mutationFn: async () => {
      await api.post('/auth/change-password', { currentPassword, newPassword });
    },
    onSuccess: () => {
      setSaved(true);
      setFormError(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => {
      setSaved(false);
      setFormError(errorMessage(err, t('account.password.failed')));
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    if (newPassword.length < 8) {
      setFormError(t('account.password.short'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError(t('account.password.mismatch'));
      return;
    }
    setFormError(null);
    change.mutate();
  }

  const fieldClass =
    'mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100';

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{t('account.password.title')}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t('account.password.description')}</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t('account.password.current')}
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t('account.password.new')}
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t('account.password.confirm')}
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={fieldClass}
          />
        </label>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        {saved && <p className="text-sm text-emerald-700 dark:text-emerald-400">{t('account.password.saved')}</p>}
        <button
          type="submit"
          disabled={change.isPending}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {change.isPending ? t('account.password.saving') : t('account.password.submit')}
        </button>
      </form>
    </div>
  );
}
