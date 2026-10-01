'use client';

import Link from 'next/link';
import { useTexts } from '@/lib/use-texts';

const SECTIONS = [
  { href: '/settings/branding', key: 'settings.section.branding' },
  { href: '/settings/email', key: 'settings.section.email' },
  { href: '/settings/users', key: 'settings.section.users' },
  { href: '/settings/roles', key: 'settings.section.roles' },
  { href: '/settings/leave', key: 'settings.section.leave' },
  { href: '/settings/todo-teams', key: 'settings.section.todoTeams' },
  { href: '/settings/accountant-todos', key: 'settings.section.accountantTodos' },
  { href: '/settings/tickets', key: 'settings.section.tickets' },
  { href: '/settings/tags', key: 'settings.section.tags' },
  { href: '/settings/notifications', key: 'settings.section.notifications' },
  { href: '/settings/texts', key: 'settings.section.texts' },
  { href: '/settings/export', key: 'settings.section.export' },
  { href: '/settings/security', key: 'settings.section.security' },
  { href: '/settings/audit', key: 'settings.section.audit' },
] as const;

export default function SettingsPage() {
  const t = useTexts();

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{t('settings.title')}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">{t('settings.description')}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, key }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-zinc-200 p-4 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50"
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-50">{t(key)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
