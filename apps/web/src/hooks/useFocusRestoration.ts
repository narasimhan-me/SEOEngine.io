/**
 * [KEYBOARD-&-FOCUS-INTEGRITY-1] useFocusRestoration Hook
 *
 * React hook for storing and restoring focus when opening/closing modals or overlays.
 * Ensures focus returns to the triggering element after dismissal.
 *
 * Usage:
 * ```tsx
 * function Modal({ isOpen, onClose, children }) {
 *   const { storeFocus, restoreFocus } = useFocusRestoration();
 *
 *   const handleOpen = () => {
 *     storeFocus();
 *     // ... open modal
 *   };
 *
 *   const handleClose = () => {
 *     onClose();
 *     restoreFocus();
 *   };
 *
 *   // ...
 * }
 * ```
 *
 * Epic: EA-24 EPIC 18
 */

import { useCallback, useRef, useEffect } from 'react';

export interface UseFocusRestorationOptions {
  /** Whether to automatically store focus when isOpen becomes true */
  autoStore?: boolean;
  /** Whether to automatically restore focus when isOpen becomes false */
  autoRestore?: boolean;
}

export interface FocusRestorationResult {
  /** Store the current active element */
  storeFocus: () => void;
  /** Restore focus to the stored element */
  restoreFocus: () => void;
  /** Clear the stored element without restoring */
  clearStoredFocus: () => void;
  /** Check if there's a stored element */
  hasStoredFocus: () => boolean;
}

/**
 * Hook for managing focus restoration.
 *
 * @param isOpen Optional reactive flag for auto-store/restore behavior
 * @param options Configuration options
 */
export function useFocusRestoration(
  isOpen?: boolean,
  options: UseFocusRestorationOptions = {}
): FocusRestorationResult {
  const { autoStore = true, autoRestore = true } = options;

  const storedElementRef = useRef<Element | null>(null);
  const wasOpenRef = useRef(isOpen);

  const storeFocus = useCallback(() => {
    storedElementRef.current = document.activeElement;
  }, []);

  const restoreFocus = useCallback(() => {
    const element = storedElementRef.current;
    if (element instanceof HTMLElement) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        element.focus();
      });
    }
    storedElementRef.current = null;
  }, []);

  const clearStoredFocus = useCallback(() => {
    storedElementRef.current = null;
  }, []);

  const hasStoredFocus = useCallback(() => {
    return storedElementRef.current !== null;
  }, []);

  // Auto-store focus when opening
  useEffect(() => {
    if (!autoStore || isOpen === undefined) return;

    if (isOpen && !wasOpenRef.current) {
      // Transitioning from closed to open
      storeFocus();
    }

    wasOpenRef.current = isOpen;
  }, [isOpen, autoStore, storeFocus]);

  // Auto-restore focus when closing
  useEffect(() => {
    if (!autoRestore || isOpen === undefined) return;

    if (!isOpen && wasOpenRef.current) {
      // Transitioning from open to closed
      restoreFocus();
    }
  }, [isOpen, autoRestore, restoreFocus]);

  return {
    storeFocus,
    restoreFocus,
    clearStoredFocus,
    hasStoredFocus,
  };
}

export default useFocusRestoration;
