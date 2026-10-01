export type PermissionEntry = { view: boolean; edit: boolean };
export type PermissionMap = Record<string, PermissionEntry>;

export const SUPER_ADMIN_SLUG = 'SUPER_ADMIN';

export type NavItem = {
  href: string;
  labelKey: string;
  resourceKey: string;
  /** Sakriveno svima osim SUPER_ADMIN, isto kao tabovi u izveštajima. */
  superAdminOnly?: boolean;
  /** Drugo pravo koje takođe otvara stavku (npr. pregled svih putnih naloga). */
  altResourceKey?: string;
};

export type NavGroup = {
  id: string;
  labelKey: string;
  items: NavItem[];
};

export const APP_NAV_GROUPS: NavGroup[] = [
  {
    id: 'home',
    labelKey: 'nav.group.home',
    items: [{ href: '/dashboard', labelKey: 'nav.dashboard', resourceKey: 'dashboard' }],
  },
  {
    id: 'service',
    labelKey: 'nav.group.service',
    items: [
      { href: '/tickets', labelKey: 'nav.tickets', resourceKey: 'tickets' },
      { href: '/todo', labelKey: 'nav.todo', resourceKey: 'todo' },
    ],
  },
  {
    id: 'clients',
    labelKey: 'nav.group.clients',
    items: [
      { href: '/clients', labelKey: 'nav.clients', resourceKey: 'clients' },
      { href: '/sales', labelKey: 'nav.sales', resourceKey: 'sales' },
    ],
  },
  {
    id: 'devices',
    labelKey: 'nav.group.devices',
    items: [
      { href: '/devices', labelKey: 'nav.devices', resourceKey: 'devices' },
      { href: '/licences', labelKey: 'nav.licences', resourceKey: 'licences' },
      { href: '/distributors', labelKey: 'nav.distributors', resourceKey: 'distributors' },
      { href: '/distributors/sub', labelKey: 'nav.subDistributors', resourceKey: 'distributors' },
    ],
  },
  {
    id: 'people',
    labelKey: 'nav.group.people',
    items: [
      { href: '/projects', labelKey: 'nav.projects', resourceKey: 'projects' },
      { href: '/leave', labelKey: 'nav.leave', resourceKey: 'leave' },
      {
        href: '/travel-orders',
        labelKey: 'nav.travelOrders',
        resourceKey: 'travelOrders',
        altResourceKey: 'travelOrders.all',
      },
      { href: '/sold-devices', labelKey: 'nav.soldDevices', resourceKey: 'soldDevices' },
    ],
  },
  {
    id: 'reports',
    labelKey: 'nav.group.reports',
    items: [
      { href: '/reports/overview', labelKey: 'nav.reports.overview', resourceKey: 'reports.overview' },
      { href: '/reports/tickets', labelKey: 'nav.reports.tickets', resourceKey: 'reports.tickets' },
      { href: '/reports/licences', labelKey: 'nav.reports.licences', resourceKey: 'reports.licences', superAdminOnly: true },
      { href: '/reports/devices', labelKey: 'nav.reports.devices', resourceKey: 'reports.devices' },
      { href: '/reports/tables', labelKey: 'nav.reports.tables', resourceKey: 'reports.tables' },
      { href: '/reports/generator', labelKey: 'nav.reports.generator', resourceKey: 'reports.generator', superAdminOnly: true },
      { href: '/reports/alerts', labelKey: 'nav.reports.alerts', resourceKey: 'reports.alerts', superAdminOnly: true },
    ],
  },
  {
    id: 'data',
    labelKey: 'nav.group.data',
    items: [
      { href: '/forms', labelKey: 'nav.forms', resourceKey: 'forms' },
      { href: '/tables', labelKey: 'nav.tables', resourceKey: 'tables' },
    ],
  },
];

export const APP_NAV: NavItem[] = APP_NAV_GROUPS.flatMap((group) => group.items);

const ROUTE_RESOURCE_RULES: { prefix: string; resource: string }[] = [
  { prefix: '/settings/roles', resource: 'settings.roles' },
  { prefix: '/settings/users', resource: 'settings.users' },
  { prefix: '/settings', resource: 'settings' },
  { prefix: '/reports/generator', resource: 'reports.generator' },
  { prefix: '/reports/alerts', resource: 'reports.alerts' },
  { prefix: '/reports/licences', resource: 'reports.licences' },
  { prefix: '/reports/tickets', resource: 'reports.tickets' },
  { prefix: '/reports/devices', resource: 'reports.devices' },
  { prefix: '/reports/tables', resource: 'reports.tables' },
  { prefix: '/reports/overview', resource: 'reports.overview' },
  { prefix: '/reports', resource: 'reports.overview' },
  { prefix: '/todo', resource: 'todo' },
  { prefix: '/tickets', resource: 'tickets' },
  { prefix: '/sales', resource: 'sales' },
  { prefix: '/clients', resource: 'clients' },
  { prefix: '/devices', resource: 'devices' },
  { prefix: '/distributors', resource: 'distributors' },
  { prefix: '/licences', resource: 'licences' },
  { prefix: '/projects', resource: 'projects' },
  { prefix: '/leave', resource: 'leave' },
  { prefix: '/travel-orders', resource: 'travelOrders' },
  { prefix: '/sold-devices', resource: 'soldDevices' },
  { prefix: '/forms', resource: 'forms' },
  { prefix: '/tables', resource: 'tables' },
  { prefix: '/dashboard', resource: 'dashboard' },
];

const EDIT_PATH_RULES: { test: (path: string) => boolean; resource: string }[] = [
  { test: (p) => p === '/devices/add' || p.startsWith('/devices/add/'), resource: 'devices' },
  { test: (p) => /\/forms\/[^/]+\/builder/.test(p), resource: 'forms' },
  { test: (p) => p === '/reports/generator' || p.startsWith('/reports/generator/'), resource: 'reports.generator' },
];

export function resourceForPath(path: string): string | null {
  const sorted = [...ROUTE_RESOURCE_RULES].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const rule of sorted) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) {
      return rule.resource;
    }
  }
  return null;
}

export function hasPermission(
  permissions: PermissionMap | undefined,
  resource: string,
  action: 'view' | 'edit',
  role?: string | null,
): boolean {
  if (role === SUPER_ADMIN_SLUG) return true;
  const entry = permissions?.[resource];
  if (!entry) return false;
  return action === 'edit' ? entry.edit : entry.view;
}

export function canViewResource(
  permissions: PermissionMap | undefined,
  resource: string,
  role?: string | null,
): boolean {
  return hasPermission(permissions, resource, 'view', role);
}

export function canEditResource(
  permissions: PermissionMap | undefined,
  resource: string,
  role?: string | null,
): boolean {
  return hasPermission(permissions, resource, 'edit', role);
}

export function canAccessPath(
  path: string,
  permissions: PermissionMap | undefined,
  role?: string | null,
): boolean {
  if (role === SUPER_ADMIN_SLUG) return true;
  if (path === '/travel-orders' || path.startsWith('/travel-orders/')) {
    return (
      canViewResource(permissions, 'travelOrders', role) ||
      canViewResource(permissions, 'travelOrders.all', role)
    );
  }
  for (const rule of EDIT_PATH_RULES) {
    if (rule.test(path)) {
      return canEditResource(permissions, rule.resource, role);
    }
  }
  const resource = resourceForPath(path);
  if (!resource) return true;
  return canViewResource(permissions, resource, role);
}

function canSeeNavItem(
  item: NavItem,
  permissions: PermissionMap | undefined,
  role?: string | null,
): boolean {
  if (item.superAdminOnly && role !== SUPER_ADMIN_SLUG) return false;
  if (canViewResource(permissions, item.resourceKey, role)) return true;
  if (item.altResourceKey && canViewResource(permissions, item.altResourceKey, role)) return true;
  return false;
}

export function navItemsForRole(
  permissions: PermissionMap | undefined,
  role?: string | null,
): NavItem[] {
  return APP_NAV.filter((item) => canSeeNavItem(item, permissions, role));
}

export function navGroupsForRole(
  permissions: PermissionMap | undefined,
  role?: string | null,
): NavGroup[] {
  return APP_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeeNavItem(item, permissions, role)),
  })).filter((group) => group.items.length > 0);
}

export function defaultHomeForRole(): string {
  return '/dashboard';
}

export function isSuperAdmin(role?: string | null): boolean {
  return role === SUPER_ADMIN_SLUG;
}
