'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DEFAULT_TEXTS } from '@/lib/texts';
import { useTexts, useTextOverrides } from '@/lib/use-texts';

type TextOverrides = Record<string, string>;

function groupKey(key: string) {
  const idx = key.indexOf('.');
  return idx === -1 ? 'other' : key.slice(0, idx);
}

function groupLabel(key: string, t: (k: string) => string) {
  const g = groupKey(key);
  const labelKey = `settings.texts.group.${g}`;
  const translated = t(labelKey);
  return translated !== labelKey ? translated : g;
}

export default function SettingsTextsPage() {
  const t = useTexts();
  const qc = useQueryClient();
  const { data: overrides = {}, isLoading, error } = useTextOverrides();

  const [draft, setDraft] = useState<TextOverrides>({});

  const merged = useMemo(() => ({ ...overrides, ...draft }), [overrides, draft]);

  const keys = useMemo(() => Object.keys(DEFAULT_TEXTS).sort(), []);

  const groups = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const k of keys) {
      const g = groupKey(k);
      m.set(g, [...(m.get(g) ?? []), k]);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [keys]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Persist full map (defaults are on FE; backend stores overrides only)
      const out: TextOverrides = {};
      for (const k of keys) {
        const v = merged[k];
        if (typeof v === 'string' && v.trim().length > 0 && v.trim() !== (DEFAULT_TEXTS[k] ?? '').trim()) {
          out[k] = v.trim();
        }
      }
      await api.patch('/settings/texts', { texts: out });
    },
    onSuccess: async () => {
      setDraft({});
      await qc.invalidateQueries({ queryKey: ['settings', 'texts'] });
    },
  });

  const title = t('settings.texts.title');
  const description = t('settings.texts.description');

  return (
    <div className="space-y-6">
      <Link href="/settings" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        {t('settings.back')}
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>

      {isLoading && <p className="text-sm text-zinc-500">{t('settings.texts.loading')}</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{t('settings.texts.error')}</p>
      )}

      {!isLoading && !error && (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? t('settings.texts.btn.saving') : t('settings.texts.btn.save')}
            </button>
          </div>

          <div className="space-y-6">
            {groups.map(([g, groupKeys]) => (
              <section
                key={g}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{groupLabel(g, t)}</h2>
                <div className="mt-3 space-y-3">
                  {groupKeys.map((k) => {
                    const defaultValue = DEFAULT_TEXTS[k] ?? '';
                    const currentValue = merged[k] ?? defaultValue;
                    const isOverridden =
                      typeof overrides[k] === 'string' && overrides[k]!.trim().length > 0;
                    return (
                      <div key={k} className="grid gap-2 md:grid-cols-12">
                        <div className="md:col-span-4">
                          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{k}</div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                            Default: {defaultValue}
                          </div>
                        </div>
                        <div className="md:col-span-7">
                          <input
                            value={currentValue}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDraft((prev) => ({ ...prev, [k]: v }));
                            }}
                            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDraft((prev) => {
                                const next = { ...prev };
                                // Reset draft first, then backend override will be removed on Save
                                next[k] = defaultValue;
                                return next;
                              });
                            }}
                            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
                            title={isOverridden ? 'Reset override' : 'Reset draft'}
                          >
                            {t('settings.texts.btn.reset')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

