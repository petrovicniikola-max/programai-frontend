'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, createProject, deleteProject, getProjects, getTenantUsers, updateProject, type Project, type TenantUser } from '@/lib/api';
import { usePermissions } from '@/hooks/use-permissions';
import { Modal } from '@/components/modal';
import { AsyncSearchableSelect } from '@/components/async-searchable-select';
import {
  companyOptionById,
  distributorOptionById,
  minSearchHint,
  searchCompanies,
  searchDistributors,
} from '@/lib/entity-search';
import { useTexts } from '@/lib/use-texts';

function userLabel(u: { displayName: string | null; email: string }) {
  return u.displayName || u.email;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export default function ProjectsPage() {
  const txt = useTexts();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  const { canEdit } = usePermissions();
  const canAdmin = canEdit('projects');

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: getTenantUsers,
    enabled: !!canAdmin,
  });

  const portalUsers = useMemo(
    () => users.filter((u) => u.isActive && !!u.email),
    [users],
  );

  const createMut = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      setCreateOpen(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof updateProject>[1] }) => updateProject(id, dto),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditProject(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{txt('projects.title')}</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{txt('projects.description')}</p>
        </div>
        {canAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
          >
            {txt('projects.btn.create')}
          </button>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <tr>
              <th className="px-3 py-2">{txt('projects.th.name')}</th>
              <th className="px-3 py-2">{txt('projects.th.startDate')}</th>
              <th className="px-3 py-2">{txt('projects.th.endDate')}</th>
              <th className="px-3 py-2">{txt('projects.th.company')}</th>
              <th className="px-3 py-2">{txt('projects.th.distributor')}</th>
              <th className="px-3 py-2">{txt('projects.th.assignees')}</th>
              <th className="px-3 py-2">{txt('projects.th.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400" colSpan={7}>
                  {txt('projects.loading')}
                </td>
              </tr>
            )}
            {error && !isLoading && (
              <tr>
                <td className="px-3 py-3 text-red-600 dark:text-red-400" colSpan={7}>
                  {txt('projects.error')}
                </td>
              </tr>
            )}
            {!isLoading && !error && projects.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400" colSpan={7}>
                  {txt('projects.empty')}
                </td>
              </tr>
            )}
            {projects.map((p) => (
              <tr key={p.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">
                  <Link href={`/projects/${p.id}`} className="hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{fmtDate(p.startDate)}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{fmtDate(p.endDate)}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{p.company?.name ?? '—'}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{p.distributor?.name ?? '—'}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">
                  {(p.assignments ?? [])
                    .map((a) => a.user ? userLabel(a.user) : a.userId)
                    .slice(0, 3)
                    .join(', ') || '—'}
                  {(p.assignments?.length ?? 0) > 3 ? '…' : ''}
                </td>
                <td className="px-3 py-2">
                  {canAdmin ? (
                    <div className="flex gap-2">
                      <button
                        className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        onClick={() => setEditProject(p)}
                      >
                        {txt('projects.btn.edit')}
                      </button>
                      <button
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                        onClick={() => deleteMut.mutate(p.id)}
                      >
                        {txt('projects.btn.delete')}
                      </button>
                    </div>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(createOpen || !!editProject) && (
        <ProjectModal
          open={createOpen || !!editProject}
          onClose={() => {
            setCreateOpen(false);
            setEditProject(null);
          }}
          mode={editProject ? 'edit' : 'create'}
          users={portalUsers}
          initial={editProject}
          onCreate={(dto) => createMut.mutate(dto)}
          onUpdate={(id, dto) => updateMut.mutate({ id, dto })}
          txt={txt}
          busy={createMut.isPending || updateMut.isPending}
        />
      )}
    </div>
  );
}

function ProjectModal({
  open,
  onClose,
  mode,
  users,
  initial,
  onCreate,
  onUpdate,
  txt,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  users: TenantUser[];
  initial: Project | null;
  onCreate: (dto: {
    name: string;
    startDate: string;
    endDate?: string | null;
    assignedUserIds?: string[];
    companyId?: string | null;
    distributorId?: string | null;
  }) => void;
  onUpdate: (
    id: string,
    dto: {
      name?: string;
      startDate?: string;
      endDate?: string | null;
      assignedUserIds?: string[];
      companyId?: string | null;
      distributorId?: string | null;
    },
  ) => void;
  txt: (k: string) => string;
  busy: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [startDate, setStartDate] = useState(() =>
    initial?.startDate ? new Date(initial.startDate).toISOString().slice(0, 10) : '',
  );
  const [endDate, setEndDate] = useState(() =>
    initial?.endDate ? new Date(initial.endDate).toISOString().slice(0, 10) : '',
  );
  const [assigned, setAssigned] = useState<string[]>(() => (initial?.assignments ?? []).map((a) => a.userId));
  const [companyId, setCompanyId] = useState(initial?.companyId ?? initial?.company?.id ?? '');
  const [distributorId, setDistributorId] = useState(initial?.distributorId ?? initial?.distributor?.id ?? '');
  const [companyInitial, setCompanyInitial] = useState<{ id: string; label: string } | null>(
    initial?.company ? { id: initial.company.id, label: initial.company.name } : null,
  );
  const [distributorInitial, setDistributorInitial] = useState<{ id: string; label: string } | null>(
    initial?.distributor ? { id: initial.distributor.id, label: initial.distributor.name } : null,
  );

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setStartDate(initial?.startDate ? new Date(initial.startDate).toISOString().slice(0, 10) : '');
    setEndDate(initial?.endDate ? new Date(initial.endDate).toISOString().slice(0, 10) : '');
    setAssigned((initial?.assignments ?? []).map((a) => a.userId));
    const cId = initial?.companyId ?? initial?.company?.id ?? '';
    const dId = initial?.distributorId ?? initial?.distributor?.id ?? '';
    setCompanyId(cId);
    setDistributorId(dId);
    if (initial?.company) {
      setCompanyInitial({ id: initial.company.id, label: initial.company.name });
    } else if (cId) {
      void companyOptionById(cId).then((o) => setCompanyInitial(o));
    } else {
      setCompanyInitial(null);
    }
    if (initial?.distributor) {
      setDistributorInitial({ id: initial.distributor.id, label: initial.distributor.name });
    } else if (dId) {
      void distributorOptionById(dId).then((o) => setDistributorInitial(o));
    } else {
      setDistributorInitial(null);
    }
  }, [open, initial]);

  function toggleUser(id: string) {
    setAssigned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dto = {
      name: name.trim(),
      startDate: startDate ? new Date(startDate).toISOString() : '',
      endDate: endDate ? new Date(endDate).toISOString() : null,
      assignedUserIds: assigned,
      companyId: companyId || null,
      distributorId: distributorId || null,
    };
    if (mode === 'create') onCreate(dto);
    else if (initial) onUpdate(initial.id, dto);
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === 'create' ? txt('projects.modal.create.title') : txt('projects.modal.edit.title')} size="lg">
      <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {txt('projects.form.name')}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder={txt('projects.form.name.placeholder')}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {txt('projects.form.company')}
            </label>
            <AsyncSearchableSelect
              value={companyId}
              onChange={setCompanyId}
              loadOptions={searchCompanies}
              initialOption={companyInitial}
              placeholder={txt('projects.form.company.placeholder')}
              searchPlaceholder={txt('projects.form.company.placeholder')}
              minSearchChars={3}
              minSearchHint={minSearchHint(3)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {txt('projects.form.distributor')}
            </label>
            <AsyncSearchableSelect
              value={distributorId}
              onChange={setDistributorId}
              loadOptions={searchDistributors}
              initialOption={distributorInitial}
              placeholder={txt('projects.form.distributor.placeholder')}
              searchPlaceholder={txt('projects.form.distributor.placeholder')}
              minSearchChars={3}
              minSearchHint={minSearchHint(3)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {txt('projects.form.startDate')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {txt('projects.form.endDate')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{txt('projects.form.endDate.hint')}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {txt('projects.form.assignees')}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 rounded border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700">
                <input type="checkbox" checked={assigned.includes(u.id)} onChange={() => toggleUser(u.id)} />
                <span className="text-zinc-800 dark:text-zinc-100">{userLabel(u)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-700"
          >
            {txt('projects.btn.cancel')}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? txt('projects.btn.saving') : mode === 'create' ? txt('projects.btn.create.confirm') : txt('projects.btn.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

