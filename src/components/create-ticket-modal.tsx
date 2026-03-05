'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Modal } from './modal';
import { SearchableSelect } from './searchable-select';

interface TenantUser {
  id: string;
  email: string;
  displayName: string | null;
}

function userLabel(u: { displayName: string | null; email: string }) {
  return u.displayName || u.email;
}

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  users: TenantUser[] | undefined;
  currentUserId: string | undefined;
}

export function CreateTicketModal({ open, onClose, users, currentUserId }: CreateTicketModalProps) {
  const queryClient = useQueryClient();
  const [reportedBy, setReportedBy] = useState('');
  const [opisPrijave, setOpisPrijave] = useState('');
  const [putRows, setPutRows] = useState<string[]>(['']);
  const [tokPrijave, setTokPrijave] = useState('');
  const [zakljucak, setZakljucak] = useState('');
  const [potpis, setPotpis] = useState('');
  const [ticketDate, setTicketDate] = useState('');
  const [createdByUserId, setCreatedByUserId] = useState(currentUserId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && currentUserId) setCreatedByUserId(currentUserId);
  }, [open, currentUserId]);

  function setDateNow() {
    setTicketDate(new Date().toISOString().slice(0, 16));
  }

  function addPutRow() {
    setPutRows((r) => [...r, '']);
  }

  function setPutRow(i: number, value: string) {
    setPutRows((r) => {
      const next = [...r];
      next[i] = value;
      return next;
    });
  }

  function removePutRow(i: number) {
    setPutRows((r) => r.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const title = reportedBy.trim() ? `Prijava – ${reportedBy.trim()}` : 'Prijava – Bez naziva';
    const putFiltered = putRows.map((s) => s.trim()).filter(Boolean);
    try {
      await api.post('/tickets', {
        title,
        description: opisPrijave.trim() || undefined,
        type: 'FIELD',
        status: 'OPEN',
        reportedBy: reportedBy.trim() || undefined,
        putIAngazovanje: putFiltered.length ? putFiltered : undefined,
        tokPrijave: tokPrijave.trim() || undefined,
        zakljucak: zakljucak.trim() || undefined,
        potpisOvlascenogLica: potpis.trim() || undefined,
        ticketDate: ticketDate ? new Date(ticketDate).toISOString() : undefined,
        createdByUserId: createdByUserId || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setReportedBy('');
      setOpisPrijave('');
      setPutRows(['']);
      setTokPrijave('');
      setZakljucak('');
      setPotpis('');
      setTicketDate('');
      setCreatedByUserId(currentUserId ?? '');
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || 'Kreiranje tiketa nije uspelo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Kreiraj ticket" size="lg">
      <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
        {error && (
          <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            1. Ko je prijavio?
          </label>
          <input
            type="text"
            value={reportedBy}
            onChange={(e) => setReportedBy(e.target.value)}
            placeholder="Ime firme ili naziv korisnika"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            2. Opis prijave
          </label>
          <textarea
            value={opisPrijave}
            onChange={(e) => setOpisPrijave(e.target.value)}
            placeholder="Detaljan opis prijave"
            rows={4}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            3. Put i angažovanje
          </label>
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            Svaki red posebno (npr. Na teren 2 tehničara, Službenim vozilom, Vreme: 4h, Kilometraža 180km).
          </p>
          <div className="space-y-2">
            {putRows.map((row, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={row}
                  onChange={(e) => setPutRow(i, e.target.value)}
                  placeholder="Red teksta"
                  className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => removePutRow(i)}
                  className="rounded border border-zinc-300 px-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                  Ukloni
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addPutRow}
              className="rounded border border-dashed border-zinc-400 px-3 py-1.5 text-sm text-zinc-600 dark:border-zinc-500 dark:text-zinc-400"
            >
              + Add row
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            4. Tok prijave
          </label>
          <textarea
            value={tokPrijave}
            onChange={(e) => setTokPrijave(e.target.value)}
            placeholder="Detaljan opis toka prijave"
            rows={3}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            5. Zaključak
          </label>
          <textarea
            value={zakljucak}
            onChange={(e) => setZakljucak(e.target.value)}
            placeholder="Zaključak"
            rows={3}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Potpis ovlašćenog lica
          </label>
          <input
            type="text"
            value={potpis}
            onChange={(e) => setPotpis(e.target.value)}
            placeholder="___________________________________________"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Datum
          </label>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={ticketDate}
              onChange={(e) => setTicketDate(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={setDateNow}
              className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-700"
            >
              Now
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Ticket napravio
          </label>
          <SearchableSelect
            value={createdByUserId}
            onChange={setCreatedByUserId}
            options={(users ?? []).map((u) => ({ id: u.id, label: userLabel(u) }))}
            placeholder="—"
            searchPlaceholder="Pretraži korisnika..."
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
            {loading ? 'Kreiranje…' : 'Kreiraj ticket'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
