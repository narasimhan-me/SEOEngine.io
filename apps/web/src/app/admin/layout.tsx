'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { usersApi } from '@/lib/api';
import AdminSideNav from '@/components/layout/AdminSideNav';
import LayoutShell from '@/components/layout/LayoutShell';

/**
 * [ADMIN-OPS-1] Extended User interface with internal admin role.
 */
interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  adminRole?: 'SUPPORT_AGENT' | 'OPS_ADMIN' | 'MANAGEMENT_CEO' | null;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }

      try {
        const user: User = await usersApi.me();
        // [ADMIN-OPS-1] Update admin UI gating from role === 'ADMIN' to:
        // role === 'ADMIN' AND adminRole is present.
        if (user.role !== 'ADMIN' || !user.adminRole) {
          router.push('/projects');
          return;
        }
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
