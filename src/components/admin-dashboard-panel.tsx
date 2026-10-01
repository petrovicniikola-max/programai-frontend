'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  api,
  getAdminDashboard,
  getDashboardLayout,
  saveDashboardLayout,
  type AdminDashboardDto,
  type DashboardLayout,
  type DashboardWidgetConfig,
  type DashboardWidgetWidth,
} from '@/lib/api';

const PIE_COLORS = [
  '#22c55e',
  '#ef4444',
  '#3b82f6',
  '#eab308',
  '#a855f7',
  '#f97316',
  '#06b6d4',
  '#ec4899',
];

type WidgetDef = {
  id: string;
  title: string;
  defaultWidth: DashboardWidgetWidth;
};

const WIDGET_DEFS: WidgetDef[] = [
  { id: 'summary', title: 'Kartice — pregled', defaultWidth: 'full' },
  { id: 'pie:distributors', title: 'Zastupljenost po distributerima', defaultWidth: 'half' },
  { id: 'pie:models', title: 'Zastupljenost po modelima', defaultWidth: 'half' },
  { id: 'pie:coverage', title: 'Pokrivenost licencama', defaultWidth: 'half' },
  { id: 'pie:suf', title: 'SUF okruženje', defaultWidth: 'half' },
  { id: 'table:packages', title: 'Aktivni paketi', defaultWidth: 'full' },
  { id: 'table:devices', title: 'Uređaji po modelu', defaultWidth: 'full' },
  { id: 'widget:leave', title: 'Odsustva (moje stanje)', defaultWidth: 'half' },
  { id: 'widget:absent', title: 'Odsutni danas', defaultWidth: 'half' },
];

const WIDGET_DEF_MAP = new Map(WIDGET_DEFS.map((w) => [w.id, w]));

function defaultLayout(): DashboardWidgetConfig[] {
  return WIDGET_DEFS.map((w) => ({ id: w.id, visible: true, width: w.defaultWidth }));
}

/** Merge saved layout with widget catalog: keep saved order, append new widgets, drop unknown ids. */
function mergeLayout(saved: DashboardLayout | null | undefined): DashboardWidgetConfig[] {
  if (!saved?.widgets?.length) return defaultLayout();
  const known = new Set(WIDGET_DEFS.map((w) => w.id));
  const seen = new Set<string>();
  const merged: DashboardWidgetConfig[] = [];
  for (const w of saved.widgets) {
    if (!known.has(w.id) || seen.has(w.id)) continue;
    seen.add(w.id);
    merged.push({
      id: w.id,
      visible: w.visible !== false,
      width: w.width === 'half' ? 'half' : 'full',
    });
  }
  for (const def of WIDGET_DEFS) {
    if (!seen.has(def.id)) {
      merged.push({ id: def.id, visible: true, width: def.defaultWidth });
    }
  }
  return merged;
}

function formatNum(n: number): string {
  return n.toLocaleString('sr-RS');
}

function pieGradient(slices: { label: string; value: number }[]): string {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return 'conic-gradient(#e4e4e7 0deg 360deg)';
  let deg = 0;
  const parts: string[] = [];
  slices.forEach((slice, i) => {
    const span = (slice.value / total) * 360;
    const color = PIE_COLORS[i % PIE_COLORS.length]!;
    parts.push(`${color} ${deg}deg ${deg + span}deg`);
    deg += span;
  });
  return `conic-gradient(${parts.join(', ')})`;
}

function PieCard({
  title,
  slices,
  footer,
}: {
  title: string;
  slices: { label: string; value: number }[];
  footer?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <div className="h-full rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</h3>
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div
          className="h-28 w-28 shrink-0 rounded-full border border-zinc-200 dark:border-zinc-600"
          style={{ background: pieGradient(slices) }}
          role="img"
          aria-label={title}
        />
        <ul className="min-w-0 flex-1 space-y-1 text-xs">
          {slices.map((s, i) => (
            <li key={s.label} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <span className="truncate text-zinc-600 dark:text-zinc-400">{s.label}</span>
              </span>
              <span className="shrink-0 font-medium text-zinc-900 dark:text-zinc-100">
                {formatNum(s.value)}
              </span>
            </li>
          ))}
          {total === 0 && <li className="text-zinc-500">Nema podataka</li>}
        </ul>
      </div>
      {footer && <p className="mt-3 text-xs text-zinc-400">{footer}</p>}
    </div>
  );
}

function SummaryCard({ title, value, href }: { title: string; value: number; href?: string }) {
  const inner = (
    <div className="h-full rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {formatNum(value)}
      </p>
    </div>
  );
  if (href) return <Link href={href} className="block h-full hover:opacity-90">{inner}</Link>;
  return inner;
}

type LeaveBalances = {
  annual: { kind: string; availableDays: number; expiresAt: string }[];
  annualAvailable: number;
  personal: { available: number; total: number };
  paidAbsence: { available: number; total: number };
};

type AbsentToday = {
  date: string;
  absences: {
    requestId: string;
    displayName: string | null;
    email: string;
    jobTitle: string | null;
    type: string;
    startDate: string;
    endDate: string;
  }[];
};

function renderWidget(
  id: string,
  data: AdminDashboardDto,
  leave: LeaveBalances | undefined,
  absent: AbsentToday | undefined,
): React.ReactNode {
  switch (id) {
    case 'summary':
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <SummaryCard title="Kompanije" value={data.summary.companies} href="/clients" />
          <SummaryCard title="Distributeri" value={data.summary.distributors} href="/distributors" />
          <SummaryCard title="Aktivni uređaji" value={data.summary.activeDevices} href="/devices" />
          <SummaryCard title="Aktivne licence" value={data.summary.activeLicences} href="/licences" />
          <SummaryCard title="Istekle licence" value={data.summary.expiredLicences} href="/licences?status=EXPIRED" />
          <SummaryCard title="Otvoreni tiketi" value={data.summary.ticketsOpen} href="/tickets?status=OPEN" />
        </div>
      );
    case 'pie:distributors':
      return <PieCard title="Zastupljenost po distributerima" slices={data.byDistributor} footer="Aktivni uređaji po distributeru" />;
    case 'pie:models':
      return <PieCard title="Zastupljenost po modelima" slices={data.byModel} footer="Aktivni uređaji po modelu" />;
    case 'pie:coverage':
      return <PieCard title="Pokrivenost licencama" slices={data.licenceCoverage} footer="Uređaji sa / bez aktivne licence" />;
    case 'pie:suf':
      return (
        <PieCard
          title="SUF okruženje"
          slices={data.sufProduction.length > 0 ? data.sufProduction : [{ label: 'Nema podataka', value: 1 }]}
          footer="Produkciono vs test"
        />
      );
    case 'table:packages':
      return <PackagesTable data={data} />;
    case 'table:devices':
      return <DevicesTable data={data} />;
    case 'widget:leave':
      return <LeaveWidget leave={leave} />;
    case 'widget:absent':
      return <AbsentWidget absent={absent} />;
    default:
      return null;
  }
}

function PackagesTable({ data }: { data: AdminDashboardDto }) {
  const packages = data.activePackages.filter((p) => p.productName !== '__UKUPNO__');
  const total = packages.reduce((s, p) => s + p.total, 0);
  return (
    <div className="h-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Aktivni paketi</h3>
        <Link href="/licences" className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">Sve licence →</Link>
      </div>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-900/80">
            <tr>
              <th className="px-4 py-2 font-medium">Naziv paketa</th>
              <th className="px-4 py-2 font-medium text-right">Ukupno</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((p) => (
              <tr key={p.productName} className="border-t border-zinc-100 dark:border-zinc-700/60">
                <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">{p.productName}</td>
                <td className="px-4 py-2 text-right font-medium">{formatNum(p.total)}</td>
              </tr>
            ))}
            {packages.length === 0 && (
              <tr><td colSpan={2} className="px-4 py-6 text-center text-zinc-500">Nema aktivnih paketa</td></tr>
            )}
            {packages.length > 0 && (
              <tr className="border-t-2 border-amber-200 bg-amber-50/80 font-semibold dark:border-amber-800 dark:bg-amber-900/20">
                <td className="px-4 py-2">Svi paketi</td>
                <td className="px-4 py-2 text-right">{formatNum(total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DevicesTable({ data }: { data: AdminDashboardDto }) {
  const rows = data.devicesByModel.filter((r) => r.model !== '__UKUPNO__');
  const totals = data.devicesByModel.find((r) => r.model === '__UKUPNO__');
  return (
    <div className="h-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Uređaji po modelu</h3>
        <Link href="/devices" className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">Svi uređaji →</Link>
      </div>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-900/80">
            <tr>
              <th className="px-3 py-2 font-medium">Model</th>
              <th className="px-2 py-2 font-medium text-right">Uk.</th>
              <th className="px-2 py-2 font-medium text-right">Dod.</th>
              <th className="px-2 py-2 font-medium text-right">Slob.</th>
              <th className="px-2 py-2 font-medium text-right">Dist.</th>
              <th className="px-2 py-2 font-medium text-right">Lic.</th>
              <th className="px-2 py-2 font-medium text-right">48h</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.model} className="border-t border-zinc-100 dark:border-zinc-700/60">
                <td className="max-w-[8rem] truncate px-3 py-2 text-zinc-800 dark:text-zinc-200" title={r.model}>{r.model}</td>
                <td className="px-2 py-2 text-right">{formatNum(r.total)}</td>
                <td className="px-2 py-2 text-right">{formatNum(r.assigned)}</td>
                <td className="px-2 py-2 text-right">{formatNum(r.available)}</td>
                <td className="px-2 py-2 text-right">{formatNum(r.withDistributor)}</td>
                <td className="px-2 py-2 text-right">{formatNum(r.activeLicence)}</td>
                <td className="px-2 py-2 text-right">{formatNum(r.updated48h)}</td>
              </tr>
            ))}
            {totals && (
              <tr className="border-t-2 border-amber-200 bg-amber-50/80 font-semibold dark:border-amber-800 dark:bg-amber-900/20">
                <td className="px-3 py-2">Svi modeli</td>
                <td className="px-2 py-2 text-right">{formatNum(totals.total)}</td>
                <td className="px-2 py-2 text-right">{formatNum(totals.assigned)}</td>
                <td className="px-2 py-2 text-right">{formatNum(totals.available)}</td>
                <td className="px-2 py-2 text-right">{formatNum(totals.withDistributor)}</td>
                <td className="px-2 py-2 text-right">{formatNum(totals.activeLicence)}</td>
                <td className="px-2 py-2 text-right">{formatNum(totals.updated48h)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-400 dark:border-zinc-700">
        Dod. = dodeljen kompaniji · Slob. = bez kompanije · Dist. = ima distributera · Lic. = aktivna licenca · 48h = ažuriran u poslednja 48h
      </p>
    </div>
  );
}

function LeaveWidget({ leave }: { leave: LeaveBalances | undefined }) {
  return (
    <div className="h-full rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Odsustva</h3>
        <Link href="/leave" className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">Otvori →</Link>
      </div>
      <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{leave?.annualAvailable ?? '—'}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Godišnji odmor — dostupno dana</p>
      <div className="mt-2 flex gap-4 text-xs text-zinc-500">
        <span>Slobodni: {leave?.personal.available ?? '—'}/{leave?.personal.total ?? 5}</span>
        <span>Plaćeno: {leave?.paidAbsence.available ?? '—'}/{leave?.paidAbsence.total ?? 5}</span>
      </div>
    </div>
  );
}

function AbsentWidget({ absent }: { absent: AbsentToday | undefined }) {
  return (
    <div className="h-full rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Odsutni danas</h3>
        <Link href="/leave" className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">Otvori →</Link>
      </div>
      <ul className="space-y-1">
        {(absent?.absences ?? []).slice(0, 6).map((a) => (
          <li key={a.requestId} className="text-sm text-zinc-700 dark:text-zinc-300">
            {a.displayName ?? a.email}
            {a.jobTitle && <span className="ml-2 text-xs text-zinc-400">({a.jobTitle})</span>}
          </li>
        ))}
        {absent && absent.absences.length === 0 && (
          <li className="text-sm text-zinc-500">Niko nije na odobrenom odsustvu danas.</li>
        )}
      </ul>
    </div>
  );
}

function widthClass(width: DashboardWidgetWidth): string {
  return width === 'half' ? 'w-full lg:w-[calc(50%-0.5rem)]' : 'w-full';
}

function SortableWidget({
  config,
  onToggleVisible,
  onToggleWidth,
}: {
  config: DashboardWidgetConfig;
  onToggleVisible: (id: string) => void;
  onToggleWidth: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: config.id,
  });
  const def = WIDGET_DEF_MAP.get(config.id);
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className={widthClass(config.width)}>
      <div
        className={`rounded-lg border-2 border-dashed p-3 ${
          config.visible
            ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-900/10'
            : 'border-zinc-300 bg-zinc-100/60 dark:border-zinc-600 dark:bg-zinc-800/40'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="flex min-w-0 cursor-grab items-center gap-2 text-left active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <span className="text-zinc-400" aria-hidden>⠿</span>
            <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {def?.title ?? config.id}
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleWidth(config.id)}
              className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-600 dark:text-zinc-300"
              title="Širina"
            >
              {config.width === 'half' ? '½' : '1／1'}
            </button>
            <button
              type="button"
              onClick={() => onToggleVisible(config.id)}
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                config.visible
                  ? 'bg-emerald-600 text-white'
                  : 'border border-zinc-300 text-zinc-500 dark:border-zinc-600'
              }`}
            >
              {config.visible ? 'Vidljiv' : 'Skriven'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboardContent({
  data,
  leave,
  absent,
  layout,
}: {
  data: AdminDashboardDto;
  leave: LeaveBalances | undefined;
  absent: AbsentToday | undefined;
  layout: DashboardWidgetConfig[];
}) {
  const visible = layout.filter((w) => w.visible);
  return (
    <div className="flex flex-wrap gap-4">
      {visible.map((w) => (
        <div key={w.id} className={widthClass(w.width)}>
          {renderWidget(w.id, data, leave, absent)}
        </div>
      ))}
    </div>
  );
}

export function AdminDashboardPanel() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DashboardWidgetConfig[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['reports', 'admin-dashboard'],
    queryFn: getAdminDashboard,
    staleTime: 6 * 60 * 60 * 1000,
  });

  const { data: savedLayout } = useQuery({
    queryKey: ['dashboard-layout'],
    queryFn: getDashboardLayout,
    staleTime: 60 * 60 * 1000,
  });

  const { data: leave } = useQuery({
    queryKey: ['leave', 'balances', 'me'],
    queryFn: async () => {
      const res = await api.get<LeaveBalances>('/leave/balances/me');
      return res.data;
    },
    staleTime: 60_000,
  });

  const { data: absent } = useQuery({
    queryKey: ['leave', 'absent-today'],
    queryFn: async () => {
      const res = await api.get<AbsentToday>('/leave/absent-today');
      return res.data;
    },
    staleTime: 60_000,
  });

  const currentLayout = useMemo(() => mergeLayout(savedLayout), [savedLayout]);

  const saveMutation = useMutation({
    mutationFn: (widgets: DashboardWidgetConfig[]) => saveDashboardLayout({ widgets }),
    onSuccess: (layout) => {
      queryClient.setQueryData(['dashboard-layout'], layout);
      setEditing(false);
    },
  });

  function startEditing() {
    setDraft(currentLayout);
    setEditing(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraft((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  function toggleVisible(id: string) {
    setDraft((items) => items.map((i) => (i.id === id ? { ...i, visible: !i.visible } : i)));
  }

  function toggleWidth(id: string) {
    setDraft((items) =>
      items.map((i) => (i.id === id ? { ...i, width: i.width === 'half' ? 'full' : 'half' } : i)),
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
        <p className="text-sm text-zinc-500">Učitavanje kontrolne table…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
        <p className="text-sm text-red-700 dark:text-red-300">Nije moguće učitati kontrolnu tablu.</p>
        <button type="button" onClick={() => refetch()} className="mt-2 text-sm text-emerald-600 hover:underline dark:text-emerald-400">
          Pokušaj ponovo
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {editing
            ? 'Prevuci kartice da promeniš redosled · širina ½/pun · Vidljiv/Skriven'
            : `Agregirani pregled${isFetching && !isLoading ? ' · osvežavanje…' : ''}`}
        </p>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => setDraft(defaultLayout())}
                className="rounded border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-600"
              >
                Vrati podrazumevano
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-600"
              >
                Otkaži
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate(draft)}
                disabled={saveMutation.isPending}
                className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
              >
                {saveMutation.isPending ? 'Čuvanje…' : 'Sačuvaj raspored'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="rounded border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-600"
              >
                Osveži
              </button>
              <button
                type="button"
                onClick={startEditing}
                className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
              >
                Prilagodi
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={draft.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-4">
              {draft.map((w) => (
                <SortableWidget
                  key={w.id}
                  config={w}
                  onToggleVisible={toggleVisible}
                  onToggleWidth={toggleWidth}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <AdminDashboardContent data={data} leave={leave} absent={absent} layout={currentLayout} />
      )}
    </div>
  );
}
