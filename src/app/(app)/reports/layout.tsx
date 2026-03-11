'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, type User } from '@/lib/api';

const reportTabs: { href: string; label: string; superAdminOnly?: boolean }[] = [
  { href: '/reports/overview', label: 'Overview' },
  { href: '/reports/tickets', label: 'Tickets' },
  { href: '/reports/licences', label: 'Licences' },
  { href: '/reports/devices', label: 'Devices' },
  { href: '/reports/tables', label: 'Tables' },
  { href: '/reports/alerts', label: 'Alerts & Reports', superAdminOnly: true },
];

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
  });

  const tabs = reportTabs.filter(
    (tab) => !tab.superAdminOnly || user?.role === 'SUPER_ADMIN',
  );

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Reports</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Pregled brojki i izvoz podataka.
      </p>
      <nav className="mt-4 flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`rounded-t px-3 py-2 text-sm font-medium ${
              pathname === href
                ? 'border-b-2 border-emerald-600 bg-white text-emerald-600 dark:border-emerald-500 dark:bg-zinc-900 dark:text-emerald-400'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
