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
 * Describes the content to display in the Right Context Panel.
 */
export interface ContextDescriptor {
  /** Category/type of content (e.g., 'project', 'user', 'task') */
  kind: string;
  /** Unique identifier for the content */
  id: string;
  /** Primary title displayed in the panel header */
  title: string;
  /** Optional secondary text below the title */
  subtitle?: string;
  /** Optional key-value metadata for the panel */
  metadata?: Record<string, string>;
}

interface RightContextPanelState {
  isOpen: boolean;
  descriptor: ContextDescriptor | null;
  openPanel: (descriptor: ContextDescriptor) => void;
  closePanel: () => void;
  togglePanel: (descriptor?: ContextDescriptor) => void;
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
  const lastActiveElementRef = useRef<Element | null>(null);
  const previousSegmentRef = useRef<string>(getFirstSegment(pathname));

  // Define closePanel first so it can be used in effects
  const closePanel = useCallback(() => {
    setIsOpen(false);
    setDescriptor(null);

    // Restore focus to the element that was active before opening
    if (
      lastActiveElementRef.current &&
      lastActiveElementRef.current instanceof HTMLElement
    ) {
      lastActiveElementRef.current.focus();
    }
  }, []);

  // Auto-close on Left Nav segment switch
  useEffect(() => {
    const currentSegment = getFirstSegment(pathname);
    if (previousSegmentRef.current !== currentSegment && isOpen) {
      setIsOpen(false);
      setDescriptor(null);
    }
    previousSegmentRef.current = currentSegment;
  }, [pathname, isOpen]);

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
      }
    },
    [isOpen, descriptor, openPanel, closePanel]
  );

  const value: RightContextPanelState = {
    isOpen,
    descriptor,
    openPanel,
    closePanel,
    togglePanel,
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
