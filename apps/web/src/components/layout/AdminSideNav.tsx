'use client';

import { GuardedLink } from '@/components/navigation/GuardedLink';
import { usePathname } from 'next/navigation';

/**
 * [ADMIN-OPS-1] [EA-29] Admin Navigation
 * Locked internal-only sections for Support, Ops Admin, and Management/CEO.
 * Completely isolated from user-facing navigation.
 * Uses semantic design tokens for consistent styling.
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
      {/* [EA-29] Admin context visual signal - clearly indicates administrative shell */}
      <div className="mb-4 rounded-md border border-purple-300 bg-purple-50 px-3 py-2 dark:border-purple-700 dark:bg-purple-950">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-purple-600 dark:text-purple-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
            Admin Shell
          </span>
        </div>
        <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
          Internal governance tools
        </p>
      </div>

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
                    ? 'border-l-2 border-purple-600 bg-purple-100 font-medium text-purple-700 dark:border-purple-400 dark:bg-purple-900/50 dark:text-purple-300'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
