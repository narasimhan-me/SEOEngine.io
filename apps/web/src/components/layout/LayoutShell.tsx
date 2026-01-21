'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { GuardedLink } from '@/components/navigation/GuardedLink';

type NavState = 'expanded' | 'collapsed';

const NAV_STATE_STORAGE_KEY = 'engineo_nav_state';

function readNavState(): NavState {
  if (typeof window === 'undefined') return 'expanded';
  try {
    const value = window.localStorage.getItem(NAV_STATE_STORAGE_KEY);
    return value === 'collapsed' ? 'collapsed' : 'expanded';
  } catch {
    return 'expanded';
  }
}

function persistNavState(next: NavState) {
  try {
    window.localStorage.setItem(NAV_STATE_STORAGE_KEY, next);
  } catch {
    // ignore
  }
}

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function IconButton({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled="true"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-[hsl(var(--surface-card))] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children}
    </button>
  );
}

function AppSwitcherIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 5h4v4H5zM10 5h4v4h-4zM15 5h4v4h-4zM5 10h4v4H5zM10 10h4v4h-4zM15 10h4v4h-4zM5 15h4v4H5zM10 15h4v4h-4zM15 15h4v4h-4z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M21 21l-4.35-4.35" />
      <circle cx="11" cy="11" r="7" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function HelpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 115.82 1c0 2-3 2-3 4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3h8v6h-8zM3 21h8v-6H3z" />
    </svg>
  );
}

function ProjectsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
      <path d="M19.4 15a1.8 1.8 0 00.35 1.98l.06.06a2.2 2.2 0 01-1.56 3.76h-.1a1.8 1.8 0 00-1.66 1.18 2.2 2.2 0 01-4.18 0A1.8 1.8 0 0010.65 20h-.1a2.2 2.2 0 01-1.56-3.76l.06-.06A1.8 1.8 0 009.4 15a1.8 1.8 0 00-.35-1.98l-.06-.06A2.2 2.2 0 0110.55 9.2h.1A1.8 1.8 0 0012.3 8.02a2.2 2.2 0 014.18 0A1.8 1.8 0 0018.15 9.2h.1a2.2 2.2 0 011.56 3.76l-.06.06A1.8 1.8 0 0019.4 15z" />
    </svg>
  );
}

function AdminIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z" />
      <path d="M9 12h6" />
      <path d="M12 9v6" />
    </svg>
  );
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { href: '/projects', label: 'Projects', Icon: ProjectsIcon },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
  { href: '/help/shopify-permissions', label: 'Help', Icon: HelpIcon },
  { href: '/admin', label: 'Admin', Icon: AdminIcon },
] as const;

export default function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navState, setNavState] = useState<NavState>(() => readNavState());
  const collapsed = navState === 'collapsed';

  const toggleNav = () => {
    setNavState((prev) => {
      const next: NavState = prev === 'collapsed' ? 'expanded' : 'collapsed';
      persistNavState(next);
      return next;
    });
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="z-50 h-16 shrink-0 border-b border-border bg-background">
        <div className="flex h-full items-center gap-3 px-4">
          <IconButton label="App switcher (placeholder)">
            <AppSwitcherIcon className="h-5 w-5" />
          </IconButton>
          <GuardedLink href="/projects" className="flex items-center gap-2">
            <Image
              src="/branding/engineo/logo-light.png"
              alt="EngineO.ai"
              width={28}
              height={28}
              className="dark:hidden"
              priority
            />
            <Image
              src="/branding/engineo/logo-dark.png"
              alt="EngineO.ai"
              width={28}
              height={28}
              className="hidden dark:block"
              priority
            />
            <span className="text-sm font-semibold text-foreground">
              EngineO.ai
            </span>
            <span className="hidden sm:inline text-sm text-muted-foreground">
              Control Plane
            </span>
          </GuardedLink>
          <div className="flex flex-1 items-center justify-center px-4">
            <button
              type="button"
              aria-label="Global search (placeholder)"
              aria-disabled="true"
              className="hidden w-full max-w-xl items-center gap-2 rounded-md border border-border bg-[hsl(var(--surface-card))] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:flex"
            >
              <SearchIcon className="h-4 w-4" />
              <span className="flex-1 text-left">Search…</span>
              <kbd className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                ⌘K
              </kbd>
              <kbd className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                Ctrl K
              </kbd>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <IconButton label="Notifications (placeholder)">
              <BellIcon className="h-5 w-5" />
            </IconButton>
            <IconButton label="Help / Docs (placeholder)">
              <HelpIcon className="h-5 w-5" />
            </IconButton>
            <button
              type="button"
              aria-label="Tenant / Project switcher (placeholder)"
              aria-disabled="true"
              className="hidden items-center gap-2 rounded-md border border-border bg-[hsl(var(--surface-card))] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:inline-flex"
            >
              <span className="max-w-[160px] truncate">Tenant</span>
              <ChevronRightIcon className="h-4 w-4 opacity-70" />
            </button>
            <button
              type="button"
              aria-label="Account menu (placeholder)"
              aria-disabled="true"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-[hsl(var(--surface-card))] px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                U
              </span>
              <ChevronRightIcon className="h-4 w-4 opacity-70" />
            </button>
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={[
            'z-40 shrink-0 border-r border-border bg-[hsl(var(--surface-card))] transition-[width] duration-200',
            collapsed ? 'w-[72px]' : 'w-64',
          ].join(' ')}
        >
          <div className="flex h-full flex-col">
            <div
              className={[
                'flex items-center px-3 py-3',
                collapsed ? 'justify-center' : 'justify-between',
              ].join(' ')}
            >
              {!collapsed && (
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Navigation
                </span>
              )}
              <button
                type="button"
                onClick={toggleNav}
                aria-label={
                  collapsed
                    ? 'Expand left navigation'
                    : 'Collapse left navigation'
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {collapsed ? (
                  <ChevronRightIcon className="h-4 w-4" />
                ) : (
                  <ChevronLeftIcon className="h-4 w-4" />
                )}
              </button>
            </div>
            <nav className="flex-1 px-2 pb-3">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const itemClassName = [
                    'group flex items-center rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    collapsed ? 'justify-center' : 'gap-3',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  ].join(' ');
                  return (
                    <li key={item.href}>
                      <GuardedLink
                        href={item.href}
                        className={itemClassName}
                        title={item.label}
                        aria-current={active ? 'page' : undefined}
                      >
                        <item.Icon className="h-5 w-5 shrink-0" />
                        {!collapsed && (
                          <span className="min-w-0 flex-1 truncate">
                            {item.label}
                          </span>
                        )}
                      </GuardedLink>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col bg-background">
          <div className="shrink-0 border-b border-border bg-[hsl(var(--surface-card))] px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-medium text-muted-foreground">
                  Breadcrumbs (placeholder)
                </div>
                <div className="truncate text-sm font-semibold text-foreground">
                  Work Canvas
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-disabled="true"
                  className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Action
                </button>
                <button
                  type="button"
                  aria-disabled="true"
                  className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Action
                </button>
              </div>
            </div>
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto bg-background">
            <div className="min-h-full p-4">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
