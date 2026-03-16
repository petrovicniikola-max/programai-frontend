'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api, type Device, type Licence } from '@/lib/api';
import { useToast } from '@/components/toast';
import { SearchableSelect } from '@/components/searchable-select';

interface TicketDetail {
  id: string;
  key: string;
  title: string;
  description: string | null;
  status: string;
  type: string;
  phoneRaw: string | null;
  contactName: string | null;
  callOccurredAt: string | null;
  callDurationMinutes: number | null;
  contactMethod: string | null;
  contactsContactedCount: number | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string | null;
  company: { id: string; name: string; pib: string | null; mb: string | null } | null;
  contact: { id: string; name: string } | null;
  assignee: { id: string; email: string; displayName: string | null } | null;
  createdBy: { id: string; email: string; displayName: string | null } | null;
  tags: { id: string; name: string }[];
  commentsCount: number;
  openTasksCount: number;
  reportedBy?: string | null;
  putIAngazovanje?: string[] | null;
  tokPrijave?: string | null;
  zakljucak?: string | null;
  potpisOvlascenogLica?: string | null;
  ticketDate?: string | null;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author?: { displayName: string | null; email: string };
}

interface Task {
  id: string;
  title: string;
  isDone: boolean;
  orderNo: number;
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showError } = useToast();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const res = await api.get<TicketDetail>(`/tickets/${id}`);
      return res.data;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['ticket', id, 'comments'],
    queryFn: async () => {
      const res = await api.get<Comment[]>(`/tickets/${id}/comments`);
      return res.data;
    },
    enabled: !!ticket,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['ticket', id, 'tasks'],
    queryFn: async () => {
      const res = await api.get<Task[]>(`/tickets/${id}/tasks`);
      return res.data;
    },
    enabled: !!ticket,
  });

  const { data: relatedDevices = [] } = useQuery({
    queryKey: ['ticket', id, 'devices', ticket?.company?.id],
    queryFn: async () => {
      if (!ticket?.company?.id) return [];
      const res = await api.get<Device[]>('/devices', {
        params: { companyId: ticket.company.id },
      });
      return res.data ?? [];
    },
    enabled: !!ticket?.company?.id,
  });

  const { data: relatedLicences = [] } = useQuery({
    queryKey: ['ticket', id, 'licences', ticket?.company?.id],
    queryFn: async () => {
      if (!ticket?.company?.id) return [];
      const res = await api.get<
        (Licence & {
          device?: { id: string; name: string | null; serialNo: string | null } | null;
        })[]
      >('/licences', {
        params: { companyId: ticket.company.id },
      });
      return res.data ?? [];
    },
    enabled: !!ticket?.company?.id,
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<{ id: string; role: string }>('/auth/me');
      return res.data;
    },
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ['settings', 'tags'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/settings/tags');
      return res.data;
    },
    enabled: !!ticket,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/companies');
      return res.data ?? [];
    },
    enabled: !!ticket,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['auth', 'users'],
    queryFn: async () => {
      const res = await api.get<{ id: string; email: string; displayName: string | null }[]>('/auth/users');
      return res.data ?? [];
    },
    enabled: !!ticket,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string; companyId?: string | null }[]>('/contacts');
      return res.data ?? [];
    },
    enabled: !!ticket,
  });

  const invalidateTicket = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  };

  const updateTicketMutation = useMutation({
    mutationFn: (body: {
      title?: string;
      description?: string;
      status?: string;
      type?: string;
      companyId?: string | null;
      contactId?: string | null;
      assigneeId?: string | null;
      callOccurredAt?: string | null;
      callDurationMinutes?: number | null;
      contactMethod?: string | null;
      contactsContactedCount?: number | null;
      reportedBy?: string | null;
      putIAngazovanje?: string[] | null;
      tokPrijave?: string | null;
      zakljucak?: string | null;
      potpisOvlascenogLica?: string | null;
      ticketDate?: string | null;
    }) => api.patch(`/tickets/${id}`, body),
    onSuccess: invalidateTicket,
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const addComment = useMutation({
    mutationFn: (body: string) =>
      api.post(`/tickets/${id}/comments`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'comments'] });
    },
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const addTask = useMutation({
    mutationFn: (title: string) =>
      api.post(`/tickets/${id}/tasks`, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'tasks'] });
    },
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const toggleTask = useMutation({
    mutationFn: ({ taskId, isDone }: { taskId: string; isDone: boolean }) =>
      api.patch(`/tickets/${id}/tasks/${taskId}`, { isDone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id, 'tasks'] });
    },
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const assignTags = useMutation({
    mutationFn: (tagIds: string[]) =>
      api.post(`/tickets/${id}/tags`, { tagIds }),
    onSuccess: invalidateTicket,
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const unassignTags = useMutation({
    mutationFn: (tagIds: string[]) =>
      api.delete(`/tickets/${id}/tags`, { data: { tagIds } }),
    onSuccess: invalidateTicket,
    onError: (e: unknown) =>
      showError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push('/tickets')}
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Nazad
        </button>
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push('/tickets')}
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Nazad
        </button>
        <p className="text-red-600 dark:text-red-400">Failed to load ticket.</p>
      </div>
    );
  }

  const canEdit = true;

  const handlePrint = () => {
    window.print();
  };

  const createdByLabel =
    ticket.createdBy?.displayName || ticket.createdBy?.email || (ticket.createdByUserId ? '(korisnik)' : null);

  return (
    <div className="space-y-6">
      {/* Štampa samo u formatu forme – ista polja i redosled kao "Kreiraj ticket" */}
      <div
        id="ticket-print-area"
        className="hidden print:block max-w-[210mm] mx-auto py-8 px-10 text-black"
        style={{ fontSize: '11pt' }}
      >
        <h1 className="text-lg font-semibold mb-6 border-b border-black pb-2">
          {ticket.key} – {ticket.title}
        </h1>
        <div className="space-y-4">
          <div>
            <div className="font-medium mb-1">1. Ko je prijavio?</div>
            <div className="min-h-[1.5em] border-b border-zinc-400">
              {ticket.reportedBy || '—'}
            </div>
          </div>
          <div>
            <div className="font-medium mb-1">2. Detaljan opis prijave</div>
            <div className="min-h-[4em] border border-zinc-400 p-2 whitespace-pre-wrap">
              {ticket.description || '—'}
            </div>
          </div>
          <div>
            <div className="font-medium mb-1">3. Put i angažovanje</div>
            <div className="text-xs text-zinc-600 mb-1">
              Svaki red posebno (npr. Na teren 2 tehničara, Službenim vozilom, Vreme: 4h, Kilometraža 180km).
            </div>
            {ticket.putIAngazovanje && ticket.putIAngazovanje.length > 0 ? (
              <div className="border border-zinc-400 p-2 space-y-1">
                {ticket.putIAngazovanje.map((line, i) => (
                  <div key={i} className="border-b border-zinc-200 last:border-0 pb-1 last:pb-0">
                    • {line}
                  </div>
                ))}
              </div>
            ) : (
              <div className="min-h-[2em] border border-zinc-400 p-2">—</div>
            )}
          </div>
          <div>
            <div className="font-medium mb-1">4. Tok prijave</div>
            <div className="min-h-[3em] border border-zinc-400 p-2 whitespace-pre-wrap">
              {ticket.tokPrijave || '—'}
            </div>
          </div>
          <div>
            <div className="font-medium mb-1">5. Zaključak</div>
            <div className="min-h-[3em] border border-zinc-400 p-2 whitespace-pre-wrap">
              {ticket.zakljucak || '—'}
            </div>
          </div>
          <div>
            <div className="font-medium mb-1">Potpis ovlašćenog lica</div>
            <div className="min-h-[2em] border-b-2 border-black">
              {ticket.potpisOvlascenogLica || ''}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <div className="font-medium mb-1">Datum</div>
              <div className="border-b border-zinc-400">
                {ticket.ticketDate
                  ? new Date(ticket.ticketDate).toLocaleDateString()
                  : '—'}
              </div>
            </div>
            <div>
              <div className="font-medium mb-1">Ticket napravio</div>
              <div className="border-b border-zinc-400">{createdByLabel ?? '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Prikaz na ekranu – jedna forma kao Korisnici / Izmeni, sva polja editabilna */}
      <div className="print:hidden space-y-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Tiketi / Izmeni</h1>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Podaci tiketa</h2>
          <TicketEditForm
            ticket={ticket}
            companies={companies}
            users={users}
            contacts={contacts}
            onSave={updateTicketMutation.mutate}
            saving={updateTicketMutation.isPending}
            onBack={() => router.push('/tickets')}
            onPrint={handlePrint}
          />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Komentari</h2>
          <CommentsSection
            comments={comments}
            onAdd={(body) => addComment.mutate(body)}
            adding={addComment.isPending}
          />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Zadaci</h2>
          <TasksSection
            tasks={tasks}
            onAdd={(title) => addTask.mutate(title)}
            onToggle={(taskId, isDone) => toggleTask.mutate({ taskId, isDone })}
            adding={addTask.isPending}
          />
        </section>

        {canEdit && (
          <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Tagovi</h2>
            <div className="flex flex-wrap gap-2 mb-2">
              {ticket.tags.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center rounded bg-zinc-200 px-2 py-0.5 text-sm dark:bg-zinc-700"
                >
                  {t.name}
                  <button
                    type="button"
                    onClick={() => unassignTags.mutate([t.id])}
                    disabled={unassignTags.isPending}
                    className="ml-1 text-zinc-500 hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <select
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              value=""
              onChange={(e) => {
                const tagId = e.target.value;
                if (tagId && !ticket.tags.some((t) => t.id === tagId))
                  assignTags.mutate([...ticket.tags.map((t) => t.id), tagId]);
                e.target.value = '';
              }}
            >
              <option value="">Dodaj tag…</option>
              {allTags
                .filter((tag) => !ticket.tags.some((t) => t.id === tag.id))
                .map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
            </select>
          </section>
        )}

        <section className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
          <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Uređaji (kompanija)</h2>
          {relatedDevices.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Nema uređaja.</p>
          ) : (
            <ul className="space-y-1">
              {relatedDevices.map((d) => (
                <li key={d.id}>
                  <Link href={`/devices/${d.id}`} className="text-emerald-600 hover:underline dark:text-emerald-400">
                    {d.name || d.model || d.serialNo || 'Uređaj'}
                  </Link>
                  {d.serialNo && <span className="ml-2 text-xs text-zinc-500">({d.serialNo})</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
          <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Licence (kompanija)</h2>
          {relatedLicences.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Nema licenci.</p>
          ) : (
            <ul className="space-y-1">
              {relatedLicences.map((l) => (
                <li key={l.id}>
                  <Link href={`/licences/${l.id}`} className="text-emerald-600 hover:underline dark:text-emerald-400">
                    {l.productName}
                  </Link>
                  <span className="ml-2 text-xs text-zinc-500">
                    {new Date(l.validTo).toLocaleDateString()}
                    {l.device?.serialNo ? ` · ${l.device.serialNo}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function userLabel(u: { displayName: string | null; email: string } | null) {
  if (!u) return '—';
  return u.displayName || u.email;
}

function TicketEditForm({
  ticket,
  companies,
  users,
  contacts,
  onSave,
  saving,
  onBack,
  onPrint,
}: {
  ticket: TicketDetail;
  companies: { id: string; name: string }[];
  users: { id: string; email: string; displayName: string | null }[];
  contacts: { id: string; name: string; companyId?: string | null }[];
  onSave: (body: Record<string, unknown>) => void;
  saving: boolean;
  onBack: () => void;
  onPrint: () => void;
}) {
  const [companyId, setCompanyId] = useState(ticket.company?.id ?? '');
  const [contactId, setContactId] = useState(ticket.contact?.id ?? '');
  const [assigneeId, setAssigneeId] = useState(ticket.assignee?.id ?? '');

  useEffect(() => {
    setCompanyId(ticket.company?.id ?? '');
    setContactId(ticket.contact?.id ?? '');
    setAssigneeId(ticket.assignee?.id ?? '');
  }, [ticket.id, ticket.company?.id, ticket.contact?.id, ticket.assignee?.id]);

  const inputClass =
    'w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100';
  const labelClass = 'mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

  const companyOptions = [{ id: '', label: '—' }, ...companies.map((c) => ({ id: c.id, label: c.name }))];
  const contactOptions = [
    { id: '', label: '—' },
    ...contacts.map((c) => ({ id: c.id, label: c.name })),
  ];
  const assigneeOptions = [
    { id: '', label: '—' },
    { id: 'unassigned', label: 'Nedodeljen' },
    ...users.map((u) => ({ id: u.id, label: userLabel(u) })),
  ];

  const isQuickTicket = ticket.key?.startsWith('Q-') ?? false;
  const isManualTicket = ticket.key?.startsWith('T-') ?? false;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const putRaw = (fd.get('putIAngazovanje') as string) || '';
        const putRows = putRaw.split('\n').map((s) => s.trim()).filter(Boolean);
        onSave({
          title: (fd.get('title') as string)?.trim() || undefined,
          description: (fd.get('description') as string)?.trim() || undefined,
          status: (fd.get('status') as string) || undefined,
          type: (fd.get('type') as string) || undefined,
          companyId: companyId || null,
          contactId: contactId || null,
          assigneeId: assigneeId === 'unassigned' ? null : assigneeId || null,
          callOccurredAt: (fd.get('callOccurredAt') as string) ? new Date((fd.get('callOccurredAt') as string)).toISOString() : null,
          callDurationMinutes: (fd.get('callDurationMinutes') as string) ? parseInt(String(fd.get('callDurationMinutes')), 10) : null,
          contactMethod: ((v) => (v === 'PHONE' || v === 'EMAIL' ? v : null))((fd.get('contactMethod') as string) || ''),
          contactsContactedCount: (fd.get('contactsContactedCount') as string)?.trim()
            ? parseInt(String(fd.get('contactsContactedCount')), 10)
            : null,
          reportedBy: (fd.get('reportedBy') as string)?.trim() || null,
          putIAngazovanje: putRows.length ? putRows : null,
          tokPrijave: (fd.get('tokPrijave') as string)?.trim() || null,
          zakljucak: (fd.get('zakljucak') as string)?.trim() || null,
          potpisOvlascenogLica: (fd.get('potpisOvlascenogLica') as string)?.trim() || null,
          ticketDate: (fd.get('ticketDate') as string)?.trim()
            ? new Date((fd.get('ticketDate') as string).trim() + 'T00:00:00').toISOString()
            : null,
        });
      }}
    >
      <div className="flex flex-wrap gap-2 mb-4 justify-end">
        <button
          type="button"
          onClick={onPrint}
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200"
        >
          Štampaj A4
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Key</label>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{ticket.key}</p>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Naziv / Title</label>
          <input type="text" name="title" defaultValue={ticket.title} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Opis / Description</label>
          <textarea name="description" rows={4} defaultValue={ticket.description ?? ''} className={inputClass} />
        </div>
        {!isManualTicket && (
          <>
            <div>
              <label className={labelClass}>Status</label>
              <select name="status" defaultValue={ticket.status} className={inputClass}>
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="DONE">DONE</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Tip</label>
              <select name="type" defaultValue={ticket.type} className={inputClass}>
                <option value="CALL">CALL</option>
                <option value="SUPPORT">SUPPORT</option>
                <option value="SALES">SALES</option>
                <option value="FIELD">FIELD</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Kompanija</label>
              <SearchableSelect
                value={companyId}
                onChange={setCompanyId}
                options={companyOptions}
                placeholder="—"
                searchPlaceholder="Pretraži..."
                className="w-full"
              />
            </div>
            <div>
              <label className={labelClass}>Kontakt</label>
              <SearchableSelect
                value={contactId}
                onChange={setContactId}
                options={contactOptions}
                placeholder="—"
                searchPlaceholder="Pretraži..."
                className="w-full"
              />
            </div>
            <div>
              <label className={labelClass}>Dodeljen (Assignee)</label>
              <SearchableSelect
                value={assigneeId}
                onChange={setAssigneeId}
                options={assigneeOptions}
                placeholder="—"
                searchPlaceholder="Pretraži..."
                className="w-full"
              />
            </div>
            <div>
              <label className={labelClass}>Vreme poziva (Call at)</label>
              <input
                type="datetime-local"
                name="callOccurredAt"
                defaultValue={
                  ticket.callOccurredAt ? new Date(ticket.callOccurredAt).toISOString().slice(0, 16) : ''
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Trajanje (min)</label>
              <input
                type="number"
                name="callDurationMinutes"
                min={0}
                defaultValue={ticket.callDurationMinutes ?? ''}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Način kontakta</label>
              <select
                name="contactMethod"
                defaultValue={ticket.contactMethod ?? ''}
                className={inputClass}
              >
                <option value="">—</option>
                <option value="PHONE">Telefonski poziv</option>
                <option value="EMAIL">Mail</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Broj kontaktiranih korisnika</label>
              <input
                type="number"
                name="contactsContactedCount"
                min={0}
                defaultValue={ticket.contactsContactedCount ?? ''}
                className={inputClass}
              />
            </div>
          </>
        )}
        {!isQuickTicket && (
          <>
            <div className="sm:col-span-2">
              <label className={labelClass}>Ko je prijavio (reportedBy)</label>
              <input
                type="text"
                name="reportedBy"
                defaultValue={ticket.reportedBy ?? ''}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Put i angažovanje (jedan red po liniji)</label>
              <textarea
                name="putIAngazovanje"
                rows={3}
                defaultValue={(ticket.putIAngazovanje ?? []).join('\n')}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Tok prijave</label>
              <textarea
                name="tokPrijave"
                rows={2}
                defaultValue={ticket.tokPrijave ?? ''}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Zaključak</label>
              <textarea
                name="zakljucak"
                rows={2}
                defaultValue={ticket.zakljucak ?? ''}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Potpis ovlašćenog lica</label>
              <input
                type="text"
                name="potpisOvlascenogLica"
                defaultValue={ticket.potpisOvlascenogLica ?? ''}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Datum</label>
              <input
                type="date"
                name="ticketDate"
                defaultValue={
                  ticket.ticketDate ? new Date(ticket.ticketDate).toISOString().slice(0, 10) : ''
                }
                className={inputClass}
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Čuvanje…' : 'Sačuvaj'}
        </button>
        <button type="button" onClick={onBack} className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
          Nazad
        </button>
      </div>
    </form>
  );
}

function TicketDescriptionForm({
  initial,
  onSave,
  saving,
}: {
  initial: string;
  onSave: (v: string) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);
  useEffect(() => setValue(initial), [initial]);
  return (
    <div>
      {editing ? (
        <>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => { onSave(value); setEditing(false); }}
              disabled={saving}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setValue(initial); setEditing(false); }}
              className="rounded border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <p
          className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap cursor-pointer min-h-[2rem]"
          onClick={() => setEditing(true)}
        >
          {initial || 'Click to add description…'}
        </p>
      )}
    </div>
  );
}

function CommentsSection({
  comments,
  onAdd,
  adding,
}: {
  comments: Comment[];
  onAdd: (body: string) => void;
  adding: boolean;
}) {
  const [body, setBody] = useState('');
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Comments</h2>
      <ul className="space-y-2 mb-4">
        {comments.map((c) => (
          <li key={c.id} className="border-l-2 border-zinc-200 pl-3 py-1 text-sm dark:border-zinc-700">
            <p className="text-zinc-900 dark:text-zinc-100">{c.body}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {c.author?.displayName || c.author?.email || '—'} · {new Date(c.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 print:hidden">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add comment…"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (body.trim()) { onAdd(body.trim()); setBody(''); }
            }
          }}
        />
        <button
          type="button"
          onClick={() => { if (body.trim()) { onAdd(body.trim()); setBody(''); } }}
          disabled={adding || !body.trim()}
          className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function TasksSection({
  tasks,
  onAdd,
  onToggle,
  adding,
}: {
  tasks: Task[];
  onAdd: (title: string) => void;
  onToggle: (taskId: string, isDone: boolean) => void;
  adding: boolean;
}) {
  const [title, setTitle] = useState('');
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Tasks</h2>
      <ul className="space-y-2 mb-4">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={t.isDone}
              onChange={() => onToggle(t.id, !t.isDone)}
              className="rounded"
            />
            <span className={t.isDone ? 'line-through text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}>
              {t.title}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 print:hidden">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add task…"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (title.trim()) { onAdd(title.trim()); setTitle(''); }
            }
          }}
        />
        <button
          type="button"
          onClick={() => { if (title.trim()) { onAdd(title.trim()); setTitle(''); } }}
          disabled={adding || !title.trim()}
          className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
