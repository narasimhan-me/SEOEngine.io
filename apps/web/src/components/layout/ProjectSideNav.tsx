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

export default function ProjectSideNav() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.id as string;

  const isActive = (path: string) => {
    const fullPath = `/projects/${projectId}/${path}`;
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

  return (
    <nav className="w-48 flex-shrink-0">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <li key={item.path}>
              <Link
                href={`/projects/${projectId}/${item.path}`}
                className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-medium border-l-2 border-blue-700'
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
