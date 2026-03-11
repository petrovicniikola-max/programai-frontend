'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DEVICE_MODELS, getMdmProfilesForModel, getDefaultMdmProfileForModel } from '@/lib/mdm-profiles';
import { useToast } from '@/components/toast';

const SUF_OPTIONS = ['produkciono', 'test'] as const;
const EFAKTURA_OPTIONS = ['produkciono', 'test'] as const;
const ACCOUNT_SYNC_OPTIONS = ['isključena', 'uključena'] as const;

export default function AddDevicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const companyIdFromUrl = searchParams.get('companyId') ?? '';

  const [distributer, setDistributer] = useState('');
  const [podDistributer, setPodDistributer] = useState('');
  const [companyId, setCompanyId] = useState(companyIdFromUrl);
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [mdmProfileName, setMdmProfileName] = useState('');
  const [testDevice, setTestDevice] = useState(false);
  const [dpu, setDpu] = useState(false);
  const [sufEnvironment, setSufEnvironment] = useState<string>('produkciono');
  const [eFakturaEnvironment, setEFakturaEnvironment] = useState<string>('produkciono');
  const [paymentType, setPaymentType] = useState('');
  const [accountSync, setAccountSync] = useState<string>('isključena');
  const [teronPaymentGateway, setTeronPaymentGateway] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyIdFromUrl) setCompanyId(companyIdFromUrl);
  }, [companyIdFromUrl]);

  const mdmProfiles = getMdmProfilesForModel(model);
  useEffect(() => {
    if (model && mdmProfiles.length > 0) {
      const nextDefault = getDefaultMdmProfileForModel(model);
      setMdmProfileName((prev) => (mdmProfiles.some((p) => p.value === prev) ? prev : nextDefault));
    } else {
      setMdmProfileName('');
    }
  }, [model]);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await api.get<{ id: string; name: string }[]>('/companies');
      return res.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      await api.post('/devices', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      router.push('/devices');
      showSuccess('Uređaj je sačuvan.');
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || 'Kreiranje uređaja nije uspelo.');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    createMutation.mutate({
      companyId: companyId.trim() || undefined,
      name: name.trim() || undefined,
      model: model.trim() || undefined,
      serialNo: serialNo.trim() || undefined,
      status: 'ACTIVE',
      mdmProfileName: mdmProfileName.trim() || undefined,
      testDevice,
      dpu,
      sufEnvironment: sufEnvironment || undefined,
      eFakturaEnvironment: eFakturaEnvironment || undefined,
      paymentType: paymentType.trim() || undefined,
      accountSync: accountSync || undefined,
      teronPaymentGateway,
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Uređaji / Dodaj</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}

        {/* Glavni podaci */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Distributer</label>
              <input
                type="text"
                value={distributer}
                onChange={(e) => setDistributer(e.target.value)}
                placeholder="—"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Pod-distributer</label>
              <input
                type="text"
                value={podDistributer}
                onChange={(e) => setPodDistributer(e.target.value)}
                placeholder="—"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Naziv korisnika</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                <option value="">—</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Naziv uređaja (opciono)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Model uređaja</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                <option value="">—</option>
                {DEVICE_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Serijski broj</label>
              <input
                type="text"
                value={serialNo}
                onChange={(e) => setSerialNo(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Dodaci</label>
              <input
                type="text"
                value="nije dostupno"
                readOnly
                className="w-full rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              />
            </div>
          </div>
        </section>

        {/* Memorandum firme */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <span className="text-lg">📄</span> Memorandum firme
          </h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nova slika</label>
            <input type="file" accept="image/*" className="text-sm text-zinc-600 dark:text-zinc-400" />
          </div>
        </section>

        {/* MDM profili – zavisi od modela uređaja */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <span className="text-lg">⚙️</span> MDM profili
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Naziv profila</label>
              <select
                value={mdmProfileName}
                onChange={(e) => setMdmProfileName(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                <option value="">— izaberite model uređaja</option>
                {mdmProfiles.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              {model && mdmProfiles.length === 0 && (
                <p className="mt-1 text-xs text-zinc-500">Nema definisanih MDM profila za ovaj model.</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Dodaci</label>
              <input
                type="text"
                value="nije dostupno"
                readOnly
                className="w-full rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              />
            </div>
          </div>
        </section>

        {/* Podešavanja uređaja */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <span className="text-lg">⚙️</span> Podešavanja uređaja
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="testDevice"
                checked={testDevice}
                onChange={(e) => setTestDevice(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <label htmlFor="testDevice" className="text-sm text-zinc-700 dark:text-zinc-300">Testni uređaj</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dpu"
                checked={dpu}
                onChange={(e) => setDpu(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <label htmlFor="dpu" className="text-sm text-zinc-700 dark:text-zinc-300">DPU</label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">SUF okruženje</label>
              <select
                value={sufEnvironment}
                onChange={(e) => setSufEnvironment(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                {SUF_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">eFaktura okruženje</label>
              <select
                value={eFakturaEnvironment}
                onChange={(e) => setEFakturaEnvironment(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                {EFAKTURA_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tip plaćanja</label>
              <input
                type="text"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                placeholder="—"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Sinhronizacija računa</label>
              <select
                value={accountSync}
                onChange={(e) => setAccountSync(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                {ACCOUNT_SYNC_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="teronPaymentGateway"
                checked={teronPaymentGateway}
                onChange={(e) => setTeronPaymentGateway(e.target.checked)}
                className="rounded border-zinc-300"
              />
              <label htmlFor="teronPaymentGateway" className="text-sm text-zinc-700 dark:text-zinc-300">Teron Payment Gateway – aktivan</label>
            </div>
          </div>
        </section>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Čuvanje…' : 'Sačuvaj'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200"
          >
            Nazad
          </button>
        </div>
      </form>
    </div>
  );
}
