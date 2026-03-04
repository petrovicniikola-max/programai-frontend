const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const PLATFORM_ACCESS_TOKEN_KEY = 'platform_access_token';
const IMPERSONATION_FLAG_KEY = 'is_impersonating';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(PLATFORM_ACCESS_TOKEN_KEY);
  localStorage.removeItem(IMPERSONATION_FLAG_KEY);
}

export function startImpersonation(impersonationToken: string): void {
  if (typeof window === 'undefined') return;
  const currentAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (currentAccess) {
    localStorage.setItem(PLATFORM_ACCESS_TOKEN_KEY, currentAccess);
  }
  localStorage.setItem(ACCESS_TOKEN_KEY, impersonationToken);
  localStorage.setItem(IMPERSONATION_FLAG_KEY, 'true');
}

export function stopImpersonation(): void {
  if (typeof window === 'undefined') return;
  const platformToken = localStorage.getItem(PLATFORM_ACCESS_TOKEN_KEY);
  if (platformToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, platformToken);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  localStorage.removeItem(PLATFORM_ACCESS_TOKEN_KEY);
  localStorage.removeItem(IMPERSONATION_FLAG_KEY);
}

export function isImpersonating(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(IMPERSONATION_FLAG_KEY) === 'true';
}

