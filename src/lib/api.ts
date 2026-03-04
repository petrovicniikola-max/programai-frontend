import axios from 'axios';
import { getToken, getRefreshToken, setToken, setRefreshToken, clearToken } from './auth';
import { DEVICES_ENDPOINT, LICENCES_ENDPOINT } from './endpoints';

const baseURL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

let baseUrlWarned = false;

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  isRefreshing = true;
  const currentRefresh = getRefreshToken();
  refreshPromise = (async () => {
    try {
      if (!currentRefresh) {
        // Cookie-based refresh – no body
        const res = await axios.post<{ access_token: string; refresh_token?: string }>(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const newAccess = res.data.access_token;
        if (newAccess) {
          setToken(newAccess);
        }
        if (res.data.refresh_token) {
          setRefreshToken(res.data.refresh_token);
        }
        return newAccess ?? null;
      }
      const res = await axios.post<{ access_token: string; refresh_token?: string }>(
        `${baseURL}/auth/refresh`,
        { refresh_token: currentRefresh },
      );
      const newAccess = res.data.access_token;
      if (newAccess) {
        setToken(newAccess);
      }
      if (res.data.refresh_token) {
        setRefreshToken(res.data.refresh_token);
      }
      return newAccess ?? null;
    } catch {
      clearToken();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (!process.env.NEXT_PUBLIC_API_BASE_URL && typeof window !== 'undefined' && !baseUrlWarned) {
    // Dev-only warning so it's obvious where backend URL dolazi
    // eslint-disable-next-line no-console
    console.warn(
      '[API] NEXT_PUBLIC_API_BASE_URL is not set. Using http://localhost:3000 as fallback base URL (dev only).',
    );
    baseUrlWarned = true;
  }
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err?.config;
    const status = err?.response?.status;

    if (typeof window !== 'undefined' && status === 404 && err?.config) {
      const url: string | undefined = err.config.url;
      const method = (err.config.method || 'get').toUpperCase();
      let fullUrl = url || '';
      if (url && !/^https?:/i.test(url)) {
        const base = baseURL.replace(/\/$/, '');
        fullUrl = url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
      }
      // eslint-disable-next-line no-console
      console.warn('[API 404]', method, fullUrl, 'status:', status, 'response:', err.response?.data);
    }

    if (typeof window !== 'undefined' && status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      }
      clearToken();
      window.location.href = '/login';
    }

    return Promise.reject(err);
  },
);

export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: 'SUPER_ADMIN' | 'SUPPORT' | 'SALES';
  tenantId: string | null;
  isPlatformAdmin?: boolean;
  isPlatformImpersonation?: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: User;
}

export interface PublicBranding {
  brandName: string | null;
  primaryColour: string | null;
  logoUrl: string | null;
}

// Devices / Licences helpers

export interface Device {
  id: string;
  companyId: string | null;
  name: string | null;
  model: string | null;
  serialNo: string | null;
  status: string;
  updatedAt: string;
  company?: { id: string; name: string } | null;
}

export interface Licence {
  id: string;
  companyId: string | null;
  deviceId: string | null;
  productName: string;
  licenceKey: string | null;
  status: string;
  validFrom: string | null;
  validTo: string;
  updatedAt: string;
  company?: { id: string; name: string } | null;
  device?: { id: string; name: string | null; serialNo: string | null } | null;
}

export async function getDevices(params?: {
  companyId?: string;
  status?: string;
  search?: string;
}): Promise<Device[]> {
  const res = await api.get<Device[]>(DEVICES_ENDPOINT, { params });
  return res.data;
}

export async function getLicences(params?: {
  companyId?: string;
  status?: string;
  validFrom?: string;
  validTo?: string;
  expiringInDays?: number;
}): Promise<Licence[]> {
  const res = await api.get<Licence[]>(LICENCES_ENDPOINT, { params });
  return res.data;
}

export async function getPublicBranding(tenantSlug?: string): Promise<PublicBranding> {
  const res = await api.get<PublicBranding>('/public/branding', {
    params: tenantSlug ? { tenantSlug } : undefined,
  });
  return res.data;
}


