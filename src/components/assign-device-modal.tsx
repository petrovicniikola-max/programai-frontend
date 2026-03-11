'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Modal } from './modal';

interface DeviceOption {
  id: string;
  serialNo: string | null;
  model: string | null;
  name: string | null;
}

interface AssignDeviceModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
}

export function AssignDeviceModal({ open, onClose, companyId, companyName }: AssignDeviceModalProps) {
  const queryClient = useQueryClient();
  const [deviceId, setDeviceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: devices = [] } = useQuery({
    queryKey: ['devices-list-all'],
    queryFn: async () => {
      const res = await api.get<DeviceOption[]>('/devices');
      return res.data ?? [];
    },
    enabled: open,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceId.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await api.patch(`/devices/${deviceId}`, { companyId });
      await queryClient.invalidateQueries({ queryKey: ['devices'] });
      await queryClient.invalidateQueries({ queryKey: ['company-devices', companyId] });
      setDeviceId('');
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || 'Dodela uređaja nije uspela.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Uređaji / Dodeli">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Korisnik (kompanija)
          </label>
          <input
            type="text"
            value={companyName}
            readOnly
            className="w-full rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Uređaj
          </label>
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            required
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          >
            <option value="">— izaberite uređaj</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.serialNo ?? d.id} — {d.model ?? '—'}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200"
          >
            Nazad
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Dodela…' : 'Dodeli'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
