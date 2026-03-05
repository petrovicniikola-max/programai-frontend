'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'crm-theme';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY) as 'light' | 'dark' | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  }

  if (!mounted) {
    return (
      <div className="flex h-8 w-14 items-center rounded-full border border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="relative flex h-8 w-14 shrink-0 items-center rounded-full border border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800"
      aria-label={theme === 'dark' ? 'Prebaci na light mode' : 'Prebaci na dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      <span
        className={`absolute left-1 flex h-6 w-6 items-center justify-center transition-colors ${
          theme === 'light' ? 'text-amber-500' : 'text-zinc-400 dark:text-zinc-500'
        }`}
      >
        <SunIcon className="h-3.5 w-3.5" />
      </span>
      <span
        className={`absolute right-1 flex h-6 w-6 items-center justify-center transition-colors ${
          theme === 'dark' ? 'text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'
        }`}
      >
        <MoonIcon className="h-3.5 w-3.5" />
      </span>
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-200 dark:bg-zinc-600 ${
          theme === 'light' ? 'left-1' : 'left-7'
        }`}
      />
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
