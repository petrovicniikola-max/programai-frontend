'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

type AiReport = {
  id: string;
  title: string;
  promptText: string;
  templateKey: string;
  params?: unknown;
  createdAt: string;
};

type GenerateResponse = {
  report: AiReport;
  confidence: number;
};

type ReportTable = {
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number | null>[];
  meta?: Record<string, string | number | boolean | null>;
};

const MONTH_OPTIONS = [
  { value: '', label: 'Cela godina' },
  { value: '1', label: 'Januar' },
  { value: '2', label: 'Februar' },
  { value: '3', label: 'Mart' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Maj' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Jul' },
  { value: '8', label: 'Avgust' },
  { value: '9', label: 'Septembar' },
  { value: '10', label: 'Oktobar' },
  { value: '11', label: 'Novembar' },
  { value: '12', label: 'Decembar' },
];

function reportSupportsPeriod(params: unknown): boolean {
  if (!params || typeof params !== 'object') return false;
  return 'year' in params || 'month' in params;
}

const EXAMPLE_PROMPTS = [
  {
    group: 'Evidencija rada',
    items: [
      'Evidencija rada – mesečni izveštaj sati po korisniku i projektu za jun 2026.',
      'Evidencija rada – sati po korisniku i projektu za Q2 2026.',
      'Utrošeno vreme na projektu Implementacija CRM – po korisniku za maj 2026.',
      'Korisnici dodeljeni projektima koji nisu uneli evidenciju rada u junu 2026.',
      'Projekti gde je utrošeno više od 100 sati u maju 2026.',
      'Evidencija rada po korisniku i projektu za poslednjih 7 dana.',
      'Utrošeno vreme po projektu u poslednjih 30 dana.',
      'Evidencija rada – radni nalozi Excel sa partnerom, tipom, ugovorom i artiklima za jun 2026.',
    ],
  },
  {
    group: 'Tiketi',
    items: [
      'Broj otvorenih tiketa po korisniku podrške.',
      'Tiketi u statusu OPEN stariji od 14 dana, po kompaniji.',
      'Tiketi po tipu (CALL, SUPPORT, FIELD) u poslednjih 30 dana.',
    ],
  },
  {
    group: 'Licence i uređaji',
    items: [
      'Licence koje ističu u narednih 30 dana, po kompaniji.',
      'Aktivni uređaji bez aktivne licence.',
      'Novo registrovani uređaji u poslednjih 30 dana, po distributeru.',
      'Aktivne licence u poslednjih 30 dana.',
      'Koji distributer ima najviše aktivnih licenci u poslednjih 30 dana.',
      'Koliko licenci je isteklo po distributeru u poslednja 3 dana (48 sati)? Samo EXPIRED po datumu isteka.',
      'Istekle licence (EXPIRED) po distributeru u poslednja 3 dana, sa detaljima po kompaniji i uređaju.',
    ],
  },
  {
    group: 'Prodaja',
    items: [
      'Sales import redovi bez povezane kompanije u poslednjih 30 dana.',
      'Kompanije u sales direktorijumu bez email adrese.',
      'Poredi mailove distributerima sa kompanijama po PIB i MB.',
    ],
  },
  {
    group: 'Odsustva',
    items: [
      'Odobrena odsustva u 2026 – po korisniku i tipu.',
      'Odobrena odsustva u avgustu 2026 – po korisniku i tipu.',
      'Korisnici sa preostalim godišnjim odmorom ispod 5 dana.',
    ],
  },
  {
    group: 'Kompanije',
    items: [
      'Kompanije bez tiketa u poslednjih 90 dana.',
      'Top 20 kompanija po broju aktivnih uređaja.',
      'Aktivni korisnici u poslednjih 60 dana.',
    ],
  },
];

export default function ReportsGeneratorPage() {
  const queryClient = useQueryClient();
  const [promptText, setPromptText] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [periodMonth, setPeriodMonth] = useState('');
  const [recipientsText, setRecipientsText] = useState('');
  const [scheduleType, setScheduleType] = useState<
    | 'DAILY'
    | 'EVERY_7_DAYS'
    | 'EVERY_15_DAYS'
    | 'MONTHLY_FIRST_DAY'
    | 'MONTHLY_LAST_DAY'
  >('DAILY');
  const [scheduleTime, setScheduleTime] = useState('08:00');

  const recipients = useMemo(
    () =>
      recipientsText
        .split(/[,\n;]/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [recipientsText],
  );

  const { data: reports, refetch: refetchReports } = useQuery({
    queryKey: ['reports', 'ai', 'list'],
    queryFn: async () => {
      const res = await api.get<AiReport[]>('/reports/ai');
      return res.data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<GenerateResponse>('/reports/ai/generate', { promptText });
      return res.data;
    },
    onSuccess: async (data) => {
      setSelectedReportId(data.report.id);
      await refetchReports();
    },
  });

  const selectedReport = useMemo(
    () => (reports ?? []).find((r) => r.id === selectedReportId),
    [reports, selectedReportId],
  );

  const showPeriodControls = reportSupportsPeriod(selectedReport?.params);

  useEffect(() => {
    const p = selectedReport?.params as Record<string, unknown> | undefined;
    if (!p) return;
    if (p.year != null && Number.isFinite(Number(p.year))) {
      setPeriodYear(Number(p.year));
    }
    setPeriodMonth(p.month != null && Number.isFinite(Number(p.month)) ? String(p.month) : '');
  }, [selectedReportId, selectedReport?.params]);

  const periodMutation = useMutation({
    mutationFn: async () => {
      const body: { year: number; month?: number | null } = { year: periodYear };
      body.month = periodMonth === '' ? null : Number(periodMonth);
      const res = await api.patch<AiReport>(`/reports/ai/${selectedReportId}/period`, body);
      return res.data;
    },
    onSuccess: async () => {
      await refetchReports();
      await queryClient.invalidateQueries({
        queryKey: ['reports', 'ai', 'preview', selectedReportId],
      });
    },
  });

  const { data: preview, isLoading: previewLoading, error: previewError } = useQuery({
    queryKey: ['reports', 'ai', 'preview', selectedReportId],
    queryFn: async () => {
      const res = await api.get<ReportTable>(`/reports/ai/${selectedReportId}/preview`);
      return res.data;
    },
    enabled: !!selectedReportId,
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/reports/ai/${selectedReportId}/schedules`, {
        recipients,
        scheduleType,
        scheduleTime,
        isActive: true,
      });
      return res.data;
    },
    onSuccess: () => {
      // best-effort refresh list so user sees changes
      refetchReports();
    },
  });

  async function exportReport(format: 'csv' | 'xlsx') {
    const token = getToken();
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    const res = await fetch(`${base}/reports/ai/${selectedReportId}/export?format=${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // backend already returns Content-Disposition filename; this is a fallback
    const ts = new Date().toISOString().replace('T', '_').slice(0, 19).replaceAll(':', '-');
    a.download = `CRM-Estuar-${ts}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">AI</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Unesi šta želiš da vidiš ili klikni na primer ispod.
        </p>
        <details className="mt-3 rounded border border-zinc-200 dark:border-zinc-700">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Primeri promptova ({EXAMPLE_PROMPTS.reduce((n, g) => n + g.items.length, 0)})
          </summary>
          <div className="max-h-72 space-y-3 overflow-y-auto border-t border-zinc-200 px-3 py-3 dark:border-zinc-700">
            {EXAMPLE_PROMPTS.map((group) => (
              <div key={group.group}>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {group.group}
                </p>
                <ul className="mt-1 space-y-1">
                  {group.items.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => setPromptText(item)}
                        className="w-full rounded px-2 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={4}
            placeholder="Unesi zahtev za izveštaj…"
            className="w-full rounded border border-zinc-300 p-3 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => generateMutation.mutate()}
              disabled={!promptText.trim() || generateMutation.isPending}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {generateMutation.isPending ? 'Generišem…' : 'Generiši'}
            </button>
            {generateMutation.error && (
              <span className="text-sm text-red-600 dark:text-red-400">
                {(generateMutation.error as Error).message}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Sačuvani izveštaji</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Izaberi izveštaj za preview/export/schedule.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetchReports()}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
          >
            Osveži
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={selectedReportId}
            onChange={(e) => setSelectedReportId(e.target.value)}
            className="min-w-[320px] rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">— izaberi —</option>
            {(reports ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedReportId}
            onClick={() => exportReport('csv')}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-600"
          >
            Export CSV
          </button>
          <button
            type="button"
            disabled={!selectedReportId}
            onClick={() => exportReport('xlsx')}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-600"
          >
            Export XLSX
          </button>
        </div>

        {showPeriodControls && (
          <div className="mt-4 rounded border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Period izveštaja</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Godina + „Cela godina” = svi meseci; izaberi mesec za uži opseg.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400">Godina</label>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={periodYear}
                  onChange={(e) => setPeriodYear(Number(e.target.value))}
                  className="w-28 rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400">Mesec</label>
                <select
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  className="min-w-[160px] rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value || 'all'} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!selectedReportId || periodMutation.isPending}
                onClick={() => periodMutation.mutate()}
                className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {periodMutation.isPending ? 'Primena…' : 'Primeni period'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4">
          {previewLoading && <p className="text-sm text-zinc-500 dark:text-zinc-400">Učitavanje…</p>}
          {previewError && (
            <p className="text-sm text-red-600 dark:text-red-400">Greška pri učitavanju preview-a.</p>
          )}
          {preview && (
            <div className="overflow-auto rounded border border-zinc-200 dark:border-zinc-700">
              <table className="min-w-[800px] w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                  <tr>
                    {preview.columns.map((c) => (
                      <th key={c.key} className="px-3 py-2 font-medium">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-zinc-100 dark:border-zinc-800">
                      {preview.columns.map((c) => (
                        <td key={c.key} className="px-3 py-2 text-zinc-700 dark:text-zinc-200">
                          {row[c.key] == null ? '—' : String(row[c.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length === 0 && (
                <p className="p-4 text-sm text-zinc-500 dark:text-zinc-400">Nema rezultata.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Zakazivanje na email</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Dodaj primaoce i period slanja za izabrani izveštaj.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Primaoci (razdvoj zarezom ili novim redom)
            </label>
            <textarea
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              rows={2}
              placeholder="npr. prodaja@firma.rs, direktor@firma.rs"
              className="w-full rounded border border-zinc-300 p-3 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Period</label>
            <select
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as any)}
              className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="DAILY">Svakog dana</option>
              <option value="EVERY_7_DAYS">Svakih 7 dana</option>
              <option value="EVERY_15_DAYS">Svakih 15 dana</option>
              <option value="MONTHLY_FIRST_DAY">Prvog dana u mesecu</option>
              <option value="MONTHLY_LAST_DAY">Poslednjeg dana u mesecu</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Vreme (HH:mm)</label>
            <input
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="08:00"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={!selectedReportId || recipients.length === 0 || scheduleMutation.isPending}
            onClick={() => scheduleMutation.mutate()}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {scheduleMutation.isPending ? 'Čuvam…' : 'Sačuvaj schedule'}
          </button>
          <button
            type="button"
            disabled={!selectedReportId}
            onClick={async () => {
              // Note: run-once endpoint expects scheduleId; use it after schedule creation.
              await Promise.resolve();
            }}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-600"
            title="Run-once radi nad scheduleId (posle kreiranja schedule-a)."
          >
            Run now (debug)
          </button>
        </div>
      </div>
    </div>
  );
}

