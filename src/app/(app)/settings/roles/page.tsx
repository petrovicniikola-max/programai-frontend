'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';
import { useTexts } from '@/lib/use-texts';

interface RoleRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
}

interface PermissionRow {
  resourceKey: string;
  label: string;
  groupKey: string | null;
  canView: boolean;
  canEdit: boolean;
}

interface RolePermissionsResponse {
  roleId: string;
  slug: string;
  isSystem: boolean;
  readOnly: boolean;
  permissions: PermissionRow[];
}

export default function SettingsRolesPage() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const txt = useTexts();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PermissionRow[]>([]);
  const [newSlug, setNewSlug] = useState('');
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['settings', 'roles'],
    queryFn: async () => {
      const res = await api.get<RoleRow[]>('/settings/roles');
      return res.data ?? [];
    },
  });

  const { data: matrix, isLoading: matrixLoading } = useQuery({
    queryKey: ['settings', 'roles', selectedId, 'permissions'],
    queryFn: async () => {
      const res = await api.get<RolePermissionsResponse>(
        `/settings/roles/${selectedId}/permissions`,
      );
      return res.data;
    },
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (!selectedId && roles.length > 0) setSelectedId(roles[0]!.id);
  }, [roles, selectedId]);

  useEffect(() => {
    if (Array.isArray(matrix?.permissions)) setDraft(matrix.permissions);
  }, [matrix]);

  const grouped = useMemo(() => {
    const groups = new Map<string, PermissionRow[]>();
    for (const row of Array.isArray(draft) ? draft : []) {
      const g = row.groupKey ?? '_root';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(row);
    }
    return groups;
  }, [draft]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      const res = await api.patch<RolePermissionsResponse>(
        `/settings/roles/${selectedId}/permissions`,
        {
          permissions: draft.map((p) => ({
            resourceKey: p.resourceKey,
            canView: p.canView,
            canEdit: p.canEdit,
          })),
        },
      );
      return res.data;
    },
    onSuccess: () => {
      showSuccess(txt('settings.roles.toast.saved'));
      void queryClient.invalidateQueries({ queryKey: ['settings', 'roles'] });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => showError(txt('settings.roles.toast.saveError')),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<RoleRow>('/settings/roles', {
        slug: newSlug,
        name: newName,
      });
      return res.data;
    },
    onSuccess: (role) => {
      showSuccess(txt('settings.roles.toast.created'));
      setShowCreate(false);
      setNewSlug('');
      setNewName('');
      void queryClient.invalidateQueries({ queryKey: ['settings', 'roles'] });
      if (role?.id) setSelectedId(role.id);
    },
    onError: () => showError(txt('settings.roles.toast.createError')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/settings/roles/${id}`);
    },
    onSuccess: () => {
      showSuccess(txt('settings.roles.toast.deleted'));
      setSelectedId(null);
      void queryClient.invalidateQueries({ queryKey: ['settings', 'roles'] });
    },
    onError: () => showError(txt('settings.roles.toast.deleteError')),
  });

  const setView = (key: string, value: boolean) => {
    setDraft((rows) =>
      rows.map((r) =>
        r.resourceKey === key
          ? { ...r, canView: value, canEdit: value ? r.canEdit : false }
          : r,
      ),
    );
  };

  const setEdit = (key: string, value: boolean) => {
    setDraft((rows) =>
      rows.map((r) =>
        r.resourceKey === key
          ? { ...r, canEdit: value, canView: value ? true : r.canView }
          : r,
      ),
    );
  };

  const selectedRole = roles.find((r) => r.id === selectedId);

  return (
    <div>
      <Link href="/settings" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        {txt('settings.back')}
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {txt('settings.roles.title')}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {txt('settings.roles.description')}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{txt('settings.roles.rolesHeading')}</h2>
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
            >
              {txt('settings.roles.btn.new')}
            </button>
          </div>
          {showCreate && (
            <div className="mb-3 space-y-2 rounded border border-dashed border-zinc-300 p-2 dark:border-zinc-600">
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder={txt('settings.roles.slug.placeholder')}
                className="w-full rounded border px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
              />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={txt('settings.roles.name.placeholder')}
                className="w-full rounded border px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={!newSlug.trim() || !newName.trim() || createMutation.isPending}
                className="w-full rounded bg-emerald-600 py-1 text-xs text-white disabled:opacity-50"
              >
                {txt('settings.roles.btn.create')}
              </button>
            </div>
          )}
          {rolesLoading ? (
            <p className="text-xs text-zinc-500">{txt('settings.roles.loading')}</p>
          ) : (
            <ul className="space-y-1">
              {roles.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full rounded px-2 py-1.5 text-left text-sm ${
                      selectedId === r.id
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="font-medium">{r.name}</span>
                    {r.isSystem && (
                      <span className="ml-1 text-[10px] uppercase text-zinc-400">{txt('settings.roles.badge.system')}</span>
                    )}
                    <span className="block text-xs text-zinc-500">{r.userCount} {txt('settings.roles.userCount')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
          {!selectedId ? (
            <p className="text-sm text-zinc-500">{txt('settings.roles.selectRole')}</p>
          ) : matrixLoading ? (
            <p className="text-sm text-zinc-500">{txt('settings.roles.matrixLoading')}</p>
          ) : matrix?.readOnly ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {txt('settings.roles.readOnly').replace('{name}', selectedRole?.name ?? '')}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-medium text-zinc-900 dark:text-zinc-50">{selectedRole?.name}</h2>
                  <p className="text-xs text-zinc-500">{selectedRole?.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/settings/users"
                    className="text-sm text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    {txt('settings.roles.assignUsers')}
                  </Link>
                  {!selectedRole?.isSystem && (
                    <button
                      type="button"
                      onClick={() => selectedId && deleteMutation.mutate(selectedId)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      {txt('settings.roles.btn.delete')}
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      <th className="py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">{txt('settings.roles.th.module')}</th>
                      <th className="py-2 text-center w-20">{txt('settings.roles.th.view')}</th>
                      <th className="py-2 text-center w-20">{txt('settings.roles.th.edit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...grouped.entries()].map(([group, rows]) => (
                      <Fragment key={group}>
                        {group !== '_root' && (
                          <tr key={`g-${group}`}>
                            <td colSpan={3} className="pt-3 pb-1 text-xs font-semibold uppercase text-zinc-400">
                              {group}
                            </td>
                          </tr>
                        )}
                        {rows.map((row) => (
                          <tr key={row.resourceKey} className="border-b border-zinc-100 dark:border-zinc-800">
                            <td className="py-2 pr-4">{row.label}</td>
                            <td className="py-2 text-center">
                              <input
                                type="checkbox"
                                checked={row.canView}
                                onChange={(e) => setView(row.resourceKey, e.target.checked)}
                              />
                            </td>
                            <td className="py-2 text-center">
                              <input
                                type="checkbox"
                                checked={row.canEdit}
                                disabled={!row.canView}
                                onChange={(e) => setEdit(row.resourceKey, e.target.checked)}
                              />
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="mt-4 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saveMutation.isPending ? txt('settings.roles.btn.saving') : txt('settings.roles.btn.save')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
