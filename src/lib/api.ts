import axios from 'axios';
import { getToken, getRefreshToken, setToken, setRefreshToken, clearToken } from './auth';
import { DEVICES_ENDPOINT, LICENCES_ENDPOINT } from './endpoints';

const baseURL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
    : process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

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
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }
  if (!process.env.NEXT_PUBLIC_API_BASE_URL && typeof window !== 'undefined' && !baseUrlWarned) {
    // Dev-only warning so it's obvious where backend URL dolazi
    // eslint-disable-next-line no-console
    console.warn(
      '[API] NEXT_PUBLIC_API_BASE_URL is not set. Using http://localhost:3001 as fallback (backend).',
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
  role: 'SUPER_ADMIN' | 'SUPPORT' | 'SALES' | 'USER' | 'ACCOUNTANT' | string;
  roleId?: string | null;
  roleName?: string | null;
  permissions?: Record<string, { view: boolean; edit: boolean }>;
  permissionsVersion?: number;
  tenantId: string | null;
  isPlatformAdmin?: boolean;
  isPlatformImpersonation?: boolean;
  avatarUrl?: string | null;
  jobTitle?: string | null;
}

export interface TenantUser {
  id: string;
  email: string;
  displayName: string | null;
  role: 'SUPER_ADMIN' | 'SUPPORT' | 'SALES' | 'USER' | 'ACCOUNTANT';
  isActive: boolean;
  createdAt: string;
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

export interface Distributor {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count?: { devices: number };
  // computed fields for main/sub distributor views
  totalDevices?: number;
  mainName?: string;
  subName?: string | null;
}

export interface Device {
  id: string;
  companyId: string | null;
  distributorId?: string | null;
  subDistributorName?: string | null;
  name: string | null;
  model: string | null;
  serialNo: string | null;
  status: string;
  notes: string | null;
  mdmProfileName?: string | null;
  updatedAt: string;
  company?: { id: string; name: string } | null;
  distributor?: { id: string; name: string } | null;
}

export interface TeronImportResult {
  created: number;
  updated: number;
  companiesCreated: number;
  distributorsCreated: number;
  licencesCreated: number;
  licencesUpdated: number;
  errors: { row: number; message: string }[];
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
  notes: string | null;
  updatedAt: string;
  company?: { id: string; name: string } | null;
  device?: { id: string; name: string | null; serialNo: string | null } | null;
}

export async function getDevices(params?: {
  companyId?: string;
  distributorId?: string;
  status?: string;
  search?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
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
  expiringFromDays?: number;
  expiringToDays?: number;
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

// Reports

export interface ReportsOverview {
  ticketsByStatus: Record<string, number>;
  ticketsByType: Record<string, number>;
  activeDevices: number;
  activeLicences: number;
  expiringLicences: Record<string, number>;
  expiringLicencesDays?: number[];
  companiesCount: number;
}

export interface AdminDashboardSlice {
  label: string;
  value: number;
}

export interface AdminPackageRow {
  productName: string;
  total: number;
}

export interface AdminDeviceModelRow {
  model: string;
  total: number;
  assigned: number;
  available: number;
  withDistributor: number;
  activeLicence: number;
  updated48h: number;
}

export interface AdminDashboardDto {
  generatedAt: string;
  summary: {
    companies: number;
    distributors: number;
    activeDevices: number;
    activeLicences: number;
    expiredLicences: number;
    ticketsOpen: number;
  };
  byDistributor: AdminDashboardSlice[];
  byModel: AdminDashboardSlice[];
  licenceCoverage: AdminDashboardSlice[];
  sufProduction: AdminDashboardSlice[];
  activePackages: AdminPackageRow[];
  devicesByModel: AdminDeviceModelRow[];
}

export async function getReportsOverview(): Promise<ReportsOverview> {
  const res = await api.get<ReportsOverview>('/reports/overview');
  return res.data;
}

export async function getAdminDashboard(): Promise<AdminDashboardDto> {
  const res = await api.get<AdminDashboardDto>('/reports/admin-dashboard');
  return res.data;
}

export type DashboardWidgetWidth = 'full' | 'half';

export interface DashboardWidgetConfig {
  id: string;
  visible: boolean;
  width: DashboardWidgetWidth;
}

export interface DashboardLayout {
  widgets: DashboardWidgetConfig[];
}

export async function getDashboardLayout(): Promise<DashboardLayout | null> {
  const res = await api.get<{ layout: DashboardLayout | null }>('/auth/dashboard-layout');
  return res.data?.layout ?? null;
}

export async function saveDashboardLayout(layout: DashboardLayout): Promise<DashboardLayout | null> {
  const res = await api.put<{ layout: DashboardLayout | null }>('/auth/dashboard-layout', layout);
  return res.data?.layout ?? null;
}

// Projects

export interface ProjectAssignment {
  userId: string;
  user?: { id: string; email: string; displayName: string | null };
}

export interface Project {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  companyId?: string | null;
  distributorId?: string | null;
  company?: { id: string; name: string } | null;
  distributor?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  assignments?: ProjectAssignment[];
}

export type ProjectWorkOrderType = 'REKLAMACIJA' | 'IMPLEMENTACIJA';

export interface ProjectWorkOrderLine {
  id: string;
  code: string;
  productName: string;
  unit: string;
  quantity: number;
  price: number;
  priceWithVat: number;
  sortOrder: number;
}

export interface WorkOrderArticle {
  code: string;
  productName: string;
  unit: string;
  price: number;
  priceWithVat: number;
}

export interface ProjectWorkOrder {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  description: string | null;
  type: ProjectWorkOrderType | null;
  contractNumber: string | null;
  requestedWork: string | null;
  performedWork: string | null;
  hours: number;
  workDate: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string; displayName: string | null };
  lines?: ProjectWorkOrderLine[];
}

export type CreateWorkOrderPayload = {
  title: string;
  description?: string;
  type: ProjectWorkOrderType;
  contractNumber?: string;
  requestedWork?: string;
  performedWork?: string;
  workDate?: string;
  today?: boolean;
  lines: { code: string; quantity: number }[];
};

export type UpdateWorkOrderPayload = {
  title?: string;
  description?: string;
  type?: ProjectWorkOrderType;
  contractNumber?: string;
  requestedWork?: string;
  performedWork?: string;
  workDate?: string;
  lines?: { code: string; quantity: number }[];
};

export interface ProjectStats {
  totalHours: number;
  hoursByUser: { userId: string; email: string; displayName: string | null; hours: number }[];
}

export async function getTenantUsers(): Promise<TenantUser[]> {
  const res = await api.get<TenantUser[]>('/settings/users');
  return res.data ?? [];
}

export async function getProjects(): Promise<Project[]> {
  const res = await api.get<Project[]>('/projects');
  return res.data ?? [];
}

export async function getProject(id: string): Promise<Project> {
  const res = await api.get<Project>(`/projects/${id}`);
  return res.data;
}

export async function createProject(dto: {
  name: string;
  startDate: string;
  endDate?: string | null;
  assignedUserIds?: string[];
  companyId?: string | null;
  distributorId?: string | null;
}): Promise<Project> {
  const res = await api.post<Project>('/projects', dto);
  return res.data;
}

export async function updateProject(
  id: string,
  dto: {
    name?: string;
    startDate?: string;
    endDate?: string | null;
    assignedUserIds?: string[];
    companyId?: string | null;
    distributorId?: string | null;
  },
): Promise<Project> {
  const res = await api.patch<Project>(`/projects/${id}`, dto);
  return res.data;
}

export async function deleteProject(id: string): Promise<{ ok: true }> {
  const res = await api.delete<{ ok: true }>(`/projects/${id}`);
  return res.data;
}

export async function getProjectWorkOrders(projectId: string): Promise<ProjectWorkOrder[]> {
  const res = await api.get<ProjectWorkOrder[]>(`/projects/${projectId}/work-orders`);
  return res.data ?? [];
}

export async function getWorkOrderArticles(): Promise<WorkOrderArticle[]> {
  const res = await api.get<WorkOrderArticle[]>('/projects/work-order-articles');
  return res.data ?? [];
}

export async function createProjectWorkOrder(
  projectId: string,
  dto: CreateWorkOrderPayload,
): Promise<ProjectWorkOrder> {
  const res = await api.post<ProjectWorkOrder>(`/projects/${projectId}/work-orders`, dto);
  return res.data;
}

export async function updateWorkOrder(
  id: string,
  dto: UpdateWorkOrderPayload,
): Promise<ProjectWorkOrder> {
  const res = await api.patch<ProjectWorkOrder>(`/work-orders/${id}`, dto);
  return res.data;
}

export async function deleteWorkOrder(id: string): Promise<{ ok: true }> {
  const res = await api.delete<{ ok: true }>(`/work-orders/${id}`);
  return res.data;
}

export async function getProjectStats(projectId: string): Promise<ProjectStats> {
  const res = await api.get<ProjectStats>(`/projects/${projectId}/stats`);
  return res.data;
}

export async function exportProjectWorkOrdersXlsx(projectId: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${baseURL}/projects/${projectId}/work-orders/export?format=xlsx`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ts = new Date().toISOString().replace('T', '_').slice(0, 19).replaceAll(':', '-');
  a.download = `radni-nalozi-${projectId}-${ts}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


