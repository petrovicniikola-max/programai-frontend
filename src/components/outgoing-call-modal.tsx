'use client';

import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

interface OutgoingCallModalProps {
  open: boolean;
  onClose: () => void;
}

const LOOKUP_DEBOUNCE_MS = 400;

export function OutgoingCallModal({ open, onClose }: OutgoingCallModalProps) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companyMb, setCompanyMb] = useState('');
  const [companyPib, setCompanyPib] = useState('');
  const [summary, setSummary] = useState('');
  const [callOccurredAt, setCallOccurredAt] = useState('');
  const [callDurationMinutes, setCallDurationMinutes] = useState('');
  const [contactMethod, setContactMethod] = useState<'PHONE' | 'EMAIL' | ''>('');
  const [useCentrala, setUseCentrala] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLookupRef = useRef<string>('');

  const runLookup = useCallback(async () => {
    const q = [phone, contactName, companyName, companyId, companyPib, companyMb].filter(Boolean).join('|');
    if (!q || q === lastLookupRef.current) return;
    lastLookupRef.current = q;
    try {
      const params = new URLSearchParams();
      if (phone.trim()) params.set('phone', phone.trim());
      if (contactName.trim()) params.set('contactName', contactName.trim());
      if (companyName.trim()) params.set('companyName', companyName.trim());
      if (companyId.trim()) params.set('companyId', companyId.trim());
      if (companyPib.trim()) params.set('pib', companyPib.trim());
      if (companyMb.trim()) params.set('mb', companyMb.trim());
      if (params.toString() === '') return;
      const res = await api.get<{
        contact?: { id: string; name: string; companyId: string | null; phones: { phoneRaw: string }[] };
        company?: { id: string; name: string; pib: string | null; mb: string | null };
      }>(`/tickets/quick-call/client-lookup?${params.toString()}`);
      const { contact, company } = res.data;
      if (contact) {
        setContactName((prev) => prev || contact.name);
        if (contact.phones?.[0]?.phoneRaw) setPhone((prev) => prev || contact.phones[0].phoneRaw);
      }
      if (company) {
        setCompanyName((prev) => prev || company.name);
        if (company.pib) setCompanyPib((prev) => prev || (company.pib ?? ''));
        if (company.mb) setCompanyMb((prev) => prev || (company.mb ?? ''));
        if (company.id) setCompanyId((prev) => prev || company.id);
      }
    } catch {
      lastLookupRef.current = '';
    }
  }, [phone, contactName, companyName, companyId, companyPib, companyMb]);

  const scheduleLookup = useCallback(() => {
    if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);
    lookupTimeoutRef.current = setTimeout(() => {
      lookupTimeoutRef.current = null;
      runLookup();
    }, LOOKUP_DEBOUNCE_MS);
  }, [runLookup]);

  function setCallTimeNow() {
    setCallOccurredAt(new Date().toISOString());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/tickets/quick-call', {
        ...(useCentrala ? {} : { phone: phone.trim() }),
        ...(contactName.trim() && { contactName: contactName.trim() }),
        ...(companyName.trim() && { companyName: companyName.trim() }),
        ...(companyId.trim() && { companyId: companyId.trim() }),
        ...(companyPib.trim() && { pib: companyPib.trim() }),
        ...(companyMb.trim() && { mb: companyMb.trim() }),
        ...(summary.trim() && { summary: summary.trim() }),
        ...(callOccurredAt && { callOccurredAt }),
        ...(callDurationMinutes.trim() && {
          callDurationMinutes: parseInt(callDurationMinutes, 10),
        }),
        ...(contactMethod && { contactMethod }),
      });
      await queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setPhone('');
      setContactName('');
      setCompanyName('');
      setCompanyId('');
      setCompanyPib('');
      setCompanyMb('');
      setUseCentrala(false);
      lastLookupRef.current = '';
      setSummary('');
      setCallOccurredAt('');
      setCallDurationMinutes('');
      setContactMethod('');
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || 'Outgoing call failed');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Outgoing Call
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useCentrala}
                onChange={(e) => setUseCentrala(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Centrala</span>
            </label>
          </div>
          {!useCentrala && (
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  scheduleLookup();
                }}
                onBlur={runLookup}
                required
                placeholder="uneti broj telefona"
                className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Contact name
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => {
                setContactName(e.target.value);
                scheduleLookup();
              }}
              onBlur={runLookup}
              placeholder="Ime klijenta"
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Company name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                scheduleLookup();
              }}
              onBlur={runLookup}
              placeholder="Ime kompanije"
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              PIB (optional)
            </label>
            <input
              type="text"
              value={companyPib}
              onChange={(e) => {
                setCompanyPib(e.target.value);
                scheduleLookup();
              }}
              onBlur={runLookup}
              placeholder="PIB kompanije"
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              MB (optional)
            </label>
            <input
              type="text"
              value={companyMb}
              onChange={(e) => {
                setCompanyMb(e.target.value);
                scheduleLookup();
              }}
              onBlur={runLookup}
              placeholder="Matični broj kompanije"
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Summary <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Uneti opis poziva"
              required
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Način kontakta
            </label>
            <select
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value as 'PHONE' | 'EMAIL' | '')}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            >
              <option value="">Nije odabrano</option>
              <option value="PHONE">Telefonski poziv</option>
              <option value="EMAIL">Mail</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Call start time
            </label>
            <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
              Uneti datum i vreme poziva
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="datetime-local"
                value={callOccurredAt ? toDatetimeLocalValue(callOccurredAt) : ''}
                onChange={(e) => setCallOccurredAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={setCallTimeNow}
                className="rounded border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
              >
                Now
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Call duration
            </label>
            <input
              type="number"
              min={0}
              value={callDurationMinutes}
              onChange={(e) => setCallDurationMinutes(e.target.value)}
              placeholder="minutes"
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:text-zinc-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
