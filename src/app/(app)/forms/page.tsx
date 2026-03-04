'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type User } from '@/lib/api';
import { Modal } from '@/components/modal';
import { useToast } from '@/components/toast';

interface FormItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  updatedAt: string;
}

interface FormsResponse {
  items: FormItem[];
  total: number;
  page: number;
  limit: number;
}

const canEditForms = (role: string) => role === 'SUPER_ADMIN' || role === 'SALES';

export default function FormsPage() {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [sendLinkForm, setSendLinkForm] = useState<FormItem | null>(null);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      return res.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: async () => {
      const res = await api.get<FormsResponse>('/forms');
      return res.data;
    },
  });

  const createForm = useMutation({
    mutationFn: async (body: { title: string; description?: string }) => {
      const res = await api.post<FormItem>('/forms', body);
      return res.data;
    },
    onSuccess: (form) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      setCreateOpen(false);
      window.location.href = `/forms/${form.id}/builder`;
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to create form');
    },
  });

  const publishForm = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/forms/${id}/publish`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms'] }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to publish');
    },
  });

  const unpublishForm = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/forms/${id}/unpublish`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms'] }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to unpublish');
    },
  });

  const cloneForm = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<FormItem>(`/forms/${id}/clone`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms'] }),
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to clone');
    },
  });

  const sendFormLink = useMutation({
    mutationFn: async ({ formId, toEmail, message }: { formId: string; toEmail: string; message?: string }) => {
      const res = await api.post<{ sent: boolean; error?: string; previewUrl?: string }>(`/forms/${formId}/send-link`, {
        toEmail: toEmail.trim().toLowerCase(),
        message: message?.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: (result) => {
      if (result.sent) {
        setSendLinkForm(null);
        queryClient.invalidateQueries({ queryKey: ['forms'] });
        if (result.previewUrl) {
          window.open(result.previewUrl, '_blank');
        }
      } else {
        showError(result.error ?? 'Slanje nije uspelo');
      }
    },
    onError: (e: { response?: { data?: { message?: string; error?: string } } }) => {
      showError(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Slanje linka na mail nije uspelo');
    },
  });

  const canEdit = canEditForms(user?.role ?? '');

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Forms</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Create forms, add questions, publish and view submissions.
      </p>
      {canEdit && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Create form
          </button>
        </div>
      )}
      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Title</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Updated</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {(data?.items ?? []).map((f) => (
                <tr key={f.id} className="bg-white dark:bg-zinc-800/30">
                  <td className="px-4 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">{f.title}</td>
                  <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">{f.status}</td>
                  <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {new Date(f.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {canEdit && (
                      <>
                        <Link
                          href={`/forms/${f.id}/builder`}
                          className="text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          Builder
                        </Link>
                        <span className="mx-2 text-zinc-400">|</span>
                      </>
                    )}
                    <Link
                      href={`/forms/${f.id}/responses`}
                      className="text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      Responses
                    </Link>
                    {canEdit && (
                      <>
                        <span className="mx-2 text-zinc-400">|</span>
                        {f.status === 'PUBLISHED' ? (
                          <button
                            type="button"
                            onClick={() => unpublishForm.mutate(f.id)}
                            disabled={unpublishForm.isPending}
                            className="text-amber-600 hover:underline dark:text-amber-400"
                          >
                            Unpublish
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => publishForm.mutate(f.id)}
                            disabled={publishForm.isPending}
                            className="text-emerald-600 hover:underline dark:text-emerald-400"
                          >
                            Publish
                          </button>
                        )}
                        <span className="mx-2 text-zinc-400">|</span>
                        <button
                          type="button"
                          onClick={() => cloneForm.mutate(f.id)}
                          disabled={cloneForm.isPending}
                          className="text-zinc-600 hover:underline dark:text-zinc-400"
                        >
                          Clone
                        </button>
                        <span className="mx-2 text-zinc-400">|</span>
                        <button
                          type="button"
                          onClick={() => setSendLinkForm(f)}
                          className="text-sky-600 hover:underline dark:text-sky-400"
                        >
                          Pošalji na mail
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data?.items?.length) && (
            <p className="p-4 text-center text-sm text-zinc-500">No forms yet.</p>
          )}
        </div>
      )}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create form">
        <CreateFormForm
          onSubmit={(d) => createForm.mutate(d)}
          onCancel={() => setCreateOpen(false)}
          isLoading={createForm.isPending}
        />
      </Modal>
      <Modal
        open={!!sendLinkForm}
        onClose={() => setSendLinkForm(null)}
        title={sendLinkForm ? `Pošalji formu na mail: ${sendLinkForm.title}` : 'Pošalji na mail'}
      >
        {sendLinkForm && (
          <SendFormLinkForm
            formTitle={sendLinkForm.title}
            onSubmit={(d) => sendFormLink.mutate({ formId: sendLinkForm.id, ...d })}
            onCancel={() => setSendLinkForm(null)}
            isLoading={sendFormLink.isPending}
          />
        )}
      </Modal>
    </div>
  );
}

function CreateFormForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (d: { title: string; description?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim() || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={500}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={2}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400">Cancel</button>
        <button type="submit" disabled={isLoading} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {isLoading ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
  );
}

function SendFormLinkForm({
  formTitle,
  onSubmit,
  onCancel,
  isLoading,
}: {
  formTitle: string;
  onSubmit: (d: { toEmail: string; message?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [toEmail, setToEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim()) return;
    onSubmit({ toEmail: toEmail.trim(), message: message.trim() || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Link ka formi &quot;{formTitle}&quot; biće poslat na unetu adresu. Primaoc može otvoriti link i popuniti formu (potrebna prijava).
      </p>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email primaoca *</label>
        <input
          type="email"
          value={toEmail}
          onChange={(e) => setToEmail(e.target.value)}
          required
          placeholder="npr. korisnik@example.com"
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Poruka (opciono)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Dodatni tekst u mailu..."
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400">Odustani</button>
        <button type="submit" disabled={isLoading} className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50">
          {isLoading ? 'Šaljem…' : 'Pošalji'}
        </button>
      </div>
    </form>
  );
}
