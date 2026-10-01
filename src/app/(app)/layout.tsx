import { AppShell } from '@/components/app-shell';
import { RoleRouteGuard } from '@/components/role-route-guard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <RoleRouteGuard>{children}</RoleRouteGuard>
    </AppShell>
  );
}
