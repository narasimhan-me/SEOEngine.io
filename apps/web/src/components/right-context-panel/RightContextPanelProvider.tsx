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
 * [RIGHT-CONTEXT-PANEL-AUTONOMY-1] View tabs removed from UI; only 'details' is active.
 * [RIGHT-CONTEXT-PANEL-AUTONOMY-1 FIXUP-2] Legacy panel values (recommendations, history, help)
 * are accepted for backward compatibility but normalized to 'details' at runtime.
 * No view tabs exist under autonomy.
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

// ============================================================================
// [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Context Derivation for Autonomous Open
// ============================================================================

/**
 * Derived route context for autonomous panel behavior.
 */
interface DerivedRouteContext {
  kind: 'product' | 'page' | 'collection' | 'playbook';
  id: string;
  scopeProjectId: string;
}

/**
 * Derives "meaningful context" from the current route for autonomous panel open.
 * Returns null for routes without meaningful entity context (list pages, dashboard, etc.).
 *
 * Project detail contexts that MUST auto-open:
 * - /projects/{projectId}/products/{productId}
 * - /projects/{projectId}/pages/{pageId}
 * - /projects/{projectId}/assets/pages/{pageId}
 * - /projects/{projectId}/collections/{collectionId}
 * - /projects/{projectId}/assets/collections/{collectionId}
 * - /projects/{projectId}/playbooks/{playbookId}
 */
function deriveRouteContext(pathname: string): DerivedRouteContext | null {
  // Product detail: /projects/{projectId}/products/{productId}
  const productMatch = pathname.match(
    /^\/projects\/([^/]+)\/products\/([^/]+)$/
  );
  if (productMatch) {
    return {
      kind: 'product',
      id: productMatch[2],
      scopeProjectId: productMatch[1],
    };
  }

  // Page detail: /projects/{projectId}/pages/{pageId} OR /projects/{projectId}/assets/pages/{pageId}
  const pageMatch = pathname.match(
    /^\/projects\/([^/]+)\/(?:assets\/)?pages\/([^/]+)$/
  );
  if (pageMatch) {
    return {
      kind: 'page',
      id: pageMatch[2],
      scopeProjectId: pageMatch[1],
    };
  }

  // Collection detail: /projects/{projectId}/collections/{collectionId} OR /projects/{projectId}/assets/collections/{collectionId}
  const collectionMatch = pathname.match(
    /^\/projects\/([^/]+)\/(?:assets\/)?collections\/([^/]+)$/
  );
  if (collectionMatch) {
    return {
      kind: 'collection',
      id: collectionMatch[2],
      scopeProjectId: collectionMatch[1],
    };
  }

  // Playbook run: /projects/{projectId}/playbooks/{playbookId}
  const playbookMatch = pathname.match(
    /^\/projects\/([^/]+)\/playbooks\/([^/]+)$/
  );
  if (playbookMatch) {
    return {
      kind: 'playbook',
      id: playbookMatch[2],
      scopeProjectId: playbookMatch[1],
    };
  }

  // No meaningful context
  return null;
}

/**
 * Generates a context key for dismissal tracking.
 * Format: kind:id:scopeProjectId
 */
function getContextKey(ctx: DerivedRouteContext): string {
  return `${ctx.kind}:${ctx.id}:${ctx.scopeProjectId}`;
}

/**
 * Active view tab for the Right Context Panel.
 * [RIGHT-CONTEXT-PANEL-AUTONOMY-1] View tabs removed from UI; 'details' is the only active view.
 */
export type PanelView = 'details' | 'recommendations' | 'history' | 'help';

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

/**
 * [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Simplified state interface.
 * Removed: widthMode, isPinned, togglePinned, toggleWidthMode, setActiveView
 */
interface RightContextPanelState {
  isOpen: boolean;
  descriptor: ContextDescriptor | null;
  activeView: PanelView;
  openPanel: (descriptor: ContextDescriptor) => void;
  closePanel: () => void;
  togglePanel: (descriptor?: ContextDescriptor) => void;
  /** Programmatic trigger that maps { type } → descriptor.kind */
  openContextPanel: (payload: OpenContextPanelPayload) => void;
}

const RightContextPanelContext = createContext<RightContextPanelState | null>(
  null
);

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
  const lastActiveElementRef = useRef<Element | null>(null);

  // [PANEL-DEEP-LINKS-1] Re-entrancy guard to prevent URL→state→URL loops
  const isApplyingUrlStateRef = useRef(false);
  // [PANEL-DEEP-LINKS-1] Track if panel was opened via URL (for back/forward close behavior)
  const openedViaUrlRef = useRef(false);

  // [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Dismissal tracking (NOT persisted preference)
  // Tracks the context key that was manually dismissed
  const dismissedContextKeyRef = useRef<string | null>(null);

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

  // [RIGHT-CONTEXT-PANEL-AUTONOMY-1] User-driven close: sets dismissal for current context
  const closePanelUserDriven = useCallback(() => {
    // Set dismissal for current context if panel is open with a descriptor
    if (isOpen && descriptor) {
      const routeContext = deriveRouteContext(pathname);
      if (routeContext) {
        dismissedContextKeyRef.current = getContextKey(routeContext);
      }
    }

    setIsOpen(false);
    setDescriptor(null);
    setActiveView('details');
    openedViaUrlRef.current = false;

    // Remove panel params from URL
    updateUrlParams({}, true);

    // Restore focus to the element that was active before opening
    if (
      lastActiveElementRef.current &&
      lastActiveElementRef.current instanceof HTMLElement
    ) {
      lastActiveElementRef.current.focus();
    }
  }, [isOpen, descriptor, pathname, updateUrlParams]);

  // [RIGHT-CONTEXT-PANEL-AUTONOMY-1] System-driven close: does NOT set dismissal
  const closePanelSystemDriven = useCallback(() => {
    setIsOpen(false);
    setDescriptor(null);
    setActiveView('details');
    openedViaUrlRef.current = false;

    // Remove panel params from URL
    updateUrlParams({}, true);

    // Restore focus
    if (
      lastActiveElementRef.current &&
      lastActiveElementRef.current instanceof HTMLElement
    ) {
      lastActiveElementRef.current.focus();
    }
  }, [updateUrlParams]);

  // Public closePanel uses user-driven behavior (for X button, ESC, scrim click)
  const closePanel = closePanelUserDriven;

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

        // Use user-driven close for ESC
        closePanelUserDriven();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePanelUserDriven]);

  // [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Removed Cmd/Ctrl + '.' shortcut entirely

  // ============================================================================
  // [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Autonomous Open/Close + URL Sync
  // ============================================================================
  useEffect(() => {
    const deepLinkParams = parseDeepLinkParams(searchParams);

    // PRIORITY 1: Valid PANEL-DEEP-LINKS-1 state exists → use URL as source of truth
    if (deepLinkParams) {
      const { panelView, entityType, entityId, entityTitle } = deepLinkParams;

      // [RIGHT-CONTEXT-PANEL-AUTONOMY-1 FIXUP-2] Normalize legacy panel values to 'details'
      // Under autonomy, only 'details' view is active (no view tabs).
      if (panelView !== 'details') {
        // Normalize URL to 'details' via replaceState, then let next effect run apply state
        updateUrlParams({ panel: 'details' });
        return;
      }

      // Derive scopeProjectId from pathname if under /projects/[id]
      const derivedProjectId = extractProjectIdFromPath(pathname);

      // Project-scope guard
      const isProjectScoped = PROJECT_SCOPED_ENTITY_TYPES.has(entityType);
      const scopeProjectId =
        isProjectScoped && !derivedProjectId
          ? OUTSIDE_PROJECT_SENTINEL
          : derivedProjectId;

      // Build descriptor from URL params
      const urlDescriptor: ContextDescriptor = {
        kind: entityType,
        id: entityId,
        title: entityTitle ?? entityId,
        scopeProjectId,
      };

      // Apply state with re-entrancy guard
      isApplyingUrlStateRef.current = true;

      const needsUpdate =
        !isOpen ||
        !isSameDescriptor(descriptor, urlDescriptor) ||
        activeView !== 'details'; // [FIXUP-2] Always compare against 'details'

      if (needsUpdate) {
        // Clear dismissal when opening via deep-link (explicit navigation intent)
        dismissedContextKeyRef.current = null;
        setDescriptor(urlDescriptor);
        setIsOpen(true);
        setActiveView('details'); // [FIXUP-2] Always set to 'details' (no view tabs)
        openedViaUrlRef.current = true;
      }

      setTimeout(() => {
        isApplyingUrlStateRef.current = false;
      }, 0);
      return;
    }

    // PRIORITY 2: Route-derived context exists → auto-open (unless dismissed)
    const routeContext = deriveRouteContext(pathname);

    if (routeContext) {
      const contextKey = getContextKey(routeContext);

      // Check if this context was manually dismissed
      if (dismissedContextKeyRef.current === contextKey) {
        // Respect dismissal - keep panel closed, ensure URL is clean
        // [FIXUP-1] No re-entrancy guard here - this is state→URL write, not URL→state
        if (searchParams?.has('panel')) {
          updateUrlParams({}, true);
        }
        return;
      }

      // Context changed from dismissed context → clear dismissal
      if (
        dismissedContextKeyRef.current &&
        dismissedContextKeyRef.current !== contextKey
      ) {
        dismissedContextKeyRef.current = null;
      }

      // Build minimal descriptor for auto-open
      const autoDescriptor: ContextDescriptor = {
        kind: routeContext.kind,
        id: routeContext.id,
        title: routeContext.id, // Title will be populated by content renderer
        scopeProjectId: routeContext.scopeProjectId,
      };

      // Check if we need to update
      const needsUpdate = !isOpen || !isSameDescriptor(descriptor, autoDescriptor);

      if (needsUpdate) {
        setDescriptor(autoDescriptor);
        setIsOpen(true);
        setActiveView('details');
        openedViaUrlRef.current = true;

        // [FIXUP-1] Write URL params via replaceState - no re-entrancy guard needed
        // (this is state→URL write, not URL→state application)
        updateUrlParams({
          panel: 'details',
          entityType: routeContext.kind,
          entityId: routeContext.id,
        });
      }
      return;
    }

    // PRIORITY 3: No route-derived context and no valid deep-link params
    // Auto-close if panel is open (navigated to contextless route)
    // [FIXUP-1] No re-entrancy guard here - these are state→URL writes, not URL→state
    if (isOpen) {
      closePanelSystemDriven();
    } else {
      // Ensure URL is clean of any lingering panel params
      const hasAnyPanelParam =
        searchParams?.has('panel') ||
        searchParams?.has('entityType') ||
        searchParams?.has('entityId');

      if (hasAnyPanelParam) {
        updateUrlParams({}, true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  const openPanel = useCallback(
    (newDescriptor: ContextDescriptor) => {
      // [FIXUP-3] In-place descriptor enrichment when panel is open with same kind+id
      if (isOpen && isSameDescriptor(descriptor, newDescriptor)) {
        // Check if newDescriptor has meaningful display field updates
        const hasDisplayUpdates =
          (newDescriptor.title && newDescriptor.title !== descriptor?.title) ||
          (newDescriptor.subtitle && newDescriptor.subtitle !== descriptor?.subtitle) ||
          (newDescriptor.openHref && newDescriptor.openHref !== descriptor?.openHref) ||
          (newDescriptor.openHrefLabel && newDescriptor.openHrefLabel !== descriptor?.openHrefLabel) ||
          (newDescriptor.metadata && JSON.stringify(newDescriptor.metadata) !== JSON.stringify(descriptor?.metadata));

        if (!hasDisplayUpdates) {
          // True NO-OP: no meaningful display changes
          return;
        }

        // Merge/enrich descriptor in-place (no flicker, no close/reopen)
        setDescriptor((prev) => {
          if (!prev) return newDescriptor;
          return {
            ...prev,
            title: newDescriptor.title || prev.title,
            subtitle: newDescriptor.subtitle ?? prev.subtitle,
            openHref: newDescriptor.openHref ?? prev.openHref,
            openHrefLabel: newDescriptor.openHrefLabel ?? prev.openHrefLabel,
            scopeProjectId: newDescriptor.scopeProjectId ?? prev.scopeProjectId,
            issues: newDescriptor.issues ?? prev.issues,
            metadata: { ...prev.metadata, ...newDescriptor.metadata },
          };
        });

        // Sync URL entityTitle to enriched title
        if (newDescriptor.title && newDescriptor.title !== descriptor?.title) {
          updateUrlParams({ entityTitle: newDescriptor.title });
        }
        return;
      }

      // Clear dismissal (explicit selection intent)
      dismissedContextKeyRef.current = null;

      // Only store lastActiveElement when transitioning CLOSED → OPEN
      if (!isOpen) {
        lastActiveElementRef.current = document.activeElement;
      }

      setDescriptor(newDescriptor);
      setIsOpen(true);
      setActiveView('details');

      // Sync to URL (replaceState semantics)
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
        if (newDescriptor) {
          openPanel(newDescriptor);
        }
      } else if (!newDescriptor) {
        closePanel();
      } else if (isSameDescriptor(descriptor, newDescriptor)) {
        closePanel();
      } else {
        // Clear dismissal on explicit context switch
        dismissedContextKeyRef.current = null;
        setDescriptor(newDescriptor);
        setActiveView('details');
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

  // Programmatic openContextPanel({ type, payload }) API
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
    openPanel,
    closePanel,
    togglePanel,
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
