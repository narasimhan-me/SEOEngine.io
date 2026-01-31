'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { GuardedLink } from '@/components/navigation/GuardedLink';
import { projectsApi } from '@/lib/api';
import { RightContextPanelProvider } from '@/components/right-context-panel/RightContextPanelProvider';
import { RightContextPanel } from '@/components/right-context-panel/RightContextPanel';
import {
  CommandPaletteProvider,
  useCommandPalette,
} from '@/components/command-palette/CommandPaletteProvider';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import {
  CenterPaneHeaderProvider,
  useCenterPaneHeaderState,
} from '@/components/layout/CenterPaneHeaderProvider';
// [ICONS-LOCAL-LIBRARY-1] Import Icon component for local SVG sprite rendering
import { Icon, type IconManifestKey } from '@/components/icons';

// [WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1] Left rail is icon-only always (no expand/collapse toggle)
// Removed: NavState type, NAV_STATE_STORAGE_KEY, readNavState(), persistNavState()

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

// [KAN-94: EA-54] IconButton - calmer, subordinate utility controls
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
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/40 bg-transparent text-muted-foreground/60 transition-colors hover:bg-muted/40 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

// [ICONS-LOCAL-LIBRARY-1] SearchIcon replaced with Icon component in command palette triggers

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

// [WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1] Removed ChevronLeftIcon - no longer needed (collapse toggle removed)

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

// [ICONS-LOCAL-LIBRARY-1] Removed DashboardIcon, ProjectsIcon, SettingsIcon, AdminIcon
// These are now rendered via the Icon component with semantic keys from the manifest

// [ICONS-LOCAL-LIBRARY-1] Nav items using semantic icon keys from manifest
// Icons are decorative (aria-hidden) since the parent link has aria-label
const navItems: {
  href: string;
  label: string;
  iconKey: IconManifestKey;
}[] = [
  { href: '/dashboard', label: 'Dashboard', iconKey: 'nav.dashboard' },
  { href: '/projects', label: 'Projects', iconKey: 'nav.projects' },
  { href: '/settings', label: 'Settings', iconKey: 'nav.settings' },
  { href: '/help/shopify-permissions', label: 'Help', iconKey: 'nav.help' },
  { href: '/admin', label: 'Admin', iconKey: 'nav.admin' },
];

// [UI-POLISH-&-CLARITY-1] Section label mapping for breadcrumbs
const SECTION_LABELS: Record<string, string> = {
  'store-health': 'Store Health',
  'work-queue': 'Work Queue',
  products: 'Products',
  'assets/pages': 'Pages',
  'assets/collections': 'Collections',
  'assets/blogs': 'Blog Posts',
  automation: 'Playbooks',
  insights: 'Insights',
  deo: 'DEO Overview',
  keywords: 'Keywords',
  competitors: 'Competitors',
  backlinks: 'Backlinks',
  local: 'Local',
  performance: 'Performance',
  settings: 'Project Settings',
  issues: 'Issues',
};

const ADMIN_SECTION_LABELS: Record<string, string> = {
  users: 'Users',
  projects: 'Projects',
  'audit-log': 'Audit Log',
  'governance-audit': 'Governance Audit',
};

// [UI-POLISH-&-CLARITY-1] Project name cache key
const PROJECT_NAME_CACHE_KEY = 'engineo_project_name_cache';

function getCachedProjectName(projectId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const cache = JSON.parse(
      sessionStorage.getItem(PROJECT_NAME_CACHE_KEY) || '{}'
    );
    return cache[projectId] ?? null;
  } catch {
    return null;
  }
}

function setCachedProjectName(projectId: string, name: string): void {
  if (typeof window === 'undefined') return;
  try {
    const cache = JSON.parse(
      sessionStorage.getItem(PROJECT_NAME_CACHE_KEY) || '{}'
    );
    cache[projectId] = name;
    sessionStorage.setItem(PROJECT_NAME_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
}

function LayoutShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { openPalette } = useCommandPalette();
  // [WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1] Left rail is icon-only always (no collapse state)

  // [CENTER-PANE-NAV-REMODEL-1] Read header state from context
  const headerState = useCenterPaneHeaderState();

  // [UI-POLISH-&-CLARITY-1] Breadcrumb state
  const [projectLabel, setProjectLabel] = useState<string | null>(null);

  // [UI-POLISH-&-CLARITY-1] Derive route info for breadcrumbs
  const routeInfo = useMemo(() => {
    // /projects/[id]/* pattern
    const projectMatch = pathname.match(/^\/projects\/([^/]+)(?:\/(.*))?$/);
    if (projectMatch) {
      const projectId = projectMatch[1];
      const rest = projectMatch[2] ?? '';
      // Find section label
      let sectionLabel = 'Overview';
      for (const [key, label] of Object.entries(SECTION_LABELS)) {
        if (rest === key || rest.startsWith(`${key}/`)) {
          sectionLabel = label;
          break;
        }
      }
      return { type: 'project' as const, projectId, sectionLabel };
    }

    // /admin/* pattern
    const adminMatch = pathname.match(/^\/admin(?:\/(.*))?$/);
    if (adminMatch) {
      const rest = adminMatch[1] ?? '';
      let sectionLabel = 'Dashboard';
      for (const [key, label] of Object.entries(ADMIN_SECTION_LABELS)) {
        if (rest === key || rest.startsWith(`${key}/`)) {
          sectionLabel = label;
          break;
        }
      }
      return { type: 'admin' as const, sectionLabel };
    }

    return { type: 'other' as const, sectionLabel: 'Work Canvas' };
  }, [pathname]);

  // [UI-POLISH-&-CLARITY-1] Fetch project name for breadcrumbs
  useEffect(() => {
    if (routeInfo.type !== 'project') {
      setProjectLabel(null);
      return;
    }

    const projectId = routeInfo.projectId;

    // Check cache first
    const cached = getCachedProjectName(projectId);
    if (cached) {
      setProjectLabel(cached);
      return;
    }

    // Fetch from API (read-only)
    let cancelled = false;
    projectsApi
      .get(projectId)
      .then((project) => {
        if (cancelled) return;
        const name = project.name || project.shopifyShopDomain || projectId;
        setProjectLabel(name);
        setCachedProjectName(projectId, name);
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback to projectId
        setProjectLabel(projectId);
      });

    return () => {
      cancelled = true;
    };
  }, [routeInfo]);

  // [WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1] Removed toggleNav - left rail is always icon-only

  // [UI-POLISH-&-CLARITY-1] Derive breadcrumb and title text
  const breadcrumbText = useMemo(() => {
    if (routeInfo.type === 'project') {
      return `Projects > ${projectLabel || routeInfo.projectId} > ${routeInfo.sectionLabel}`;
    }
    if (routeInfo.type === 'admin') {
      return `Admin > ${routeInfo.sectionLabel}`;
    }
    return '';
  }, [routeInfo, projectLabel]);

  const titleText = routeInfo.sectionLabel;

  // [EA-53] Global top navigation destinations:
  // - Project-contextual when /projects/[id]/... is in context
  // - Safe fallback to /projects when no project context (no new routes)
  const hasProjectContext = routeInfo.type === 'project';
  const projectBase = hasProjectContext ? `/projects/${routeInfo.projectId}` : '';
  const projectsHref = '/projects';
  const contentHref = hasProjectContext ? `${projectBase}/content` : '/projects';
  const productsHref = hasProjectContext ? `${projectBase}/products` : '/projects';
  const automationsHref = hasProjectContext ? `${projectBase}/automation` : '/projects';
  const performanceHref = hasProjectContext ? `${projectBase}/performance` : '/projects';
  const billingHref = '/settings/billing';

  const isActiveHref = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  // [KAN-94: EA-54] Redesigned nav link styling for calm, premium feel
  // Active state: unmissable with bottom border indicator + bolder weight
  // Inactive: reduced visual weight, calm hover transition
  const navLinkClassName = (active: boolean) =>
    [
      'inline-flex items-center px-3 py-2 text-sm transition-colors relative',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      active
        ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-4/5 after:h-0.5 after:rounded-full after:bg-[hsl(var(--nav-active-indicator,var(--primary)))]'
        : 'text-muted-foreground/80 font-normal hover:text-foreground hover:bg-muted/30',
    ].join(' ');

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* [KAN-94: EA-54] Increased header height for breathing room, calmer visual presence */}
      <header className="z-50 h-14 shrink-0 border-b border-border/60 bg-background">
        <div className="flex h-full items-center gap-6 px-5">
          {/* [KAN-94: EA-54] Brand/workspace grouping - clear visual hierarchy */}
          <div className="flex items-center gap-3 pr-4 border-r border-border/40">
            <IconButton label="App switcher — not yet available">
              <AppSwitcherIcon className="h-4 w-4 opacity-40" />
            </IconButton>
            <GuardedLink href="/projects" className="flex items-center gap-2">
              <Image
                src="/branding/engineo/logo-light.png"
                alt="EngineO.ai"
                width={24}
                height={24}
                className="dark:hidden"
                priority
              />
              <Image
                src="/branding/engineo/logo-dark.png"
                alt="EngineO.ai"
                width={24}
                height={24}
                className="hidden dark:block"
                priority
              />
              <span className="text-sm font-semibold text-foreground">
                EngineO
              </span>
            </GuardedLink>
          </div>

          {/* [KAN-94: EA-54] Primary product areas - calm, intentional spacing
              Visual grouping: core nav items together, billing separated */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-1"
          >
            <GuardedLink
              href={projectsHref}
              className={navLinkClassName(isActiveHref(projectsHref))}
            >
              Projects
            </GuardedLink>
            <GuardedLink
              href={contentHref}
              className={navLinkClassName(
                hasProjectContext && isActiveHref(contentHref)
              )}
            >
              Content
            </GuardedLink>
            <GuardedLink
              href={productsHref}
              className={navLinkClassName(
                hasProjectContext && isActiveHref(productsHref)
              )}
            >
              Products
            </GuardedLink>
            {/* [KAN-94: EA-54] Coming soon: visually distinct, calm, non-clickable
                - Reduced opacity, no hover state, subtle badge
                - aria-disabled for accessibility */}
            <span
              aria-disabled="true"
              title="Media is coming soon"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-normal text-[hsl(var(--nav-coming-soon,var(--muted-foreground)))] opacity-60 cursor-default select-none"
            >
              Media
              <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/70">
                Soon
              </span>
            </span>
            <GuardedLink
              href={automationsHref}
              className={navLinkClassName(
                hasProjectContext && isActiveHref(automationsHref)
              )}
            >
              Automations
            </GuardedLink>
            <GuardedLink
              href={performanceHref}
              className={navLinkClassName(
                hasProjectContext && isActiveHref(performanceHref)
              )}
            >
              Performance
            </GuardedLink>
            {/* Visual separator before billing */}
            <div className="w-px h-5 bg-border/40 mx-2" aria-hidden="true" />
            <GuardedLink
              href={billingHref}
              className={navLinkClassName(isActiveHref(billingHref))}
            >
              Billing
            </GuardedLink>
          </nav>

          {/* [KAN-94: EA-54] Search - centered, calm, doesn't compete with nav */}
          <div className="flex flex-1 items-center justify-center px-6">
            {/* Desktop command palette trigger */}
            <button
              type="button"
              onClick={openPalette}
              aria-label="Open command palette"
              data-testid="command-palette-open"
              className="hidden w-full max-w-md items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground/70 transition-colors hover:bg-muted/50 hover:text-muted-foreground hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:flex"
            >
              {/* [ICONS-LOCAL-LIBRARY-1] Using Icon component for search icon */}
              <Icon name="utility.search" size={14} className="opacity-60" />
              <span className="flex-1 text-left text-xs">Search…</span>
              <kbd className="rounded border border-border/50 bg-background/50 px-1.5 py-0.5 text-[10px] text-muted-foreground/60 font-medium">
                ⌘K
              </kbd>
            </button>
            {/* Small screen command palette trigger */}
            <button
              type="button"
              onClick={openPalette}
              aria-label="Open command palette"
              data-testid="command-palette-open-mobile"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-muted-foreground/60 transition-colors hover:bg-muted/50 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden"
            >
              {/* [ICONS-LOCAL-LIBRARY-1] Using Icon component for search icon */}
              <Icon name="utility.search" size={16} />
            </button>
          </div>
          {/* [KAN-94: EA-54] Control-plane utilities - visually subordinate to primary nav
              - Smaller icons, reduced opacity
              - Consistent muted styling for disabled states
              - Clear visual grouping */}
          <div className="flex items-center gap-1.5">
            <IconButton label="Notifications — not yet available">
              <BellIcon className="h-4 w-4 opacity-40" />
            </IconButton>
            <IconButton label="Help & Docs — not yet available">
              <HelpIcon className="h-4 w-4 opacity-40" />
            </IconButton>
            <button
              type="button"
              aria-label="Tenant / Project switcher — not yet available"
              aria-disabled="true"
              title="Multi-tenant switching is planned for a future release"
              className="hidden items-center gap-1.5 rounded-md border border-border/50 bg-transparent px-2 py-1.5 text-xs text-[hsl(var(--nav-utility-muted,var(--muted-foreground)))] opacity-50 cursor-default sm:inline-flex"
            >
              <span className="max-w-[120px] truncate">Workspace</span>
              <ChevronRightIcon className="h-3 w-3 opacity-60" />
            </button>
            <button
              type="button"
              aria-label="Account menu — not yet available"
              aria-disabled="true"
              title="Account management is planned for a future release"
              className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-transparent px-1.5 py-1.5 text-xs text-[hsl(var(--nav-utility-muted,var(--muted-foreground)))] opacity-50 cursor-default"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted/60 text-[10px] font-medium text-muted-foreground">
                U
              </span>
            </button>
          </div>
        </div>
      </header>
      {/* Main content row - relative positioning context for overlay panel containment */}
      {/* [WORK-CANVAS-ARCHITECTURE-LOCK-1] Visual hierarchy: left rail (global) | center pane (work canvas) | RCP (context) */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Command Palette overlay */}
        <CommandPalette />
        {/* [WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1] Left Rail: icon-only always (no expand/collapse toggle) */}
        {/* [EA-31] Reduced visual weight: surface-secondary, quieter border for calm supporting UI */}
        <aside className="z-40 w-[72px] shrink-0 border-r border-border/60 bg-[hsl(var(--surface-secondary,var(--surface-card)))]">
          <div className="flex h-full flex-col">
            {/* [WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1] Removed "Navigation" heading and collapse toggle */}
            <div className="h-4" aria-hidden="true" />
            <nav className="flex-1 px-2 pb-3">
              <ul className="space-y-0.5">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  // [NAV-HIERARCHY-POLISH-1] Global Nav: increased visual weight
                  // [WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1] Always icon-only, centered
                  // [EA-31] Calmer inactive state, subtle active state for secondary panel distinction
                  const itemClassName = [
                    'group flex items-center justify-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    active
                      ? 'bg-primary/8 text-primary'
                      : 'text-muted-foreground/70 hover:bg-muted/50 hover:text-muted-foreground',
                  ].join(' ');
                  return (
                    <li key={item.href}>
                      <GuardedLink
                        href={item.href}
                        className={itemClassName}
                        title={item.label}
                        aria-label={item.label}
                        aria-current={active ? 'page' : undefined}
                      >
                        {/* [ICONS-LOCAL-LIBRARY-1] Using Icon component with semantic key (decorative, parent has aria-label) */}
                        <Icon name={item.iconKey} size={20} />
                        {/* [WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1] No visible label text - icon only */}
                      </GuardedLink>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>
        {/* [WORK-CANVAS-ARCHITECTURE-LOCK-1] Center Pane: Work Canvas - first-class surface, distinct from side surfaces */}
        <div className="flex min-w-0 flex-1 flex-col bg-background">
          {/* [CENTER-PANE-NAV-REMODEL-1] Standardized center-pane header: Breadcrumbs (small, secondary) → Title (primary) → Description (muted) → Actions (right-aligned) */}
          {/* [WORK-CANVAS-ARCHITECTURE-LOCK-1] No ambiguous global "Action" button - actions are context-specific only */}
          {/* [EA-31] Primary work area header: increased emphasis for visual dominance */}
          {!headerState.hideHeader && (
            <div className="shrink-0 border-b border-border bg-[hsl(var(--surface-card))] px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* Breadcrumbs: small, secondary */}
                  <div className="truncate text-xs font-medium text-muted-foreground/80">
                    {headerState.breadcrumbs || breadcrumbText || 'EngineO.ai'}
                  </div>
                  {/* Title: primary - stronger emphasis */}
                  <div className="truncate text-base font-semibold text-foreground mt-0.5">
                    {headerState.title || titleText}
                  </div>
                  {/* Description: optional one-line, muted */}
                  {headerState.description && (
                    <div className="truncate text-xs text-muted-foreground mt-0.5">
                      {headerState.description}
                    </div>
                  )}
                </div>
                {/* Actions: right-aligned, minimal */}
                {headerState.actions && (
                  <div className="shrink-0 flex items-center gap-2">
                    {headerState.actions}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* [EA-31] Primary work area: increased padding for visual dominance */}
          <main className="min-h-0 flex-1 overflow-y-auto bg-background">
            <div className="min-h-full p-5">{children}</div>
          </main>
        </div>
        {/* [WORK-CANVAS-ARCHITECTURE-LOCK-1] RCP: Raised surface with border divider, no navigation/mode controls */}
        <RightContextPanel />
      </div>
    </div>
  );
}

export default function LayoutShell({ children }: { children: ReactNode }) {
  return (
    <CommandPaletteProvider>
      <RightContextPanelProvider>
        {/* [CENTER-PANE-NAV-REMODEL-1] CenterPaneHeaderProvider for per-page header state */}
        <CenterPaneHeaderProvider>
          <LayoutShellInner>{children}</LayoutShellInner>
        </CenterPaneHeaderProvider>
      </RightContextPanelProvider>
    </CommandPaletteProvider>
  );
}
