'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ReportsOverviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Reports overview error:', error);
  }, [error]);

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
      <h2 className="text-lg font-medium text-red-800 dark:text-red-200">
        Greška na stranici Reports overview
      </h2>
      <p className="mt-2 text-sm text-red-700 dark:text-red-300">
        {error.message}
      </p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Pokušaj ponovo
        </button>
        <Link
          href="/reports"
          className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
        >
          Nazad na Reports
        </Link>
      </div>
    </div>
  );
}
