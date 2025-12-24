'use client';

import { GuardedLink } from '@/components/navigation/GuardedLink';
import { useParams, usePathname } from 'next/navigation';

/**
 * Project navigation items aligned with the DEO pillar-centric model.
 * Order reflects the canonical pillar hierarchy while maintaining existing routes.
 *
 * [STORE-HEALTH-1.0] Store Health is the primary landing page for projects.
 * [ASSETS-PAGES-1] Assets section groups Products, Pages, and Collections.
 */
const navItems = [
  { label: 'Store Health', path: 'store-health' }, // [STORE-HEALTH-1.0] Primary landing
  { label: 'Work Queue', path: 'work-queue' }, // [WORK-QUEUE-1] Unified action bundle queue
  { label: 'Overview', path: 'overview' },
  // [ASSETS-PAGES-1] Assets section
  { label: 'Products', path: 'products' },
  { label: 'Pages', path: 'assets/pages' }, // [ASSETS-PAGES-1] Pages asset list
  { label: 'Collections', path: 'assets/collections' }, // [ASSETS-PAGES-1] Collections asset list
  { label: 'Insights', path: 'insights' }, // [INSIGHTS-1] Read-only analytics
  { label: 'DEO Overview', path: 'deo' },
  { label: 'Metadata', path: 'metadata' },
  { label: 'Content', path: 'content' },
  { label: 'Media', path: 'media' },
  { label: 'Search & Intent', path: 'keywords' },
  { label: 'Competitors', path: 'competitors' },
  { label: 'Off-site Signals', path: 'backlinks' },
  { label: 'Local Discovery', path: 'local' },
  // Technical Indexability pillar (using existing performance route)
  { label: 'Technical', path: 'performance' },
  { label: 'Automation', path: 'automation' },
  { label: 'Settings', path: 'settings' },
];

interface ProjectSideNavProps {
  onNavigate?: () => void;
}

export default function ProjectSideNav({ onNavigate }: ProjectSideNavProps) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.id as string;

  const isActive = (path: string) => {
    const fullPath = `/projects/${projectId}/${path}`;
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

  return (
    <nav className="w-full max-w-xs flex-shrink-0 md:w-48">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <li key={item.path}>
              <GuardedLink
                href={`/projects/${projectId}/${item.path}`}
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
