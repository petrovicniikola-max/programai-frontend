'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type User } from '@/lib/api';
import { publicAssetUrl } from '@/lib/public-asset';
import { useTexts } from '@/lib/use-texts';
import { Modal } from './modal';

type LeaveBalancesMe = {
  annualAvailable?: number;
  annualEligibility?: { eligible: boolean; message?: string | null };
};

function errorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string' && msg.length > 0) return msg;
  return fallback;
}

export function AccountMenu({ user, loading }: { user?: User; loading: boolean }) {
  const t = useTexts();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const name = user ? user.displayName || user.email : '—';
  const avatar = publicAssetUrl(user?.avatarUrl);

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ['leave', 'balances', 'me'],
    queryFn: async () => (await api.get<LeaveBalancesMe>('/leave/balances/me')).data,
    enabled: open && !!user?.tenantId,
    staleTime: 60_000,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post<{ avatarUrl: string }>('/auth/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: async () => {
      setUploadError(null);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err) => setUploadError(errorMessage(err, 'Slika nije sačuvana.')),
  });

  const days =
    balances?.annualAvailable != null
      ? t('shell.account.annualDays').replace('{days}', String(balances.annualAvailable))
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => user && setOpen(true)}
        className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            (name.trim()[0] ?? '?').toUpperCase()
          )}
        </span>
        <span className="max-w-[12rem] truncate">{loading ? '…' : name}</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={name}>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-lg font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                (name.trim()[0] ?? '?').toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{t('shell.account.photo')}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('shell.account.photoHint')}</p>
              <input
                type="file"
                accept="image/png,image/jpeg"
                disabled={upload.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) upload.mutate(file);
                }}
                className="mt-2 block w-full text-sm text-zinc-600 file:mr-3 file:rounded file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100 dark:text-zinc-300 dark:file:bg-emerald-900/30 dark:file:text-emerald-300"
              />
              {upload.isPending && <p className="mt-1 text-xs text-zinc-500">Čuvanje slike…</p>}
              {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
            </div>
          </div>

          {user?.tenantId && (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/40">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('shell.account.annual')}</p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {balancesLoading ? t('shell.account.annualLoading') : (days ?? '—')}
              </p>
              {balances?.annualEligibility?.message && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{balances.annualEligibility.message}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {user?.tenantId && (
              <>
                <Link
                  href="/leave?zahtev=1"
                  onClick={() => setOpen(false)}
                  className="rounded bg-emerald-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700"
                >
                  {t('shell.account.requestLeave')}
                </Link>
                <Link
                  href="/leave"
                  onClick={() => setOpen(false)}
                  className="rounded border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  {t('shell.account.openLeave')}
                </Link>
              </>
            )}
            <Link
              href="/account/password"
              onClick={() => setOpen(false)}
              className="text-center text-sm font-medium text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-400"
            >
              {t('shell.account.changePassword')}
            </Link>
          </div>
        </div>
      </Modal>
    </>
  );
}
