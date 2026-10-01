'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, type User } from '@/lib/api';
import { canAccessPath, defaultHomeForRole } from '@/lib/permissions';

export function RoleRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<User>('/auth/me')).data,
  });

  useEffect(() => {
    if (!user?.role || !pathname) return;
    if (!canAccessPath(pathname, user.permissions, user.role)) {
      router.replace(defaultHomeForRole());
    }
  }, [user?.role, user?.permissions, pathname, router]);

  return <>{children}</>;
}
