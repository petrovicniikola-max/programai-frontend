'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { SearchableOption } from './searchable-select';

interface AsyncSearchableSelectProps {
  value: string;
  onChange: (id: string) => void;
  loadOptions: (query: string) => Promise<SearchableOption[]>;
  /** Shown when value is set but label not in list yet */
  initialOption?: SearchableOption | null;
  placeholder?: string;
  searchPlaceholder?: string;
  minSearchChars?: number;
  minSearchHint?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function AsyncSearchableSelect({
  value,
  onChange,
  loadOptions,
  initialOption = null,
  placeholder = '— Izaberi —',
  searchPlaceholder = 'Pretraži...',
  minSearchChars = 3,
  minSearchHint = 'Unesite bar 3 karaktera za pretragu.',
  allowEmpty = true,
  emptyLabel = '—',
  disabled = false,
  className = '',
}: AsyncSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<SearchableOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(initialOption?.label ?? null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialOption && initialOption.id === value) {
      setSelectedLabel(initialOption.label);
    }
  }, [initialOption, value]);

  useEffect(() => {
    if (!value) setSelectedLabel(null);
  }, [value]);

  const fetchOptions = useCallback(
    async (q: string) => {
      if (q.trim().length < minSearchChars) {
        setOptions([]);
        return;
      }
      setLoading(true);
      try {
        const rows = await loadOptions(q.trim());
        setOptions(rows);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [loadOptions, minSearchChars],
  );

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => fetchOptions(search), 280);
    return () => clearTimeout(t);
  }, [search, open, fetchOptions]);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const displayLabel = value
    ? selectedLabel || options.find((o) => o.id === value)?.label || placeholder
    : placeholder;

  const showMinHint = search.trim().length > 0 && search.trim().length < minSearchChars;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded border border-zinc-300 px-3 py-2 text-left text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 disabled:opacity-50"
      >
        <span className={value ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'}>
          {displayLabel}
        </span>
        <span className="text-zinc-400 dark:text-zinc-500">▼</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-hidden rounded border border-zinc-200 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-800">
          <div className="border-b border-zinc-200 p-2 dark:border-zinc-600">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              onKeyDown={(e) => e.stopPropagation()}
            />
            {showMinHint && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{minSearchHint}</p>
            )}
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {loading && (
              <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">Pretraga…</li>
            )}
            {!loading && allowEmpty && search.trim().length === 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setSelectedLabel(null);
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  {emptyLabel}
                </button>
              </li>
            )}
            {!loading && !showMinHint && options.length === 0 && search.trim().length >= minSearchChars && (
              <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">Nema rezultata</li>
            )}
            {!loading &&
              options.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setSelectedLabel(opt.label);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
                      opt.id === value
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                        : ''
                    }`}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
