import Link from 'next/link';

const sections = [
  { href: '/settings/branding', label: 'Branding / White-label' },
  { href: '/settings/email', label: 'Slanje mailova' },
  { href: '/settings/users', label: 'Users & Roles' },
  { href: '/settings/tickets', label: 'Ticket Settings' },
  { href: '/settings/tags', label: 'Tag Management' },
  { href: '/settings/notifications', label: 'Email & Notifications' },
  { href: '/settings/export', label: 'Data Export' },
  { href: '/settings/security', label: 'Security' },
  { href: '/settings/audit', label: 'Audit Log' },
];

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Settings</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Choose a section below. Choose a section to configure.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-zinc-200 p-4 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50"
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-50">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
