'use client';

import { useState, useRef, useEffect } from 'react';

export interface SearchableOption {
  id: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (id: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** Controlled search query (e.g. for server-side filter). Parent can pass and update. */
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  /** Min chars to show/filter options; show hint below search if 0 < query.length < min */
  minSearchChars?: number;
  minSearchHint?: string;
  /** Filter options client-side by label (ignored if options come from server) */
  filterByLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = '— Izaberi —',
  searchPlaceholder = 'Pretraži...',
  searchQuery: controlledSearch = '',
  onSearchQueryChange,
  minSearchChars,
  minSearchHint,
  filterByLabel = true,
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSearchControlled = onSearchQueryChange !== undefined;
  const search = isSearchControlled ? controlledSearch : localSearch;

  const setSearch = (q: string) => {
    if (isSearchControlled) onSearchQueryChange?.(q);
    else setLocalSearch(q);
  };

  const filteredOptions =
    filterByLabel && search.trim()
      ? options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase()))
      : options;

  const selectedOption = options.find((o) => o.id === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const showMinCharsHint =
    minSearchHint && minSearchChars && search.trim().length > 0 && search.trim().length < minSearchChars;

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
            {showMinCharsHint && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{minSearchHint}</p>
            )}
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filteredOptions.length === 0 && (
              <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">Nema rezultata</li>
            )}
            {filteredOptions.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
                    opt.id === value ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' : ''
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
