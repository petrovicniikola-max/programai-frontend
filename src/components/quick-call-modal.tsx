'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

function formatCallTime(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${day}.${month}.${year}. ${h}:${min}:${sec}`;
}

interface QuickCallModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickCallModal({ open, onClose }: QuickCallModalProps) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companyMb, setCompanyMb] = useState('');
  const [summary, setSummary] = useState('');
  const [callOccurredAt, setCallOccurredAt] = useState('');
  const [callDurationMinutes, setCallDurationMinutes] = useState('');
  const [conversationKind, setConversationKind] = useState<'SUPPORT' | 'SALES' | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setCallTimeNow() {
    setCallOccurredAt(new Date().toISOString());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/tickets/quick-call', {
        phone: phone.trim(),
        ...(contactName.trim() && { contactName: contactName.trim() }),
        ...(companyName.trim() && { companyName: companyName.trim() }),
        ...(companyId.trim() && { pib: companyId.trim() }),
        ...(companyMb.trim() && { mb: companyMb.trim() }),
        ...(summary.trim() && { summary: summary.trim() }),
        ...(callOccurredAt && { callOccurredAt }),
        ...(callDurationMinutes.trim() && {
          callDurationMinutes: parseInt(callDurationMinutes, 10),
        }),
        ...(conversationKind && { conversationKind }),
      });
      await queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setPhone('');
      setContactName('');
      setCompanyName('');
      setCompanyId('');
      setCompanyMb('');
      setSummary('');
      setCallOccurredAt('');
      setCallDurationMinutes('');
      setConversationKind('');
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || 'Quick call failed');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Quick Call
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Contact name
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Company name (optional)
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Creates company if it doesn’t exist"
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Company ID (optional)
            </label>
            <input
              type="text"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
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
              onChange={(e) => setCompanyMb(e.target.value)}
              placeholder="Matični broj kompanije"
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Summary
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Vrsta razgovora
            </label>
            <select
              value={conversationKind}
              onChange={(e) => setConversationKind(e.target.value as 'SUPPORT' | 'SALES' | '')}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            >
              <option value="">Nije odabrano</option>
              <option value="SUPPORT">Support</option>
              <option value="SALES">Prodaja</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Call start time
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={callOccurredAt ? formatCallTime(callOccurredAt) : ''}
                placeholder="Optional"
                className="w-48 rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
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
              Call duration (minutes)
            </label>
            <input
              type="number"
              min={0}
              value={callDurationMinutes}
              onChange={(e) => setCallDurationMinutes(e.target.value)}
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
