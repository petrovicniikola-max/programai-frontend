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
import { LeaveNotifications } from './leave-notifications';
import { AccountMenu } from './account-menu';
import { canViewResource, isSuperAdmin, navGroupsForRole, type NavGroup } from '@/lib/permissions';
import { useTexts } from '@/lib/use-texts';

const canAccessSettings = (role: User['role'], permissions?: User['permissions']) =>
  isSuperAdmin(role) || canViewResource(permissions, 'settings', role);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTexts();
  const [quickCallOpen, setQuickCallOpen] = useState(false);
  const [outgoingCallOpen, setOutgoingCallOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [leaveBannerDismissed, setLeaveBannerDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    staleTime: 120_000,
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
    staleTime: 300_000,
    placeholderData: defaultBranding,
  });
  const effectiveBranding = branding ?? defaultBranding;

  const { data: leaveReminder } = useQuery({
    queryKey: ['leave', 'reminders'],
    queryFn: async () => {
      const res = await api.get<{
        showUnusedPreviousLeaveBanner: boolean;
        unusedDays?: number;
        expiresAt?: string;
      }>('/leave/reminders');
      return res.data;
    },
    enabled: !!getToken() && !!user,
    staleTime: 300_000,
  });

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
      window.location.href = '/login';
    }
  }

  // Ne proveravaj getToken() u render-u – na serveru nema localStorage, pa bi server
  // renderovao null a klijent layout i došlo bi do hydration mismatch. Redirekciju
  // radi samo useEffect iznad.
  const brandName = effectiveBranding.brandName?.trim() || 'CRM ESTUAR';
  const brandColour = effectiveBranding.primaryColour ?? undefined;
  const navGroups = navGroupsForRole(user?.permissions, user?.role);
  const hideCallButtons = !canViewResource(user?.permissions, 'calls', user?.role);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
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
              className="text-base font-semibold leading-tight text-zinc-900 dark:text-zinc-50"
              style={brandColour ? { color: brandColour } : undefined}
            >
              {brandName}
            </span>
          </Link>
        </div>
        <SidebarNav
          groups={navGroups}
          pathname={pathname}
          label={t}
          showSettings={!!user && canAccessSettings(user.role, user.permissions)}
          showPlatform={!!user?.isPlatformAdmin}
          onLogout={handleLogout}
        />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col">
            {user && isImpersonating() && (
              <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                {t('shell.impersonating')}
                <button
                  type="button"
                  onClick={() => {
                    stopImpersonation();
                    window.location.href = '/platform/tenants';
                  }}
                  className="ml-2 underline"
                >
                  {t('shell.stopImpersonation')}
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {!hideCallButtons && (
              <>
                <button
                  type="button"
                  onClick={() => setQuickCallOpen(true)}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  {t('shell.quickCall')}
                </button>
                <button
                  type="button"
                  onClick={() => setOutgoingCallOpen(true)}
                  className="rounded border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                >
                  {t('shell.outgoingCall')}
                </button>
              </>
            )}
            <LeaveNotifications />
            {mounted ? (
              <AccountMenu user={user} loading={userLoading} />
            ) : (
              <span className="text-sm text-zinc-700 dark:text-zinc-300">—</span>
            )}
          </div>
        </header>
        {leaveReminder?.showUnusedPreviousLeaveBanner && !leaveBannerDismissed && (
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100">
            {t('shell.leaveBanner').replace(
              '{days}',
              leaveReminder.unusedDays != null ? ` (${leaveReminder.unusedDays} dana)` : '',
            )}
            <Link href="/leave" className="ml-2 underline">
              {t('shell.leaveBanner.open')}
            </Link>
            <button
              type="button"
              onClick={() => setLeaveBannerDismissed(true)}
              className="ml-4 text-amber-800 underline dark:text-amber-200"
            >
              {t('shell.leaveBanner.dismiss')}
            </button>
          </div>
        )}
        <main className="flex-1 p-4 text-zinc-900 dark:text-zinc-50">{children}</main>
      </div>
      <QuickCallModal open={quickCallOpen} onClose={() => setQuickCallOpen(false)} />
      <OutgoingCallModal open={outgoingCallOpen} onClose={() => setOutgoingCallOpen(false)} />
    </div>
  );
}

const NAV_OPEN_KEY = 'crm-nav-groups';

function pathMatches(href: string, pathname: string): boolean {
  if (href === '/reports/overview') {
    return pathname === '/reports' || pathname === '/reports/overview' || pathname.startsWith('/reports/overview/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function activeHref(pathname: string, hrefs: string[]): string | null {
  const matches = hrefs.filter((href) => pathMatches(href, pathname));
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.length - a.length)[0];
}

function SidebarNav({
  groups,
  pathname,
  label,
  showSettings,
  showPlatform,
  onLogout,
}: {
  groups: NavGroup[];
  pathname: string;
  label: (key: string) => string;
  showSettings: boolean;
  showPlatform: boolean;
  onLogout: () => void;
}) {
  const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));
  if (showSettings) hrefs.push('/settings');
  if (showPlatform) hrefs.push('/platform');
  const current = activeHref(pathname, hrefs);

  const activeGroupId = groups.find((group) => group.items.some((item) => item.href === current))?.id ?? null;

  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    activeGroupId ? { [activeGroupId]: true } : {},
  );

  useEffect(() => {
    let stored: Record<string, boolean> = {};
    try {
      const raw = localStorage.getItem(NAV_OPEN_KEY);
      if (raw) stored = JSON.parse(raw) as Record<string, boolean>;
    } catch {
      stored = {};
    }
    if (activeGroupId) stored[activeGroupId] = true;
    setOpen(stored);
  }, [activeGroupId]);

  function toggle(id: string) {
    setOpen((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(NAV_OPEN_KEY, JSON.stringify(next));
      } catch {
        // meni i dalje radi u ovoj sesiji
      }
      return next;
    });
  }

  const linkClass = (href: string, nested: boolean) =>
    `flex items-center gap-2 rounded-md text-sm ${nested ? 'px-2 py-1.5 pl-9' : 'px-2 py-2'} ${
      current === href
        ? 'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
    }`;

  return (
    <>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {groups.map((group) => {
          const expanded = group.items.length > 1;
          if (!expanded) {
            const item = group.items[0];
            const textKey = group.id === 'reports' ? group.labelKey : item.labelKey;
            return (
              <Link key={group.id} href={item.href} className={linkClass(item.href, false)}>
                <GroupIcon id={group.id} />
                <span className="truncate">{label(textKey)}</span>
              </Link>
            );
          }
          const isOpen = !!open[group.id];
          const containsCurrent = group.items.some((item) => item.href === current);
          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggle(group.id)}
                aria-expanded={isOpen}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium ${
                  containsCurrent
                    ? 'text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                <GroupIcon id={group.id} />
                <span className="min-w-0 flex-1 truncate">{label(group.labelKey)}</span>
                <Chevron open={isOpen} />
              </button>
              {isOpen && (
                <div className="mb-1">
                  {group.items.map((item) => (
                    <Link key={item.href} href={item.href} className={linkClass(item.href, true)} title={label(item.labelKey)}>
                      <span className="truncate">{label(item.labelKey)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="space-y-0.5 border-t border-zinc-200 p-2 dark:border-zinc-800">
        {showSettings && (
          <Link href="/settings" className={linkClass('/settings', false)}>
            <GroupIcon id="settings" />
            <span className="truncate">{label('shell.settings')}</span>
          </Link>
        )}
        {showPlatform && (
          <Link href="/platform" className={linkClass('/platform', false)}>
            <GroupIcon id="platform" />
            <span className="truncate">{label('shell.platform')}</span>
          </Link>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <GroupIcon id="logout" />
          {label('shell.logout')}
        </button>
      </div>
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="currentColor"
      aria-hidden
    >
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

function GroupIcon({ id }: { id: string }) {
  const paths: Record<string, string> = {
    home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z',
    service: 'M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7zm0 0 2-3h12l2 3M9 12h6',
    clients: 'M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 19v-1.2A2.8 2.8 0 0 0 16.8 15M16 4.2a2.5 2.5 0 0 1 0 4.6',
    devices: 'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm1 15h6',
    people: 'M8 4v3m8-3v3M4 9h16M6 20V9m12 11V9M9 13h2m4 0h-2',
    reports: 'M4 19V5m0 14h16M8 16v-5m4 5V8m4 8v-3',
    data: 'M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm2 8h8m-8 4h5',
    settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4',
    platform: 'M4 7h16v10H4V7zm4 14h8M12 17v4',
    logout: 'M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2M4 12h10m0 0-3-3m3 3-3 3',
  };
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[id] ?? paths.home} />
    </svg>
  );
}
