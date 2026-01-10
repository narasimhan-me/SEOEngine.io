'use client';

import { GuardedLink } from '@/components/navigation/GuardedLink';
import { usePathname } from 'next/navigation';

/**
 * [ADMIN-OPS-1] Admin Navigation
 * Locked internal-only sections for Support, Ops Admin, and Management/CEO.
 * Removed "Subscriptions" from primary nav (plan overrides moved under Users/Ops-only actions).
 */
const navItems = [
  { label: 'Overview', path: '/admin' },
  { label: 'Users', path: '/admin/users' },
  { label: 'Projects', path: '/admin/projects' },
  { label: 'Runs', path: '/admin/runs' },
  { label: 'Issues', path: '/admin/issues' },
  { label: 'AI Usage', path: '/admin/ai-usage' },
  { label: 'System Health', path: '/admin/system-health' },
  { label: 'Audit Log', path: '/admin/audit-log' },
  { label: 'Governance Audit', path: '/admin/governance-audit' },
];

interface AdminSideNavProps {
  onNavigate?: () => void;
}

export default function AdminSideNav({ onNavigate }: AdminSideNavProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="w-full max-w-xs flex-shrink-0 md:w-48">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <li key={item.path}>
              <GuardedLink
                href={item.path}
                onClick={onNavigate}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'border-l-2 border-blue-700 bg-blue-50 font-medium text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.label}
              </GuardedLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
