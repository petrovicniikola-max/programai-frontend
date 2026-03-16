'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, type User, getPublicBranding, type PublicBranding } from '@/lib/api';
import { getToken, clearToken, isImpersonating, stopImpersonation } from '@/lib/auth';
import { QuickCallModal } from './quick-call-modal';
import { OutgoingCallModal } from './outgoing-call-modal';
import { ThemeToggle } from './theme-toggle';

const baseNav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tickets', label: 'Tickets' },
  { href: '/sales', label: 'Prodaja' },
  { href: '/clients', label: 'Korisnici' },
  { href: '/devices', label: 'Devices' },
  { href: '/licences', label: 'Licences' },
  { href: '/reports', label: 'Reports' },
  { href: '/forms', label: 'Forms' },
  { href: '/tables', label: 'Tables' },
];

const canAccessSettings = (role: User['role']) => role === 'SUPER_ADMIN';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [quickCallOpen, setQuickCallOpen] = useState(false);
  const [outgoingCallOpen, setOutgoingCallOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
    enabled: !!getToken(),
    retry: false,
  });

  const defaultBranding: PublicBranding = { brandName: 'CRM ESTUAR', primaryColour: null, logoUrl: null };
  const { data: branding } = useQuery<PublicBranding>({
    queryKey: ['public', 'branding'],
    queryFn: async () => {
      try {
        return await getPublicBranding();
      } catch {
        return defaultBranding;
      }
    },
    retry: false,
    staleTime: 60_000,
    placeholderData: defaultBranding,
  });
  const effectiveBranding = branding ?? defaultBranding;

  useEffect(() => {
    if (effectiveBranding.brandName && typeof document !== 'undefined') {
      document.title = effectiveBranding.brandName;
    }
  }, [effectiveBranding.brandName]);

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // best-effort – ignore
    } finally {
      clearToken();
      router.replace('/login');
      router.refresh();
    }
  }

  // Ne proveravaj getToken() u render-u – na serveru nema localStorage, pa bi server
  // renderovao null a klijent layout i došlo bi do hydration mismatch. Redirekciju
  // radi samo useEffect iznad.
  const brandName = effectiveBranding.brandName?.trim() || 'CRM ESTUAR';
  const brandColour = effectiveBranding.primaryColour ?? undefined;

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="flex w-56 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            {effectiveBranding.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={effectiveBranding.logoUrl}
                alt={brandName}
                className="h-8 w-auto rounded-sm border border-zinc-200 bg-white object-contain dark:border-zinc-700"
              />
            )}
            <span
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
              style={brandColour ? { color: brandColour } : undefined}
            >
              {brandName}
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {baseNav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`block rounded px-3 py-2 text-sm font-medium ${
                pathname === href ||
                (href === '/reports' && pathname.startsWith('/reports')) ||
                (href === '/sales' && pathname.startsWith('/sales'))
                  ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
          {user && canAccessSettings(user.role) && (
            <Link
              href="/settings"
              className={`block rounded px-3 py-2 text-sm font-medium ${
                pathname.startsWith('/settings')
                  ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
              }`}
            >
              Settings
            </Link>
          )}
          {user?.isPlatformAdmin && (
            <Link
              href="/platform"
              className={`mt-1 block rounded px-3 py-2 text-sm font-medium ${
                pathname.startsWith('/platform')
                  ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
              }`}
            >
              Platform
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 w-full rounded px-3 py-2 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Logout
          </button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col">
            {user && isImpersonating() && (
              <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Impersonating tenant – actions affect tenant data.
                <button
                  type="button"
                  onClick={() => {
                    stopImpersonation();
                    router.push('/platform/tenants');
                    router.refresh();
                  }}
                  className="ml-2 underline"
                >
                  Stop impersonation
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setQuickCallOpen(true)}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Quick Call
            </button>
            <button
              type="button"
              onClick={() => setOutgoingCallOpen(true)}
              className="rounded border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
            >
              Outgoing Call
            </button>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {userLoading ? '…' : user ? (user.displayName || user.email) : '—'}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4">{children}</main>
      </div>
      <QuickCallModal open={quickCallOpen} onClose={() => setQuickCallOpen(false)} />
      <OutgoingCallModal open={outgoingCallOpen} onClose={() => setOutgoingCallOpen(false)} />
    </div>
  );
}
