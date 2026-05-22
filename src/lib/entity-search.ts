import { api } from '@/lib/api';
import { DEVICES_ENDPOINT } from '@/lib/endpoints';
import type { SearchableOption } from '@/components/searchable-select';

const MIN = 3;

export function minSearchHint(min = MIN) {
  return `Unesite bar ${min} karaktera za pretragu.`;
}

export async function searchCompanies(query: string): Promise<SearchableOption[]> {
  const q = query.trim();
  if (q.length < MIN) return [];
  const res = await api.get<{ id: string; name: string }[]>('/companies', { params: { search: q } });
  return (res.data ?? []).map((c) => ({ id: c.id, label: c.name }));
}

export async function searchDistributors(query: string): Promise<SearchableOption[]> {
  const q = query.trim();
  if (q.length < MIN) return [];
  const res = await api.get<{ id: string; name: string }[]>('/distributors', { params: { search: q } });
  return (res.data ?? []).map((d) => ({ id: d.id, label: d.name }));
}

export async function searchDevices(
  query: string,
  filters?: { companyId?: string; distributorId?: string },
): Promise<SearchableOption[]> {
  const q = query.trim();
  if (q.length < MIN) return [];
  const params: { search: string; companyId?: string; distributorId?: string } = { search: q };
  if (filters?.companyId) params.companyId = filters.companyId;
  if (filters?.distributorId) params.distributorId = filters.distributorId;
  const res = await api.get<
    { id: string; name: string | null; serialNo: string | null; model: string | null; company?: { name: string } | null; distributor?: { name: string } | null }[]
  >(DEVICES_ENDPOINT, { params });
  return (res.data ?? []).map((d) => {
    const parts = [d.serialNo, d.name, d.model, d.company?.name, d.distributor?.name].filter(Boolean);
    return { id: d.id, label: parts.join(' · ') || d.id };
  });
}

/** Load single option labels for pre-filled ids (edit forms). */
export async function companyOptionById(id: string): Promise<SearchableOption | null> {
  if (!id) return null;
  try {
    const res = await api.get<{ id: string; name: string }>(`/companies/${id}`);
    return { id: res.data.id, label: res.data.name };
  } catch {
    return null;
  }
}

export async function distributorOptionById(id: string): Promise<SearchableOption | null> {
  if (!id) return null;
  try {
    const res = await api.get<{ id: string; name: string }>(`/distributors/${id}`);
    return { id: res.data.id, label: res.data.name };
  } catch {
    return null;
  }
}

export async function deviceOptionById(id: string): Promise<SearchableOption | null> {
  if (!id) return null;
  try {
    const res = await api.get<{
      id: string;
      serialNo: string | null;
      name: string | null;
      company?: { name: string } | null;
    }>(`${DEVICES_ENDPOINT}/${id}`);
    const d = res.data;
    const label = [d.serialNo, d.name, d.company?.name].filter(Boolean).join(' · ') || d.id;
    return { id: d.id, label };
  } catch {
    return null;
  }
}
