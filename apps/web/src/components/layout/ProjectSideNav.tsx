'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

const navItems = [
  { label: 'Overview', path: 'overview' },
  { label: 'Issues & Fixes', path: 'issues' },
  { label: 'Products', path: 'products' },
  { label: 'Content', path: 'content' },
  { label: 'Performance', path: 'performance' },
  { label: 'Search & Intent', path: 'keywords' },
  { label: 'Competitors', path: 'competitors' },
  { label: 'Off-site Signals', path: 'backlinks' },
  { label: 'Automation', path: 'automation' },
  { label: 'Local Discovery', path: 'local' },
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
              <Link
                href={`/projects/${projectId}/${item.path}`}
                onClick={onNavigate}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'border-l-2 border-blue-700 bg-blue-50 font-medium text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
