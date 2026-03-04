'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Modal } from '@/components/modal';
import { useToast } from '@/components/toast';

interface Company {
  id: string;
  name: string;
  city?: string;
  address?: string;
  pib?: string;
  mb?: string;
}

interface ContactPhone {
  id: string;
  phoneRaw: string;
}
interface Contact {
  id: string;
  name: string;
  companyId?: string;
  company?: { id: string; name: string };
  phones?: ContactPhone[];
}
function contactPhonesDisplay(phones: ContactPhone[] | undefined): string {
  if (!phones?.length) return '—';
  return phones.map((p) => p.phoneRaw).join(', ');
}

const tabs = ['Companies', 'Contacts'] as const;

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Companies');
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const { showError } = useToast();
  const queryClient = useQueryClient();

  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get<Company[]>('/companies');
      return res.data ?? [];
    },
  });

  const { data: allContacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await api.get<Contact[]>('/contacts');
      return res.data ?? [];
    },
  });
  const contacts = selectedCompanyId
    ? allContacts.filter((c) => c.companyId === selectedCompanyId)
    : allContacts;

  const { data: phoneResults, isFetching: phoneSearching } = useQuery({
    queryKey: ['contacts', 'search', phoneSearch],
    queryFn: async () => {
      const res = await api.get<Contact[]>(`/contacts?phone=${encodeURIComponent(phoneSearch)}`);
      return res.data ?? [];
    },
    enabled: phoneSearch.trim().length >= 2,
  });

  const createCompany = useMutation({
    mutationFn: async (body: { name: string; city?: string; address?: string; pib?: string; mb?: string }) => {
      const res = await api.post<Company>('/companies', body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setCompanyModalOpen(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to create company');
    },
  });

  const createContact = useMutation({
    mutationFn: async (body: { name: string; companyId?: string; phones?: string[] }) => {
      const res = await api.post<Contact>('/contacts', body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setContactModalOpen(false);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to create contact');
    },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Clients</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Companies and contacts.
      </p>

      <div className="mt-4 flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === tab
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Companies' && (
        <div className="mt-4">
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={() => setCompanyModalOpen(true)}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Create company
            </button>
          </div>
          {companiesLoading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">City</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Address</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">PIB / MB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {companies.map((c) => (
                    <tr key={c.id} className="bg-white dark:bg-zinc-800/30">
                      <td className="px-4 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">{c.name}</td>
                      <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">{c.city ?? '—'}</td>
                      <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">{c.address ?? '—'}</td>
                      <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {[c.pib, c.mb].filter(Boolean).join(' / ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {companies.length === 0 && (
                <p className="p-4 text-center text-sm text-zinc-500">No companies yet.</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Contacts' && (
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Search by phone</label>
              <input
                type="text"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                placeholder="e.g. +381..."
                className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Filter by company</label>
              <select
                value={selectedCompanyId ?? ''}
                onChange={(e) => setSelectedCompanyId(e.target.value || null)}
                className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">All companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="ml-auto">
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Create contact
              </button>
            </div>
          </div>

          {phoneSearch.trim().length >= 2 && (
            <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Phone search results</h3>
              {phoneSearching ? (
                <p className="text-sm text-zinc-500">Searching…</p>
              ) : phoneResults?.length ? (
                <ul className="mt-2 space-y-1">
                  {phoneResults.map((c) => (
                    <li key={c.id}>
                      <Link
                        href="#"
                        onClick={(e) => { e.preventDefault(); setActiveTab('Contacts'); setPhoneSearch(''); setSelectedCompanyId(c.companyId ?? null); }}
                        className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        {c.name}
                      </Link>
                      {c.company && <span className="ml-2 text-sm text-zinc-500">— {c.company.name}</span>}
                      {c.phones?.length ? <span className="ml-2 text-xs text-zinc-400">{contactPhonesDisplay(c.phones)}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">No contacts found for this phone.</p>
              )}
            </div>
          )}

          {contactsLoading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Company</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Phones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                  {contacts.map((c) => (
                    <tr key={c.id} className="bg-white dark:bg-zinc-800/30">
                      <td className="px-4 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">{c.name}</td>
                      <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {c.company ? (
                          <span>{c.company.name}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {contactPhonesDisplay(c.phones)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {contacts.length === 0 && (
                <p className="p-4 text-center text-sm text-zinc-500">No contacts.</p>
              )}
            </div>
          )}
        </div>
      )}

      <CreateCompanyModal
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
        onSubmit={(data) => createCompany.mutate(data)}
        isLoading={createCompany.isPending}
      />
      <CreateContactModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        companies={companies}
        onSubmit={(data) => createContact.mutate(data)}
        isLoading={createContact.isPending}
      />
    </div>
  );
}

function CreateCompanyModal({
  open,
  onClose,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; city?: string; address?: string; pib?: string; mb?: string }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [pib, setPib] = useState('');
  const [mb, setMb] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), city: city.trim() || undefined, address: address.trim() || undefined, pib: pib.trim() || undefined, mb: mb.trim() || undefined });
    setName(''); setCity(''); setAddress(''); setPib(''); setMb('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Create company">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">PIB</label>
            <input
              type="text"
              value={pib}
              onChange={(e) => setPib(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">MB</label>
            <input
              type="text"
              value={mb}
              onChange={(e) => setMb(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isLoading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CreateContactModal({
  open,
  onClose,
  companies,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  companies: Company[];
  onSubmit: (data: { name: string; companyId?: string; phones?: string[] }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [phonesText, setPhonesText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const phones = phonesText.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    onSubmit({ name: name.trim(), companyId: companyId || undefined, phones: phones.length ? phones : undefined });
    setName(''); setCompanyId(''); setPhonesText('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Create contact">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Company</label>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">—</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Phones (comma or newline)</label>
          <textarea
            value={phonesText}
            onChange={(e) => setPhonesText(e.target.value)}
            rows={2}
            placeholder="+381..."
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isLoading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
