'use client';

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from './modal';
import { api, type TeronImportResult } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useToast } from '@/components/toast';
import { DEVICES_ENDPOINT } from '@/lib/endpoints';

const baseURL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
    : 'http://localhost:3001';

type ImportMode = 'csv' | 'teron';

interface CsvImportResult {
  created: number;
  errors: { row: number; message: string }[];
}

interface ImportDevicesModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImportDevicesModal({ open, onClose }: ImportDevicesModalProps) {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [mode, setMode] = useState<ImportMode>('teron');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<CsvImportResult | null>(null);
  const [teronResult, setTeronResult] = useState<TeronImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function downloadTemplate() {
    try {
      const token = getToken();
      const res = await fetch(`${baseURL}${DEVICES_ENDPOINT}/import/template`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(res.statusText);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'devices_import_primer.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Preuzimanje primera nije uspelo.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      showError(mode === 'teron' ? 'Izaberite Excel (.xlsx) fajl.' : 'Izaberite CSV fajl.');
      return;
    }
    setLoading(true);
    setCsvResult(null);
    setTeronResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const endpoint =
        mode === 'teron' ? `${DEVICES_ENDPOINT}/import/teron-xlsx` : `${DEVICES_ENDPOINT}/import`;
      const res = await api.post<CsvImportResult | TeronImportResult>(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: mode === 'teron' ? 600000 : 120000,
      });
      if (mode === 'teron') {
        setTeronResult(res.data as TeronImportResult);
      } else {
        setCsvResult(res.data as CsvImportResult);
      }
      const created =
        mode === 'teron'
          ? (res.data as TeronImportResult).created + (res.data as TeronImportResult).updated
          : (res.data as CsvImportResult).created;
      if (created > 0) {
        await queryClient.invalidateQueries({ queryKey: ['devices'] });
        await queryClient.invalidateQueries({ queryKey: ['distributors'] });
        await queryClient.invalidateQueries({ queryKey: ['companies'] });
        await queryClient.invalidateQueries({ queryKey: ['licences'] });
      }
      const errCount = res.data.errors.length;
      if (errCount > 0 && created === 0) {
        showError(`Greške u ${errCount} redova.`);
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message ===
          'string'
          ? (err as { response?: { data?: { message?: string } } }).response!.data!.message!
          : 'Uvoz nije uspeo.';
      showError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setCsvResult(null);
    setTeronResult(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    onClose();
  }

  const errors = mode === 'teron' ? teronResult?.errors : csvResult?.errors;

  return (
    <Modal open={open} onClose={handleClose} title="Uvoz uređaja" size="lg">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode('teron');
            setFile(null);
            setCsvResult(null);
            setTeronResult(null);
            if (inputRef.current) inputRef.current.value = '';
          }}
          className={`rounded px-3 py-1.5 text-sm font-medium ${
            mode === 'teron'
              ? 'bg-emerald-600 text-white'
              : 'border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300'
          }`}
        >
          Teron Excel (.xlsx)
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('csv');
            setFile(null);
            setCsvResult(null);
            setTeronResult(null);
            if (inputRef.current) inputRef.current.value = '';
          }}
          className={`rounded px-3 py-1.5 text-sm font-medium ${
            mode === 'csv'
              ? 'bg-emerald-600 text-white'
              : 'border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300'
          }`}
        >
          CRM CSV
        </button>
      </div>

      {mode === 'teron' ? (
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Uvoz iz Teron izvoza: serijski broj, korisnik (kompanija), distributer, licence i meta polja.
          Do <strong>50 000</strong> redova. Postojeći uređaji (isti serijski broj) se ažuriraju; nove
          kompanije i distributeri se kreiraju automatski.
        </p>
      ) : (
        <>
          <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
            Uvoz iz CRM CSV fajla (do 25 000 redova). Kolone: companyId ili companyName, distributorName,
            name, model, serialNo, status, notes.
          </p>
          <div className="mb-4">
            <button
              type="button"
              onClick={downloadTemplate}
              className="rounded bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-500"
            >
              Preuzmi primer CSV
            </button>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {mode === 'teron' ? 'Excel fajl (.xlsx)' : 'CSV fajl'}
          </label>
          <input
            ref={inputRef}
            type="file"
            accept={mode === 'teron' ? '.xlsx,.xls' : '.csv'}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        {teronResult && mode === 'teron' && (
          <div className="mb-4 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-600 dark:bg-zinc-800/50">
            <p className="font-medium text-zinc-800 dark:text-zinc-200">Rezultat uvoza</p>
            <ul className="mt-2 space-y-1 text-zinc-700 dark:text-zinc-300">
              <li>Novi uređaji: {teronResult.created}</li>
              <li>Ažurirani uređaji: {teronResult.updated}</li>
              <li>Nove kompanije: {teronResult.companiesCreated}</li>
              <li>Novi distributeri: {teronResult.distributorsCreated}</li>
              <li>Nove licence: {teronResult.licencesCreated}</li>
              <li>Ažurirane licence: {teronResult.licencesUpdated}</li>
            </ul>
          </div>
        )}

        {csvResult && mode === 'csv' && (
          <div className="mb-4 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-600 dark:bg-zinc-800/50">
            <p className="font-medium text-zinc-800 dark:text-zinc-200">
              Uveženo: {csvResult.created} uređaja.
            </p>
          </div>
        )}

        {errors && errors.length > 0 && (
          <ul className="mb-4 max-h-40 overflow-y-auto rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {errors.slice(0, 50).map((e, i) => (
              <li key={i}>
                Red {e.row}: {e.message}
              </li>
            ))}
            {errors.length > 50 && <li>… i još {errors.length - 50} grešaka</li>}
          </ul>
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
            {loading ? 'Uvoz u toku…' : 'Uvezi'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
