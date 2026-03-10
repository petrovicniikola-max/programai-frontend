'use client';

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from './modal';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useToast } from '@/components/toast';
import { LICENCES_ENDPOINT } from '@/lib/endpoints';

const baseURL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'
    : 'http://localhost:3000';

interface ImportLicencesModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImportLicencesModal({ open, onClose }: ImportLicencesModalProps) {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function downloadTemplate() {
    try {
      const token = getToken();
      const res = await fetch(`${baseURL}${LICENCES_ENDPOINT}/import/template`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(res.statusText);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'licences_import_primer.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Preuzimanje primera nije uspelo.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      showError('Izaberite CSV fajl.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ created: number; errors: { row: number; message: string }[] }>(
        `${LICENCES_ENDPOINT}/import`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setResult(res.data);
      if (res.data.created > 0) {
        await queryClient.invalidateQueries({ queryKey: ['licences'] });
      }
      if (res.data.errors.length > 0 && res.data.created === 0 && res.data.errors.some((e) => e.row > 0)) {
        showError(`Greške u ${res.data.errors.length} redova.`);
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as any).response?.data?.message === 'string'
        ? (err as any).response.data.message
        : 'Uvoz nije uspeo.';
      showError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setResult(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Uvoz licenci" size="lg">
      <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
        Preuzmite primer CSV fajla za uvoz podataka. U fajlu su navedena sva polja koja sistem koristi.
      </p>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-500">
        Možete koristiti <code>companyId</code> ili <code>companyName</code>, kao i{' '}
        <code>deviceId</code> ili <code>deviceSerialNo</code>; ako su oba prisutna, koristi se ID varijanta.
      </p>
      <div className="mb-4">
        <button
          type="button"
          onClick={downloadTemplate}
          className="rounded bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-500"
        >
          Preuzmi primer CSV za licence
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            CSV fajl
          </label>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        {result && (
          <div className="mb-4 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-600 dark:bg-zinc-800/50">
            <p className="font-medium text-zinc-800 dark:text-zinc-200">
              Uveženo: {result.created} licenci.
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-y-auto text-red-600 dark:text-red-400">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Red {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
          >
            Zatvori
          </button>
          <button
            type="submit"
            disabled={loading || !file}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Uvoz…' : 'Uvezi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
