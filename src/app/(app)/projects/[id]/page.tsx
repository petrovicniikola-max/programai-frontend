'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProjectWorkOrder,
  deleteWorkOrder,
  exportProjectWorkOrdersXlsx,
  getProject,
  getProjectStats,
  getProjectWorkOrders,
  getWorkOrderArticles,
  updateWorkOrder,
  type CreateWorkOrderPayload,
  type ProjectStats,
  type ProjectWorkOrder,
  type ProjectWorkOrderType,
  type UpdateWorkOrderPayload,
  type WorkOrderArticle,
} from '@/lib/api';
import { usePermissions } from '@/hooks/use-permissions';
import { Modal } from '@/components/modal';
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

function typeLabel(type: ProjectWorkOrderType | null | undefined, txt: (k: string) => string) {
  if (type === 'REKLAMACIJA') return txt('workOrders.form.type.reklamacija');
  if (type === 'IMPLEMENTACIJA') return txt('workOrders.form.type.implementacija');
  return '—';
}

type LineDraft = { code: string; quantity: string };

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const txt = useTexts();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [edit, setEdit] = useState<ProjectWorkOrder | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setCreateOpen(false);
    setEdit(null);
  }, [projectId]);

  const { canEdit } = usePermissions();
  const canAdmin = canEdit('projects');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  });

  const { data: stats } = useQuery<ProjectStats>({
    queryKey: ['project', projectId, 'stats'],
    queryFn: () => getProjectStats(projectId),
    enabled: !!projectId,
  });

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['project', projectId, 'workOrders'],
    queryFn: () => getProjectWorkOrders(projectId),
    enabled: !!projectId,
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['workOrderArticles'],
    queryFn: getWorkOrderArticles,
  });

  const totalHours = stats?.totalHours ?? 0;
  const hoursByUser = stats?.hoursByUser ?? [];

  const createMut = useMutation({
    mutationFn: (dto: CreateWorkOrderPayload) => createProjectWorkOrder(projectId, dto),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project', projectId, 'workOrders'] });
      await queryClient.invalidateQueries({ queryKey: ['project', projectId, 'stats'] });
      setCreateOpen(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateWorkOrderPayload }) => updateWorkOrder(id, dto),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project', projectId, 'workOrders'] });
      await queryClient.invalidateQueries({ queryKey: ['project', projectId, 'stats'] });
      setEdit(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteWorkOrder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project', projectId, 'workOrders'] });
      await queryClient.invalidateQueries({ queryKey: ['project', projectId, 'stats'] });
    },
  });

  const assigneesLabel = useMemo(() => {
    const a = project?.assignments ?? [];
    if (!a.length) return '—';
    return a.map((x) => (x.user ? userLabel(x.user) : x.userId)).join(', ');
  }, [project?.assignments]);

  async function handleExport() {
    setExporting(true);
    try {
      await exportProjectWorkOrdersXlsx(projectId);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/projects"
          className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {txt('projectDetail.btn.back')}
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {exporting ? txt('projectDetail.btn.exporting') : txt('projectDetail.btn.exportExcel')}
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
          >
            {txt('projectDetail.btn.createWorkOrder')}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{project?.name ?? txt('projectDetail.title')}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {txt('projectDetail.meta')}
          {' '}
          {txt('projectDetail.meta.start')}: {fmtDate(project?.startDate)} · {txt('projectDetail.meta.end')}: {fmtDate(project?.endDate)} ·{' '}
          {txt('projectDetail.meta.assignees')}: {assigneesLabel}
        </p>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{txt('projectDetail.totalHours')}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{totalHours.toFixed(2)}</p>
        </div>
        <div className="md:col-span-2 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{txt('projectDetail.hoursByUser')}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {hoursByUser.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{txt('projectDetail.hoursByUser.empty')}</p>
            ) : (
              hoursByUser.map((u) => (
                <div key={u.userId} className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                  <span className="text-zinc-800 dark:text-zinc-100">{u.displayName || u.email}</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{u.hours.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <tr>
              <th className="px-3 py-2">{txt('workOrders.th.date')}</th>
              <th className="px-3 py-2">{txt('workOrders.th.title')}</th>
              <th className="px-3 py-2">{txt('workOrders.th.type')}</th>
              <th className="px-3 py-2">{txt('workOrders.th.contract')}</th>
              <th className="px-3 py-2">{txt('workOrders.th.user')}</th>
              <th className="px-3 py-2">{txt('workOrders.th.hours')}</th>
              <th className="px-3 py-2">{txt('workOrders.th.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400" colSpan={7}>
                  {txt('workOrders.loading')}
                </td>
              </tr>
            )}
            {!isLoading && workOrders.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400" colSpan={7}>
                  {txt('workOrders.empty')}
                </td>
              </tr>
            )}
            {workOrders.map((wo) => (
              <tr key={wo.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{fmtDate(wo.workDate)}</td>
                <td className="px-3 py-2 text-zinc-900 dark:text-zinc-50">
                  <div className="font-medium">{wo.title}</div>
                  {wo.performedWork || wo.requestedWork ? (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {wo.performedWork || wo.requestedWork}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{typeLabel(wo.type, txt)}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">{wo.contractNumber || '—'}</td>
                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">
                  {wo.user ? userLabel(wo.user) : wo.userId}
                </td>
                <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">{wo.hours.toFixed(2)}</td>
                <td className="px-3 py-2">
                  {canAdmin ? (
                    <div className="flex gap-2">
                      <button
                        className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        onClick={() => setEdit(wo)}
                      >
                        {txt('workOrders.btn.edit')}
                      </button>
                      <button
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                        onClick={() => deleteMut.mutate(wo.id)}
                      >
                        {txt('workOrders.btn.delete')}
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

      {(createOpen || !!edit) && (
        <WorkOrderModal
          open={createOpen || !!edit}
          onClose={() => {
            setCreateOpen(false);
            setEdit(null);
          }}
          mode={edit ? 'edit' : 'create'}
          initial={edit}
          articles={articles}
          txt={txt}
          busy={createMut.isPending || updateMut.isPending}
          onCreate={(dto) => createMut.mutate(dto)}
          onUpdate={(id, dto) => updateMut.mutate({ id, dto })}
        />
      )}
    </div>
  );
}

function WorkOrderModal({
  open,
  onClose,
  mode,
  initial,
  articles,
  txt,
  busy,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initial: ProjectWorkOrder | null;
  articles: WorkOrderArticle[];
  txt: (k: string) => string;
  busy: boolean;
  onCreate: (dto: CreateWorkOrderPayload) => void;
  onUpdate: (id: string, dto: UpdateWorkOrderPayload) => void;
}) {
  const defaultCode = articles[0]?.code ?? '';
  const [title, setTitle] = useState(initial?.title ?? '');
  const [type, setType] = useState<ProjectWorkOrderType>(initial?.type ?? 'REKLAMACIJA');
  const [contractNumber, setContractNumber] = useState(initial?.contractNumber ?? '');
  const [requestedWork, setRequestedWork] = useState(initial?.requestedWork ?? '');
  const [performedWork, setPerformedWork] = useState(initial?.performedWork ?? '');
  const [workDate, setWorkDate] = useState(() =>
    initial?.workDate ? new Date(initial.workDate).toISOString().slice(0, 10) : '',
  );
  const [lines, setLines] = useState<LineDraft[]>(() => {
    if (initial?.lines?.length) {
      return initial.lines.map((l) => ({ code: l.code, quantity: String(l.quantity) }));
    }
    return [{ code: defaultCode, quantity: '' }];
  });

  useEffect(() => {
    if (!defaultCode) return;
    setLines((prev) => {
      if (prev[0]?.code) return prev;
      return prev.map((l, i) => (i === 0 ? { ...l, code: defaultCode } : l));
    });
  }, [defaultCode]);

  const articleByCode = useMemo(() => new Map(articles.map((a) => [a.code, a])), [articles]);

  const hoursTotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const q = Number(l.quantity);
      return sum + (Number.isFinite(q) ? q : 0);
    }, 0);
  }, [lines]);

  function setToday() {
    setWorkDate(new Date().toISOString().slice(0, 10));
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    if (lines.length >= 2) return;
    const used = new Set(lines.map((l) => l.code).filter(Boolean));
    const next = articles.find((a) => !used.has(a.code));
    if (!next) return;
    setLines((prev) => [...prev, { code: next.code, quantity: '' }]);
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function availableCodesFor(index: number) {
    const usedElsewhere = new Set(lines.filter((_, i) => i !== index).map((l) => l.code).filter(Boolean));
    return articles.filter((a) => !usedElsewhere.has(a.code) || a.code === lines[index]?.code);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payloadLines = lines
      .map((l) => ({ code: l.code.trim(), quantity: Number(l.quantity) }))
      .filter((l) => l.code && Number.isFinite(l.quantity) && l.quantity > 0);
    if (!payloadLines.length) return;

    if (mode === 'create') {
      const dto: CreateWorkOrderPayload = {
        title: title.trim(),
        type,
        contractNumber: contractNumber.trim() || undefined,
        requestedWork: requestedWork.trim() || undefined,
        performedWork: performedWork.trim() || undefined,
        lines: payloadLines,
      };
      if (workDate) dto.workDate = workDate;
      onCreate(dto);
      return;
    }

    if (!initial) return;
    const dto: UpdateWorkOrderPayload = {
      title: title.trim(),
      type,
      contractNumber: contractNumber.trim() || undefined,
      requestedWork: requestedWork.trim() || undefined,
      performedWork: performedWork.trim() || undefined,
      lines: payloadLines,
    };
    if (workDate) dto.workDate = workDate;
    onUpdate(initial.id, dto);
  }

  const canAddLine =
    lines.length < 2 && articles.some((a) => !lines.some((l) => l.code === a.code));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? txt('workOrders.modal.create.title') : txt('workOrders.modal.edit.title')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {txt('workOrders.form.title')}
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder={txt('workOrders.form.title.placeholder')}
            required
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {txt('workOrders.form.type')}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProjectWorkOrderType)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="REKLAMACIJA">{txt('workOrders.form.type.reklamacija')}</option>
              <option value="IMPLEMENTACIJA">{txt('workOrders.form.type.implementacija')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {txt('workOrders.form.contractNumber')}
            </label>
            <input
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder={txt('workOrders.form.contractNumber.placeholder')}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {txt('workOrders.form.requestedWork')}
          </label>
          <textarea
            value={requestedWork}
            onChange={(e) => setRequestedWork(e.target.value)}
            rows={2}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder={txt('workOrders.form.requestedWork.placeholder')}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {txt('workOrders.form.performedWork')}
          </label>
          <textarea
            value={performedWork}
            onChange={(e) => setPerformedWork(e.target.value)}
            rows={2}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder={txt('workOrders.form.performedWork.placeholder')}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {txt('workOrders.form.hours')}
            </label>
            <input
              value={hoursTotal ? hoursTotal.toFixed(2) : ''}
              readOnly
              className="w-full rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{txt('workOrders.form.hours.hint')}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {txt('workOrders.form.date')}
            </label>
            <div className="flex gap-2">
              <input
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder={txt('workOrders.form.date.placeholder')}
              />
              <button
                type="button"
                onClick={setToday}
                className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {txt('workOrders.btn.today')}
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{txt('workOrders.form.date.hint')}</p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {txt('workOrders.form.lines')}
            </label>
            <button
              type="button"
              onClick={addLine}
              disabled={!canAddLine}
              className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {txt('workOrders.btn.addLine')}
            </button>
          </div>
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{txt('workOrders.form.lines.max')}</p>
          <div className="space-y-3">
            {lines.map((line, index) => {
              const article = articleByCode.get(line.code);
              const options = availableCodesFor(index);
              return (
                <div
                  key={index}
                  className="rounded border border-zinc-200 p-3 dark:border-zinc-700"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {txt('workOrders.form.lines.code')}
                      </label>
                      <select
                        value={line.code}
                        onChange={(e) => updateLine(index, { code: e.target.value })}
                        className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                        required
                      >
                        {!line.code && (
                          <option value="">{txt('workOrders.form.lines.select')}</option>
                        )}
                        {options.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} — {a.productName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {txt('workOrders.form.lines.quantity')}
                      </label>
                      <input
                        value={line.quantity}
                        onChange={(e) => updateLine(index, { quantity: e.target.value })}
                        inputMode="decimal"
                        className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                        placeholder="5"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <div>
                        <div className="mb-1">{txt('workOrders.form.lines.unit')}</div>
                        <div className="rounded border border-zinc-200 px-2 py-2 dark:border-zinc-700">
                          {article?.unit ?? '—'}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1">{txt('workOrders.form.lines.price')}</div>
                        <div className="rounded border border-zinc-200 px-2 py-2 dark:border-zinc-700">
                          {article ? article.price.toFixed(2) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1">{txt('workOrders.form.lines.priceVat')}</div>
                        <div className="rounded border border-zinc-200 px-2 py-2 dark:border-zinc-700">
                          {article ? article.priceWithVat.toFixed(2) : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                  {lines.length > 1 && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-xs text-red-600 hover:underline dark:text-red-400"
                      >
                        {txt('workOrders.btn.removeLine')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-700"
          >
            {txt('workOrders.btn.cancel')}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? txt('workOrders.btn.saving') : mode === 'create' ? txt('workOrders.btn.create.confirm') : txt('workOrders.btn.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
