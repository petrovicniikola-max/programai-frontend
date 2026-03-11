'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, type LoginResponse, getPublicBranding, type PublicBranding } from '@/lib/api';
import { setToken, setRefreshToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const defaultBranding: PublicBranding = { brandName: 'CRM ESTUAR', primaryColour: null, logoUrl: null };
  const { data: branding } = useQuery<PublicBranding>({
    queryKey: ['public', 'branding'],
    queryFn: async () => {
      try {
        return await getPublicBranding();
      } catch {
        return defaultBranding;
      }
    },
    retry: false,
    staleTime: 60_000,
    placeholderData: defaultBranding,
  });
  const effectiveBranding = branding ?? defaultBranding;

  useEffect(() => {
    if (effectiveBranding.brandName && typeof document !== 'undefined') {
      document.title = effectiveBranding.brandName;
    }
  }, [effectiveBranding.brandName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>('/auth/login', { email, password });
      const token = res.data.access_token;
      if (token) {
        setToken(token);
        if (res.data.refresh_token) {
          setRefreshToken(res.data.refresh_token);
        } else {
          setRefreshToken(null);
        }
        router.push('/dashboard');
        router.refresh();
      } else {
        setError('No token received');
      }
    } catch (err: unknown) {
      let msg = 'Login failed';
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { message?: string | string[] }; status?: number } })
          .response;
        if (res?.data?.message) {
          const m = res.data.message;
          msg = Array.isArray(m) ? m.join(', ') : m;
        } else if (res?.status === 401) {
          msg = 'Invalid email or password';
        }
      } else if (err && typeof err === 'object' && 'message' in err && typeof (err as Error).message === 'string') {
        msg = (err as Error).message;
      } else if (err && typeof err === 'object' && 'code' in err) {
        const code = (err as { code?: string }).code;
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
        if (code === 'ERR_NETWORK' || code === 'ERR_EMPTY_RESPONSE' || !(err as { response?: unknown }).response) {
          msg = `Server did not respond. Is the backend running at ${base}?`;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const brandName = effectiveBranding.brandName?.trim() || 'CRM ESTUAR';
  const brandColour = effectiveBranding.primaryColour ?? undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-900">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-4 flex flex-col items-center gap-2">
          {effectiveBranding.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={effectiveBranding.logoUrl}
              alt={brandName}
              className="h-10 w-auto rounded-sm border border-zinc-200 bg-white object-contain dark:border-zinc-700"
            />
          )}
          <h1
            className="text-xl font-semibold text-zinc-900 dark:text-zinc-50"
            style={brandColour ? { color: brandColour } : undefined}
          >
            {brandName} – Login
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded px-4 py-2 font-medium text-white disabled:opacity-50"
            style={{
              backgroundColor: brandColour || '#18181b',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
