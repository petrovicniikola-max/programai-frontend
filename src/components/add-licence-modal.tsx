'use client';

import { useState, useMemo } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Modal } from './modal';
import { SearchableSelect } from './searchable-select';
import { LICENCES_ENDPOINT, DEVICES_ENDPOINT } from '@/lib/endpoints';
import type { Device } from '@/lib/api';

const COMPANY_SEARCH_MIN_CHARS = 3;
const STATUS_OPTIONS = ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'] as const;

interface Company {
  id: string;
  name: string;
}

interface AddLicenceModalProps {
  open: boolean;
  onClose: () => void;
  companies: Company[];
}

export function AddLicenceModal({ open, onClose, companies }: AddLicenceModalProps) {
  const queryClient = useQueryClient();
  const [productName, setProductName] = useState('');
  const [licenceKey, setLicenceKey] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [status, setStatus] = useState<string>('ACTIVE');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: devices = [] } = useQuery({
    queryKey: ['devices', 'all', deviceSearch],
    queryFn: async () => {
      const res = await api.get<Device[]>(DEVICES_ENDPOINT, {
        params: deviceSearch.trim() ? { search: deviceSearch.trim() } : {},
      });
      return res.data ?? [];
    },
    enabled: open,
  });

  const companyFiltered = useMemo(() => {
    const q = companySearch.trim();
    if (q.length < COMPANY_SEARCH_MIN_CHARS) return [];
    const lower = q.toLowerCase();
    return companies.filter((c) => c.name.toLowerCase().includes(lower));
  }, [companies, companySearch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!companyId.trim()) {
      setError('Izaberite kompaniju iz liste (Uneti minimum 3 karaktera za pretragu).');
      return;
    }
    if (!validTo.trim()) {
      setError('Valid to je obavezno.');
      return;
    }
    setLoading(true);
    try {
      await api.post(LICENCES_ENDPOINT, {
        companyId: companyId.trim(),
        deviceId: deviceId.trim() || undefined,
        productName: productName.trim(),
        licenceKey: licenceKey.trim() || undefined,
        validFrom: validFrom.trim() || undefined,
        validTo: validTo.trim(),
        status: status || 'ACTIVE',
        notes: notes.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['licences'] });
      setProductName('');
      setLicenceKey('');
      setValidFrom('');
      setValidTo('');
      setCompanyId('');
      setCompanySearch('');
      setDeviceId('');
      setDeviceSearch('');
      setStatus('ACTIVE');
      setNotes('');
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || 'Kreiranje licence nije uspelo');
    } finally {
      setLoading(false);
    }
  }

  const selectedCompany = companies.find((c) => c.id === companyId);
  const selectedDevice = devices.find((d) => d.id === deviceId);

  const companyOptions: { id: string; label: string }[] = useMemo(() => {
    if (companySearch.trim().length >= COMPANY_SEARCH_MIN_CHARS) {
      return companyFiltered.map((c) => ({ id: c.id, label: c.name }));
    }
    if (companyId && selectedCompany) {
      return [{ id: selectedCompany.id, label: selectedCompany.name }];
    }
    return [];
  }, [companyFiltered, companyId, selectedCompany, companySearch]);

  const deviceOptions: { id: string; label: string }[] = useMemo(
    () => devices.map((d) => ({ id: d.id, label: d.serialNo ?? d.name ?? d.id })),
    [devices],
  );

  return (
    <Modal open={open} onClose={onClose} title="Add new Licence" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Company <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            value={companyId}
            onChange={(id) => {
              setCompanyId(id);
              const c = companies.find((x) => x.id === id);
              if (c) setCompanySearch(c.name);
            }}
            options={companyOptions}
            placeholder="— Izaberi kompaniju —"
            searchPlaceholder="Uneti minimum 3 karaktera za pretragu"
            searchQuery={companySearch}
            onSearchQueryChange={setCompanySearch}
            minSearchChars={COMPANY_SEARCH_MIN_CHARS}
            minSearchHint="Uneti minimum 3 karaktera za pretragu baze iz Clients."
            filterByLabel={false}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Device (Serial number)
          </label>
          <SearchableSelect
            value={deviceId}
            onChange={setDeviceId}
            options={deviceOptions}
            placeholder="— Izaberi uređaj (SN) —"
            searchPlaceholder="Pretraži po SN..."
            searchQuery={deviceSearch}
            onSearchQueryChange={setDeviceSearch}
            filterByLabel={false}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Product name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Licence key
          </label>
          <input
            type="text"
            value={licenceKey}
            onChange={(e) => setLicenceKey(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Valid from
            </label>
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Valid to <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              required
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-700"
          >
            Odustani
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Kreiranje…' : 'Add Licence'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
