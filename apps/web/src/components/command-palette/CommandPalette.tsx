'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCommandPalette } from './CommandPaletteProvider';
import { useUnsavedChanges } from '@/components/unsaved-changes/UnsavedChangesProvider';
import { usersApi } from '@/lib/api';

/**
 * Command definition for the palette.
 */
interface Command {
  id: string;
  label: string;
  section: 'Navigation' | 'Entity Jump' | 'Utility';
  /** If true, command is only visible to admins */
  adminOnly?: boolean;
  /** Action to execute when command is selected */
  action: () => void;
}

/**
 * Extract project ID from pathname if under /projects/[id]/...
 */
function extractProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * User type for admin role checking.
 */
interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  adminRole?: 'SUPPORT_AGENT' | 'OPS_ADMIN' | 'MANAGEMENT_CEO' | null;
}

/**
 * CommandPalette UI component.
 *
 * Renders a centered overlay dialog with search input and command results.
 * Accessible, token-styled, dark-mode native, Shopify iframe safe.
 *
 * Commands are navigation-only (no destructive/write/apply/run/generate actions).
 */
export function CommandPalette() {
  const { isOpen, query, setQuery, closePalette, inputRef } =
    useCommandPalette();
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges();
  const router = useRouter();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin on mount
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const user: User = await usersApi.me();
        setIsAdmin(user.role === 'ADMIN' && !!user.adminRole);
      } catch {
        setIsAdmin(false);
      }
    }
    checkAdminStatus();
  }, []);

  const projectId = extractProjectId(pathname);

  /**
   * Navigate with unsaved changes guard.
   * Uses the same confirm text as GuardedLink.
   */
  const navigateWithGuard = useCallback(
    (href: string) => {
      if (hasUnsavedChanges) {
        const shouldLeave = window.confirm(
          'You have unsaved changes. If you leave this page, they will be lost. Continue without saving?'
        );
        if (!shouldLeave) {
          // Keep palette open, do not navigate
          return;
        }
        setHasUnsavedChanges(false);
      }
      closePalette();
      router.push(href);
    },
    [hasUnsavedChanges, setHasUnsavedChanges, closePalette, router]
  );

  // Define commands with deterministic routing
  const commands = useMemo<Command[]>(() => {
    const navCommands: Command[] = [
      {
        id: 'nav-overview',
        label: 'Go to Overview',
        section: 'Navigation',
        action: () =>
          navigateWithGuard(projectId ? `/projects/${projectId}/overview` : '/dashboard'),
      },
      {
        id: 'nav-assets',
        label: 'Go to Assets',
        section: 'Navigation',
        action: () =>
          navigateWithGuard(
            projectId ? `/projects/${projectId}/assets/pages` : '/projects'
          ),
      },
      {
        id: 'nav-products',
        label: 'Go to Products',
        section: 'Navigation',
        action: () =>
          navigateWithGuard(
            projectId ? `/projects/${projectId}/products` : '/projects'
          ),
      },
      {
        id: 'nav-automation',
        label: 'Go to Automation',
        section: 'Navigation',
        action: () =>
          navigateWithGuard(
            projectId ? `/projects/${projectId}/automation` : '/projects'
          ),
      },
      {
        id: 'nav-insights',
        label: 'Go to Insights',
        section: 'Navigation',
        action: () =>
          navigateWithGuard(
            projectId ? `/projects/${projectId}/insights` : '/projects'
          ),
      },
      {
        id: 'nav-governance',
        label: 'Go to Governance',
        section: 'Navigation',
        action: () =>
          navigateWithGuard(
            projectId ? `/projects/${projectId}/settings/governance` : '/projects'
          ),
      },
      {
        id: 'nav-admin',
        label: 'Go to Admin',
        section: 'Navigation',
        adminOnly: true,
        action: () => navigateWithGuard('/admin'),
      },
    ];

    const entityCommands: Command[] = [
      {
        id: 'jump-project',
        label: 'Jump to Project by name',
        section: 'Entity Jump',
        action: () => navigateWithGuard('/projects'),
      },
      {
        id: 'jump-product',
        label: 'Jump to Product by name',
        section: 'Entity Jump',
        action: () =>
          navigateWithGuard(
            projectId ? `/projects/${projectId}/products` : '/projects'
          ),
      },
      {
        id: 'jump-issue',
        label: 'Jump to Issue by ID/title',
        section: 'Entity Jump',
        action: () =>
          navigateWithGuard(
            projectId ? `/projects/${projectId}/issues` : '/projects'
          ),
      },
    ];

    const utilityCommands: Command[] = [
      {
        id: 'util-help',
        label: 'Open Help / Docs',
        section: 'Utility',
        action: () => navigateWithGuard('/help/shopify-permissions'),
      },
      {
        id: 'util-feedback',
        label: 'Open Feedback',
        section: 'Utility',
        action: () => navigateWithGuard('/settings/help'),
      },
    ];

    return [...navCommands, ...entityCommands, ...utilityCommands];
  }, [projectId, navigateWithGuard]);

  // Filter commands by query and admin status
  const filteredCommands = useMemo(() => {
    return commands.filter((cmd) => {
      // Admin-only commands hidden for non-admins
      if (cmd.adminOnly && !isAdmin) return false;
      // Filter by query
      if (query.trim()) {
        return cmd.label.toLowerCase().includes(query.toLowerCase());
      }
      return true;
    });
  }, [commands, query, isAdmin]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length, query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          event.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          event.preventDefault();
          closePalette();
          break;
      }
    },
    [filteredCommands, selectedIndex, closePalette]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedItem = listRef.current.querySelector(
        '[data-selected="true"]'
      );
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Handle outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        closePalette();
      }
    }

    // Use mousedown for faster response
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closePalette]);

  // Group commands by section for display
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    for (const cmd of filteredCommands) {
      if (!groups[cmd.section]) {
        groups[cmd.section] = [];
      }
      groups[cmd.section].push(cmd);
    }
    return groups;
  }, [filteredCommands]);

  // Calculate flat index for each command
  const commandIndices = useMemo(() => {
    const indices = new Map<string, number>();
    let idx = 0;
    for (const cmd of filteredCommands) {
      indices.set(cmd.id, idx);
      idx++;
    }
    return indices;
  }, [filteredCommands]);

  // Render nothing when closed
  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      data-testid="command-palette-overlay"
    >
      {/* Scrim */}
      <div className="absolute inset-0 bg-foreground/50" aria-hidden="true" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        onKeyDown={handleKeyDown}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg border border-border bg-[hsl(var(--surface-raised))] shadow-lg"
        data-testid="command-palette-dialog"
      >
        {/* Hidden title for accessibility */}
        <h2 id="command-palette-title" className="sr-only">
          Command Palette
        </h2>

        {/* Search input */}
        <div className="border-b border-border px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            data-testid="command-palette-input"
          />
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          role="listbox"
          aria-label="Commands"
          className="max-h-[300px] overflow-y-auto"
          data-testid="command-palette-results"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([section, cmds]) => (
              <div key={section}>
                {/* Section header */}
                <div className="sticky top-0 bg-[hsl(var(--surface-raised))] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section}
                </div>

                {/* Commands */}
                {cmds.map((cmd) => {
                  const idx = commandIndices.get(cmd.id) ?? 0;
                  const isSelected = idx === selectedIndex;

                  return (
                    <div
                      key={cmd.id}
                      role="option"
                      aria-selected={isSelected}
                      data-selected={isSelected}
                      onClick={() => cmd.action()}
                      className={[
                        'cursor-pointer px-4 py-2 text-sm transition-colors',
                        isSelected
                          ? 'bg-[hsl(var(--menu-hover-bg)/0.14)] text-foreground'
                          : 'text-foreground hover:bg-[hsl(var(--menu-hover-bg)/0.10)]',
                        'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary',
                      ].join(' ')}
                      data-testid={`command-palette-option-${cmd.id}`}
                    >
                      {cmd.label}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Keyboard hint footer */}
        <div className="border-t border-border bg-[hsl(var(--surface-card))] px-4 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5">
                ↑
              </kbd>{' '}
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5">
                ↓
              </kbd>{' '}
              to navigate
            </span>
            <span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5">
                Enter
              </kbd>{' '}
              to select
            </span>
            <span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5">
                Esc
              </kbd>{' '}
              to close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
