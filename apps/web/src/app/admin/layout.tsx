'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { usersApi } from '@/lib/api';
import AdminSideNav from '@/components/layout/AdminSideNav';
import LayoutShell from '@/components/layout/LayoutShell';

/**
 * [ADMIN-OPS-1] [EA-29] Extended User interface with internal admin role.
 * Admin shell provides isolated governance and support capabilities.
 */
interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  adminRole?: 'SUPPORT_AGENT' | 'OPS_ADMIN' | 'MANAGEMENT_CEO' | null;
}

/**
 * [EA-29] Admin role display names for UI
 */
const ADMIN_ROLE_LABELS: Record<string, string> = {
  SUPPORT_AGENT: 'Support Agent',
  OPS_ADMIN: 'Ops Admin',
  MANAGEMENT_CEO: 'Management',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // [EA-29] Store user for admin role badge display
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function checkAuth() {
      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }

      try {
        const userData: User = await usersApi.me();
        // [ADMIN-OPS-1] [EA-29] Admin shell gating:
        // role === 'ADMIN' AND adminRole is present.
        // This ensures complete separation from user-facing UX.
        if (userData.role !== 'ADMIN' || !userData.adminRole) {
          router.push('/projects');
          return;
        }
        setUser(userData);
        setAuthorized(true);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <LayoutShell>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </LayoutShell>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <LayoutShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* [EA-29] Read-only admin context banner */}
        <div className="mb-6 flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 dark:border-purple-800 dark:bg-purple-950">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                Administrative View — Read-Only Access
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                System state visibility for governance and support. No user-facing impact.
              </p>
            </div>
          </div>
          {user && user.adminRole && (
            <span className="rounded-full bg-purple-200 px-3 py-1 text-xs font-medium text-purple-800 dark:bg-purple-800 dark:text-purple-200">
              {ADMIN_ROLE_LABELS[user.adminRole] || user.adminRole}
            </span>
          )}
        </div>

        {/* Mobile top bar - visible only on small screens */}
        <div className="mb-4 flex items-center justify-between md:hidden">
          <span className="text-sm font-medium text-muted-foreground">
            Admin navigation
          </span>
          <button
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
          >
            <svg
              className="mr-1.5 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            Menu
          </button>
        </div>

        {/* Desktop/tablet layout - hidden on mobile */}
        <div className="hidden gap-8 md:flex">
          <AdminSideNav />
          <main className="min-w-0 flex-1">{children}</main>
        </div>

        {/* Mobile content area - visible only on small screens */}
        <div className="md:hidden">
          <main className="min-w-0 flex-1">{children}</main>
        </div>

        {/* Mobile drawer overlay */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 bg-foreground/40 md:hidden"
            onClick={() => setMobileNavOpen(false)}
          >
            <div
              className="absolute bottom-0 left-0 top-0 w-64 bg-[hsl(var(--surface-card))] shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold text-foreground">
                  Admin
                </span>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              {/* Drawer content */}
              <div className="p-4">
                <AdminSideNav onNavigate={() => setMobileNavOpen(false)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
