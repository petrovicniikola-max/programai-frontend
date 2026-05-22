'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DEVICES_ENDPOINT } from '@/lib/endpoints';
import { AsyncSearchableSelect } from './async-searchable-select';
import {
  searchCompanies,
  searchDistributors,
  searchDevices,
  companyOptionById,
  distributorOptionById,
  deviceOptionById,
  minSearchHint,
} from '@/lib/entity-search';

interface TicketEntityPickersProps {
  companyId: string;
  onCompanyId: (id: string) => void;
  distributorId: string;
  onDistributorId: (id: string) => void;
  deviceId: string;
  onDeviceId: (id: string) => void;
  /** Sync reportedBy text when company changes */
  onCompanyName?: (name: string) => void;
  className?: string;
}

export function TicketEntityPickers({
  companyId,
  onCompanyId,
  distributorId,
  onDistributorId,
  deviceId,
  onDeviceId,
  onCompanyName,
  className = '',
}: TicketEntityPickersProps) {
  const [companyInit, setCompanyInit] = useState<{ id: string; label: string } | null>(null);
  const [distInit, setDistInit] = useState<{ id: string; label: string } | null>(null);
  const [deviceInit, setDeviceInit] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (companyId) {
        const o = await companyOptionById(companyId);
        if (!cancelled && o) setCompanyInit(o);
      } else setCompanyInit(null);
      if (distributorId) {
        const o = await distributorOptionById(distributorId);
        if (!cancelled && o) setDistInit(o);
      } else setDistInit(null);
      if (deviceId) {
        const o = await deviceOptionById(deviceId);
        if (!cancelled && o) setDeviceInit(o);
      } else setDeviceInit(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, distributorId, deviceId]);

  async function handleCompanyChange(id: string) {
    onCompanyId(id);
    if (!id) {
      onCompanyName?.('');
      return;
    }
    const opt = await companyOptionById(id);
    if (opt) {
      setCompanyInit(opt);
      onCompanyName?.(opt.label);
    }
  }

  async function handleDistributorChange(id: string) {
    onDistributorId(id);
    if (deviceId) {
      try {
        const res = await api.get<{ distributorId?: string | null }>(`${DEVICES_ENDPOINT}/${deviceId}`);
        if (res.data.distributorId && res.data.distributorId !== id) onDeviceId('');
      } catch {
        onDeviceId('');
      }
    }
  }

  async function handleDeviceChange(id: string) {
    onDeviceId(id);
    if (!id) return;
    try {
      const res = await api.get<{
        id: string;
        companyId: string | null;
        distributorId?: string | null;
        serialNo: string | null;
        name: string | null;
        company?: { id: string; name: string } | null;
        distributor?: { id: string; name: string } | null;
      }>(`${DEVICES_ENDPOINT}/${id}`);
      const d = res.data;
      const label = [d.serialNo, d.name, d.company?.name].filter(Boolean).join(' · ') || d.id;
      setDeviceInit({ id: d.id, label });
      if (d.companyId) {
        onCompanyId(d.companyId);
        if (d.company?.name) {
          setCompanyInit({ id: d.companyId, label: d.company.name });
          onCompanyName?.(d.company.name);
        }
      }
      if (d.distributorId && d.distributor?.name) {
        onDistributorId(d.distributorId);
        setDistInit({ id: d.distributorId, label: d.distributor.name });
      }
    } catch {
      /* ignore */
    }
  }

  const labelClass = 'mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

  return (
    <div className={`grid gap-4 sm:grid-cols-1 ${className}`}>
      <div>
        <label className={labelClass}>Korisnik (kompanija)</label>
        <AsyncSearchableSelect
          value={companyId}
          onChange={handleCompanyChange}
          loadOptions={searchCompanies}
          initialOption={companyInit}
          placeholder="Pretraži korisnika…"
          searchPlaceholder="Naziv, PIB, MB…"
          minSearchHint={minSearchHint()}
        />
      </div>
      <div>
        <label className={labelClass}>Distributer</label>
        <AsyncSearchableSelect
          value={distributorId}
          onChange={handleDistributorChange}
          loadOptions={searchDistributors}
          initialOption={distInit}
          placeholder="Pretraži distributera…"
          searchPlaceholder="Naziv distributera…"
          minSearchHint={minSearchHint()}
        />
      </div>
      <div>
        <label className={labelClass}>Uređaj</label>
        <AsyncSearchableSelect
          value={deviceId}
          onChange={handleDeviceChange}
          loadOptions={(q) => searchDevices(q, { companyId: companyId || undefined, distributorId: distributorId || undefined })}
          initialOption={deviceInit}
          placeholder="Pretraži uređaj…"
          searchPlaceholder="Serijski broj, naziv…"
          minSearchHint={minSearchHint()}
        />
        {(companyId || distributorId) && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Pretraga je sužena prema izabranom korisniku/distributeru.
          </p>
        )}
      </div>
    </div>
  );
}
