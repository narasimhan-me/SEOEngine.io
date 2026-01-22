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
import { usePathname } from 'next/navigation';

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
  /** Category/type of content (e.g., 'product', 'user', 'work_item') */
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

export function RightContextPanelProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [descriptor, setDescriptor] = useState<ContextDescriptor | null>(null);
  const [activeView, setActiveView] = useState<PanelView>('details');
  const [widthMode, setWidthMode] = useState<PanelWidthMode>('default');
  const [isPinned, setIsPinned] = useState(false);
  const lastActiveElementRef = useRef<Element | null>(null);
  const previousSegmentRef = useRef<string>(getFirstSegment(pathname));

  // Define closePanel first so it can be used in effects
  const closePanel = useCallback(() => {
    setIsOpen(false);
    setDescriptor(null);
    // Reset view to details when closing
    setActiveView('details');

    // Restore focus to the element that was active before opening
    if (
      lastActiveElementRef.current &&
      lastActiveElementRef.current instanceof HTMLElement
    ) {
      lastActiveElementRef.current.focus();
    }
  }, []);

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
    },
    [isOpen, descriptor]
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
      }
    },
    [isOpen, descriptor, openPanel, closePanel]
  );

  const togglePinned = useCallback(() => {
    setIsPinned((prev) => !prev);
  }, []);

  const toggleWidthMode = useCallback(() => {
    setWidthMode((prev) => (prev === 'default' ? 'wide' : 'default'));
  }, []);

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
    setActiveView,
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
