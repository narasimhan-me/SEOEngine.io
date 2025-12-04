'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', path: '/admin' },
  { label: 'Users', path: '/admin/users' },
  { label: 'Subscriptions', path: '/admin/subscriptions' },
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
              <Link
                href={item.path}
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
