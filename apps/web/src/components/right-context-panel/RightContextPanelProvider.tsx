'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DeoIssue } from '@/lib/deo-issues';

// ============================================================================
// [PANEL-DEEP-LINKS-1] URL Deep-Link Schema + Validation
// ============================================================================

/**
 * Allowed panel views for URL deep-links.
 */
const ALLOWED_PANEL_VIEWS = new Set<PanelView>([
  'details',
  'recommendations',
  'history',
  'help',
]);

/**
 * Allowed entity types for URL deep-links.
 * [PLAYBOOKS-SHELL-REMOUNT-1] Added 'playbook' for playbook RCP deep-links.
 */
const ALLOWED_ENTITY_TYPES = new Set([
  'product',
  'page',
  'collection',
  'blog',
  'issue',
  'user',
  'playbook',
]);

/**
 * [PANEL-DEEP-LINKS-1 FIXUP-1] Entity types that require project scope.
 * When opened via deep-link on a non-project route, show "Unavailable" instead of fetching.
 * [PLAYBOOKS-SHELL-REMOUNT-1] Added 'playbook' (project-scoped deep links must fail safely outside /projects/[id]).
 */
const PROJECT_SCOPED_ENTITY_TYPES = new Set([
  'product',
  'page',
  'collection',
  'blog',
  'issue',
  'playbook',
]);

/**
 * [PANEL-DEEP-LINKS-1 FIXUP-1] Sentinel value for scopeProjectId when a project-scoped
 * entity deep-link is opened outside /projects/[id] routes. Forces "Unavailable" state.
 */
const OUTSIDE_PROJECT_SENTINEL = '__outside_project__';

/**
 * [PANEL-DEEP-LINKS-1 FIXUP-1] Minimal structural type for search params.
 * Compatible with both URLSearchParams and Next.js useSearchParams() return type.
 */
interface ReadableSearchParams {
  get(name: string): string | null;
  has(name: string): boolean;
  toString(): string;
}

/**
 * Parsed deep-link params from URL.
 */
interface DeepLinkParams {
  panelView: PanelView;
  entityType: string;
  entityId: string;
  entityTitle?: string;
}

/**
 * Parses URL search params for panel deep-link state.
 * Returns null if any required key is missing or invalid.
 * Never throws (must not crash on invalid params).
 * [PANEL-DEEP-LINKS-1 FIXUP-1] Uses structural type for Next.js useSearchParams() compatibility.
 */
function parseDeepLinkParams(
  searchParams: ReadableSearchParams | null
): DeepLinkParams | null {
  if (!searchParams) return null;

  const panel = searchParams.get('panel');
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');
  const entityTitle = searchParams.get('entityTitle');

  // Required keys: panel + entityType + entityId
  if (!panel || !entityType || !entityId) {
    return null;
  }

  // Validate panel value
  if (!ALLOWED_PANEL_VIEWS.has(panel as PanelView)) {
    return null;
  }

  // Validate entityType value
  if (!ALLOWED_ENTITY_TYPES.has(entityType)) {
    return null;
  }

  return {
    panelView: panel as PanelView,
    entityType,
    entityId,
    entityTitle: entityTitle || undefined,
  };
}

/**
 * Extracts project ID from pathname if under /projects/[id].
 * Returns undefined if not in a project route.
 */
function extractProjectIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match ? match[1] : undefined;
}

/**
 * Active view tab for the Right Context Panel.
 */
export type PanelView = 'details' | 'recommendations' | 'history' | 'help';

/**
 * Width mode for the Right Context Panel.
 */
export type PanelWidthMode = 'default' | 'wide';

/**
 * Describes the content to display in the Right Context Panel.
 * Extended with optional fields to support shell-level system capabilities.
 */
export interface ContextDescriptor {
  /** Category/type of content (e.g., 'product', 'page', 'collection', 'user', 'work_item') */
  kind: string;
  /** Unique identifier for the content */
  id: string;
  /** Primary title displayed in the panel header */
  title: string;
  /** Optional secondary text below the title */
  subtitle?: string;
  /** Optional key-value metadata for the panel */
  metadata?: Record<string, string>;
  /** Optional "Open full page" link */
  openHref?: string;
  /** Optional label for the open link (default handled by UI) */
  openHrefLabel?: string;
  /** Optional project scope for "persist within same project" + safe invalidation */
  scopeProjectId?: string;
  /**
   * [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1] Optional in-memory issues for "prefer in-memory" support.
   * When provided, ContextPanelIssueDrilldown renders immediately without API fetch.
   */
  issues?: DeoIssue[];
}

/**
 * Payload for programmatic openContextPanel({ type, payload }) API.
 */
export interface OpenContextPanelPayload {
  type: string;
  id: string;
  title?: string;
  subtitle?: string;
  metadata?: Record<string, string>;
  openHref?: string;
  openHrefLabel?: string;
  scopeProjectId?: string;
  /** [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1] Optional in-memory issues for "prefer in-memory" support */
  issues?: DeoIssue[];
}

interface RightContextPanelState {
  isOpen: boolean;
  descriptor: ContextDescriptor | null;
  activeView: PanelView;
  widthMode: PanelWidthMode;
  isPinned: boolean;
  openPanel: (descriptor: ContextDescriptor) => void;
  closePanel: () => void;
  togglePanel: (descriptor?: ContextDescriptor) => void;
  setActiveView: (view: PanelView) => void;
  togglePinned: () => void;
  toggleWidthMode: () => void;
  /** Programmatic trigger that maps { type } → descriptor.kind */
  openContextPanel: (payload: OpenContextPanelPayload) => void;
}

const RightContextPanelContext = createContext<RightContextPanelState | null>(
  null
);

/**
 * Extracts the first segment of a pathname for route comparison.
 * e.g., '/projects/123' -> 'projects'
 */
function getFirstSegment(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  return segments[0] || '';
}

/**
 * Checks if two descriptors have the same identity (kind + id).
 */
function isSameDescriptor(
  a: ContextDescriptor | null,
  b: ContextDescriptor | null
): boolean {
  if (!a || !b) return false;
  return a.kind === b.kind && a.id === b.id;
}

/**
 * Checks if the event target is an editable element where ESC should not close the panel.
 */
function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  return false;
}

// ============================================================================
// [PANEL-DEEP-LINKS-1] URL Panel Param Keys
// ============================================================================
const PANEL_URL_KEYS = [
  'panel',
  'entityType',
  'entityId',
  'entityTitle',
  'panelOpen',
] as const;

export function RightContextPanelProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [descriptor, setDescriptor] = useState<ContextDescriptor | null>(null);
  const [activeView, setActiveView] = useState<PanelView>('details');
  const [widthMode, setWidthMode] = useState<PanelWidthMode>('default');
  const [isPinned, setIsPinned] = useState(false);
  const lastActiveElementRef = useRef<Element | null>(null);
  const previousSegmentRef = useRef<string>(getFirstSegment(pathname));

  // [PANEL-DEEP-LINKS-1] Re-entrancy guard to prevent URL→state→URL loops
  const isApplyingUrlStateRef = useRef(false);
  // [PANEL-DEEP-LINKS-1] Track if panel was opened via URL (for back/forward close behavior)
  const openedViaUrlRef = useRef(false);

  // [PANEL-DEEP-LINKS-1] URL update helper - preserves existing params, only adds/updates/removes panel keys
  const updateUrlParams = useCallback(
    (
      updates: {
        panel?: string | null;
        entityType?: string | null;
        entityId?: string | null;
        entityTitle?: string | null;
      },
      removeAll?: boolean
    ) => {
      // Skip if we're applying URL state (re-entrancy guard)
      if (isApplyingUrlStateRef.current) return;

      const params = new URLSearchParams(searchParams?.toString() || '');

      if (removeAll) {
        // Remove all panel-related params
        for (const key of PANEL_URL_KEYS) {
          params.delete(key);
        }
      } else {
        // Add/update/remove specific keys
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === undefined) {
            params.delete(key);
          } else {
            params.set(key, value);
          }
        }
      }

      // Build new URL preserving pathname
      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      // Use replace to avoid adding to history for panel state changes
      router.replace(newUrl, { scroll: false });
    },
    [pathname, searchParams, router]
  );

  // Define closePanel first so it can be used in effects
  const closePanel = useCallback(() => {
    setIsOpen(false);
    setDescriptor(null);
    // Reset view to details when closing
    setActiveView('details');
    // [PANEL-DEEP-LINKS-1] Reset URL-opened flag
    openedViaUrlRef.current = false;

    // [PANEL-DEEP-LINKS-1] Remove panel params from URL when closing
    updateUrlParams({}, true);

    // Restore focus to the element that was active before opening
    if (
      lastActiveElementRef.current &&
      lastActiveElementRef.current instanceof HTMLElement
    ) {
      lastActiveElementRef.current.focus();
    }
  }, [updateUrlParams]);

  // Auto-close on Left Nav segment switch (unless pinned)
  useEffect(() => {
    const currentSegment = getFirstSegment(pathname);
    if (previousSegmentRef.current !== currentSegment && isOpen) {
      // If pinned, do NOT auto-close on first-segment change
      if (!isPinned) {
        setIsOpen(false);
        setDescriptor(null);
        setActiveView('details');
      }
    }
    previousSegmentRef.current = currentSegment;
  }, [pathname, isOpen, isPinned]);

  // ESC key to close (with modal dialog guard and editable element guard)
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        // Guard: don't close if a modal dialog is open
        const openDialog = document.querySelector(
          'dialog[open], [role="dialog"][aria-modal="true"]'
        );
        if (openDialog) return;

        // Guard: don't close if focus is in an editable element
        if (isEditableElement(event.target)) return;

        // Use closePanel for consistent close behavior
        closePanel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePanel]);

  // Cmd/Ctrl + . keyboard shortcut to toggle panel closed/open
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd+. (Mac) or Ctrl+. (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === '.') {
        event.preventDefault();

        // Guard: don't process if a modal dialog is open (would conflict)
        const openDialog = document.querySelector(
          'dialog[open], [role="dialog"][aria-modal="true"]'
        );
        if (openDialog) return;

        // If open → close; if closed → NO-OP (panel requires explicit descriptor to open)
        if (isOpen) {
          closePanel();
        }
        // Closed state: do nothing (panel needs content to open)
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePanel]);

  // ============================================================================
  // [PANEL-DEEP-LINKS-1] URL → State Sync (source of truth when URL has params)
  // ============================================================================
  useEffect(() => {
    const deepLinkParams = parseDeepLinkParams(searchParams);

    if (deepLinkParams) {
      // Valid deep-link params exist → open panel deterministically
      const { panelView, entityType, entityId, entityTitle } = deepLinkParams;

      // Derive scopeProjectId from pathname if under /projects/[id]
      const derivedProjectId = extractProjectIdFromPath(pathname);

      // [PANEL-DEEP-LINKS-1 FIXUP-1] Project-scope guard:
      // If entityType is project-scoped but we're not under /projects/[id],
      // use sentinel value to force "Unavailable in this project context." state.
      const isProjectScoped = PROJECT_SCOPED_ENTITY_TYPES.has(entityType);
      const scopeProjectId =
        isProjectScoped && !derivedProjectId
          ? OUTSIDE_PROJECT_SENTINEL
          : derivedProjectId;

      // Build descriptor from URL params
      const urlDescriptor: ContextDescriptor = {
        kind: entityType,
        id: entityId,
        title: entityTitle ?? entityId, // Truth-preserving fallback
        scopeProjectId,
      };

      // Apply state with re-entrancy guard
      isApplyingUrlStateRef.current = true;

      // Check if we need to update state
      const needsUpdate =
        !isOpen ||
        !isSameDescriptor(descriptor, urlDescriptor) ||
        activeView !== panelView;

      if (needsUpdate) {
        setDescriptor(urlDescriptor);
        setIsOpen(true);
        setActiveView(panelView);
        openedViaUrlRef.current = true;
      }

      // Clear re-entrancy guard after state update cycle
      // Use setTimeout to ensure state updates have been processed
      setTimeout(() => {
        isApplyingUrlStateRef.current = false;
      }, 0);
    } else {
      // No valid deep-link params
      // Check if panel params are present but invalid (e.g., bad entityType)
      const hasAnyPanelParam =
        searchParams?.has('panel') ||
        searchParams?.has('entityType') ||
        searchParams?.has('entityId');

      if (hasAnyPanelParam) {
        // Panel params present but invalid → ensure panel is CLOSED (do not crash)
        // Do NOT auto-clean URL (user may want to fix it manually)
        if (isOpen && openedViaUrlRef.current) {
          isApplyingUrlStateRef.current = true;
          setIsOpen(false);
          setDescriptor(null);
          setActiveView('details');
          openedViaUrlRef.current = false;
          setTimeout(() => {
            isApplyingUrlStateRef.current = false;
          }, 0);
        }
      } else {
        // Panel params absent
        // Only force-close if previously opened via URL (for back/forward behavior)
        if (isOpen && openedViaUrlRef.current) {
          isApplyingUrlStateRef.current = true;
          setIsOpen(false);
          setDescriptor(null);
          setActiveView('details');
          openedViaUrlRef.current = false;
          setTimeout(() => {
            isApplyingUrlStateRef.current = false;
          }, 0);
        }
        // If panel was opened via UI (not URL), do NOT force-close
      }
    }
    // Note: We intentionally exclude isOpen, descriptor, activeView from deps
    // to avoid re-running when those change from UI actions.
    // The effect should only run when URL params change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname]);

  const openPanel = useCallback(
    (newDescriptor: ContextDescriptor) => {
      // If panel is already open with same kind+id → NO-OP (prevents flicker)
      if (isOpen && isSameDescriptor(descriptor, newDescriptor)) {
        return;
      }

      // Only store lastActiveElement when transitioning CLOSED → OPEN
      if (!isOpen) {
        lastActiveElementRef.current = document.activeElement;
      }

      // Update descriptor (handles both fresh open and context switch while open)
      setDescriptor(newDescriptor);
      setIsOpen(true);
      // Reset to details view when opening with new descriptor
      setActiveView('details');

      // [PANEL-DEEP-LINKS-1] Sync to URL (replaceState semantics)
      updateUrlParams({
        panel: 'details',
        entityType: newDescriptor.kind,
        entityId: newDescriptor.id,
        entityTitle: newDescriptor.title || null,
      });
    },
    [isOpen, descriptor, updateUrlParams]
  );

  const togglePanel = useCallback(
    (newDescriptor?: ContextDescriptor) => {
      if (!isOpen) {
        // CLOSED: open with descriptor if provided
        if (newDescriptor) {
          openPanel(newDescriptor);
        }
        // CLOSED + no descriptor → do nothing (panel needs content to open)
      } else if (!newDescriptor) {
        // OPEN + no descriptor → close
        closePanel();
      } else if (isSameDescriptor(descriptor, newDescriptor)) {
        // OPEN + same kind+id → true toggle (close)
        closePanel();
      } else {
        // OPEN + different kind+id → update descriptor (stay open)
        setDescriptor(newDescriptor);
        setActiveView('details');
        // [PANEL-DEEP-LINKS-1] Sync entity switch to URL
        updateUrlParams({
          panel: 'details',
          entityType: newDescriptor.kind,
          entityId: newDescriptor.id,
          entityTitle: newDescriptor.title || null,
        });
      }
    },
    [isOpen, descriptor, openPanel, closePanel, updateUrlParams]
  );

  const togglePinned = useCallback(() => {
    setIsPinned((prev) => !prev);
  }, []);

  const toggleWidthMode = useCallback(() => {
    setWidthMode((prev) => (prev === 'default' ? 'wide' : 'default'));
  }, []);

  // [PANEL-DEEP-LINKS-1] Wrapped setActiveView that syncs to URL
  const handleSetActiveView = useCallback(
    (view: PanelView) => {
      setActiveView(view);
      // Only update URL if panel is open (has entity context)
      if (isOpen && descriptor) {
        updateUrlParams({ panel: view });
      }
    },
    [isOpen, descriptor, updateUrlParams]
  );

  // Programmatic openContextPanel({ type, payload }) API
  // Maps { type } → descriptor.kind
  const openContextPanel = useCallback(
    (payload: OpenContextPanelPayload) => {
      const newDescriptor: ContextDescriptor = {
        kind: payload.type,
        id: payload.id,
        title: payload.title || `${payload.type} details`,
        subtitle: payload.subtitle,
        metadata: payload.metadata,
        openHref: payload.openHref,
        openHrefLabel: payload.openHrefLabel,
        scopeProjectId: payload.scopeProjectId,
        issues: payload.issues,
      };
      openPanel(newDescriptor);
    },
    [openPanel]
  );

  const value: RightContextPanelState = {
    isOpen,
    descriptor,
    activeView,
    widthMode,
    isPinned,
    openPanel,
    closePanel,
    togglePanel,
    setActiveView: handleSetActiveView,
    togglePinned,
    toggleWidthMode,
    openContextPanel,
  };

  return (
    <RightContextPanelContext.Provider value={value}>
      {children}
    </RightContextPanelContext.Provider>
  );
}

/**
 * Hook to access Right Context Panel state and actions.
 * Must be used within a RightContextPanelProvider.
 */
export function useRightContextPanel(): RightContextPanelState {
  const context = useContext(RightContextPanelContext);
  if (!context) {
    throw new Error(
      'useRightContextPanel must be used within a RightContextPanelProvider'
    );
  }
  return context;
}
