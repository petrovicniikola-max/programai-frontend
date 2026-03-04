'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

interface Branding {
  brandName: string | null;
  primaryColour: string | null;
  logoUrl: string | null;
  emailSignature: string | null;
}

export default function SettingsBrandingPage() {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const [brandName, setBrandName] = useState('');
  const [primaryColour, setPrimaryColour] = useState('');
  const [emailSignature, setEmailSignature] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'branding'],
    queryFn: async () => {
      const res = await api.get<Branding>('/settings/branding');
      return res.data;
    },
  });

  useEffect(() => {
    if (data) {
      setBrandName(data.brandName ?? '');
      setPrimaryColour(data.primaryColour ?? '');
      setEmailSignature(data.emailSignature ?? '');
    }
  }, [data]);

  const patch = useMutation({
    mutationFn: async (body: Partial<Branding>) => {
      const res = await api.patch<Branding>('/settings/branding', body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'branding'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'branding'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to update branding');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    patch.mutate({
      brandName: brandName || undefined,
      primaryColour: primaryColour || undefined,
      emailSignature: emailSignature || undefined,
    });
  };

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post<Branding>('/settings/branding/logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'branding'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'branding'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      showError(e?.response?.data?.message ?? 'Failed to upload logo');
    },
    onSettled: () => setLogoUploading(false),
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/(png|jpe?g)$/i.test(file.type)) {
      showError('Dozvoljeni su samo PNG i JPG/JPEG fajlovi.');
      return;
    }
    setLogoUploading(true);
    const img = new Image();
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      if (width > 250 || height > 150) {
        showError('Logo je veći od 250x150 – server će ga automatski smanjiti pri uploadu.');
      }
      uploadLogo.mutate(file);
    };
    img.onerror = () => {
      setLogoUploading(false);
      showError('Ne mogu da pročitam sliku za logo.');
    };
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      } else {
        setLogoUploading(false);
        showError('Nevažeći sadržaj fajla.');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <Link href="/settings" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        ← Settings
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Branding / White-label</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">Brand name, colours, logo and email signature.</p>
      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Brand name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Primary colour
            </label>
            <input
              type="color"
              value={primaryColour || '#0d9488'}
              onChange={(e) => setPrimaryColour(e.target.value)}
              className="mt-1 h-9 w-20 cursor-pointer rounded border border-zinc-300 bg-transparent p-1 dark:border-zinc-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Logo slika (PNG/JPG, max 250×150)
            </label>
            {data?.logoUrl && (
              <div className="mt-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.logoUrl}
                  alt="Current logo"
                  className="h-10 w-auto rounded border border-zinc-300 bg-white object-contain dark:border-zinc-600"
                />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Trenutni logo</span>
              </div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleLogoChange}
              className="mt-2 block w-full text-sm text-zinc-600 file:mr-4 file:rounded file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100 dark:text-zinc-300 dark:file:bg-emerald-900/30 dark:file:text-emerald-300"
            />
            {logoUploading && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Uploading logo…</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email signature</label>
            <textarea
              value={emailSignature}
              onChange={(e) => setEmailSignature(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={patch.isPending}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {patch.isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  );
}
