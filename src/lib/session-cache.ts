import type { QueryClient } from '@tanstack/react-query';

let queryClient: QueryClient | null = null;

export function registerQueryClient(client: QueryClient): void {
  queryClient = client;
}

/** Drop cached API data when auth identity changes (login, logout, impersonation). */
export function clearSessionCache(): void {
  queryClient?.clear();
}
