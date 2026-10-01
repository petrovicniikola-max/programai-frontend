'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type User } from '@/lib/api';
import {
  canEditResource,
  canViewResource,
  isSuperAdmin,
  type PermissionMap,
} from '@/lib/permissions';

export function usePermissions() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<User>('/auth/me')).data,
  });

  const role = user?.role;
  const permissions: PermissionMap | undefined = user?.permissions;

  return {
    user,
    role,
    permissions,
    permissionsVersion: user?.permissionsVersion ?? 0,
    isSuperAdmin: isSuperAdmin(role),
    canView: (resource: string) => canViewResource(permissions, resource, role),
    canEdit: (resource: string) => canEditResource(permissions, resource, role),
  };
}
