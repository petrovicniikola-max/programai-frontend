'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

type EmailProvider = 'GOOGLE' | 'M365' | null;

interface EmailSettings {
  emailFromAddress: string | null;
  emailFromName: string | null;
  emailProvider: EmailProvider;
  passwordSet: boolean;
}

export default function SettingsEmailPage() {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [emailFromName, setEmailFromName] = useState('');
  const [emailProvider, setEmailProvider] = useState<EmailProvider>(null);
  const [password, setPassword] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'email'],
    queryFn: async () => {
      const res = await api.get<EmailSettings>('/settings/email');
      return res.data;
    },
  });

  useEffect(() => {
    if (data) {
      setEmailFromAddress(data.emailFromAddress ?? '');
      setEmailFromName(data.emailFromName ?? '');
      setEmailProvider(data.emailProvider);
    }
  }, [data]);

  const patch = useMutation({
    mutationFn: async (body: {
      emailFromAddress?: string;
      emailFromName?: string;
      emailProvider?: EmailProvider;
      emailPassword?: string;
    }) => {
      const res = await api.patch<EmailSettings>('/settings/email', body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'email'] });
      setPassword('');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Greška pri čuvanju podešavanja.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    patch.mutate({
      emailFromAddress: emailFromAddress.trim() || undefined,
      emailFromName: emailFromName.trim() || undefined,
      emailProvider: emailProvider ?? undefined,
      ...(password ? { emailPassword: password } : {}),
    });
  };

  return (
    <div>
      <Link href="/settings" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Settings
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Slanje mailova</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Podešavanja za slanje notifikacija, alarmi i mailova sa formi. Unesi adresu i izaberi provajdera (Google ili Microsoft 365).
      </p>
      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Učitavanje…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email adresa (sa koje se šalju mailovi)
            </label>
            <input
              type="email"
              value={emailFromAddress}
              onChange={(e) => setEmailFromAddress(e.target.value)}
              placeholder="npr. info@firma.rs"
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Ime pošiljaoca (opciono)
            </label>
            <input
              type="text"
              value={emailFromName}
              onChange={(e) => setEmailFromName(e.target.value)}
              placeholder="npr. CRM Notifikacije"
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Provajder
            </label>
            <div className="mt-2 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="provider"
                  checked={emailProvider === 'GOOGLE'}
                  onChange={() => setEmailProvider('GOOGLE')}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Google (Gmail)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="provider"
                  checked={emailProvider === 'M365'}
                  onChange={() => setEmailProvider('M365')}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Microsoft 365</span>
              </label>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Za Gmail koristi App lozinku (Google nalog → Bezbednost → App lozinke). Za M365 – lozinku naloga.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Lozinka
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={data?.passwordSet ? '•••••••• (ostavi prazno da zadržiš postojeću)' : 'Unesi lozinku'}
              autoComplete="new-password"
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            {data?.passwordSet && !password && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Lozinka je sačuvana. Unesi novu samo ako želiš da je promeniš.</p>
            )}
          </div>
          <button
            type="submit"
            disabled={patch.isPending}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {patch.isPending ? 'Čuvanje…' : 'Sačuvaj'}
          </button>
        </form>
      )}
    </div>
  );
}
