/**
 * [KEYBOARD-&-FOCUS-INTEGRITY-1] useFocusTrap Hook
 *
 * React hook that implements focus trapping for modal dialogs and overlays.
 * Ensures keyboard users cannot Tab out of the modal and focus cycles within.
 *
 * Usage:
 * ```tsx
 * function Modal({ isOpen, onClose, children }) {
 *   const containerRef = useFocusTrap(isOpen, onClose);
 *   if (!isOpen) return null;
 *   return <div ref={containerRef}>{children}</div>;
 * }
 * ```
 *
 * Epic: EA-24 EPIC 18
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  handleFocusTrap,
  getFirstFocusableElement,
  isEditableElement,
  isModalDialogOpen,
} from '@/lib/focus-management';

export interface UseFocusTrapOptions {
  /** Whether to auto-focus the first focusable element when trap activates */
  autoFocus?: boolean;
  /** Whether to restore focus to the trigger element when trap deactivates */
  restoreFocus?: boolean;
  /** Whether to close on Escape key */
  closeOnEscape?: boolean;
  /** Custom element to focus on open (selector or ref) */
  initialFocusRef?: React.RefObject<HTMLElement>;
}

/**
 * Hook for focus trapping within a container.
 *
 * @param isActive Whether the focus trap is currently active
 * @param onClose Callback to close the modal/overlay
 * @param options Configuration options
 * @returns Ref to attach to the container element
 */
export function useFocusTrap(
  isActive: boolean,
  onClose?: () => void,
  options: UseFocusTrapOptions = {}
) {
  const {
    autoFocus = true,
    restoreFocus = true,
    closeOnEscape = true,
    initialFocusRef,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<Element | null>(null);

  // Store the previously focused element when trap activates
  useEffect(() => {
    if (isActive) {
      previousActiveElementRef.current = document.activeElement;
    }
  }, [isActive]);

  // Auto-focus first focusable element when trap activates
  useEffect(() => {
    if (!isActive || !autoFocus) return;

    // Use requestAnimationFrame to ensure DOM is ready
    const frameId = requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const firstFocusable = getFirstFocusableElement(container);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        // If no focusable elements, focus the container itself
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [isActive, autoFocus, initialFocusRef]);

  // Restore focus when trap deactivates
  useEffect(() => {
    if (isActive || !restoreFocus) return;

    const previousElement = previousActiveElementRef.current;
    if (previousElement instanceof HTMLElement) {
      requestAnimationFrame(() => {
        previousElement.focus();
      });
    }
    previousActiveElementRef.current = null;
  }, [isActive, restoreFocus]);

  // Handle keyboard events for focus trap and Escape
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isActive) return;

      const container = containerRef.current;
      if (!container) return;

      // Handle Escape key
      if (event.key === 'Escape' && closeOnEscape && onClose) {
        // Don't close if focus is in an editable element (let it handle Escape first)
        if (isEditableElement(event.target)) {
          return;
        }

        // Don't close if a child modal dialog is open
        if (isModalDialogOpen()) {
          // Check if the open dialog is within our container
          const openDialog = document.querySelector(
            'dialog[open], [role="dialog"][aria-modal="true"]'
          );
          if (openDialog && container.contains(openDialog)) {
            // Child modal is open, let it handle Escape
            return;
          }
        }

        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      // Handle Tab for focus trapping
      if (event.key === 'Tab') {
        handleFocusTrap(event, container);
      }
    },
    [isActive, closeOnEscape, onClose]
  );

  // Add keyboard event listener
  useEffect(() => {
    if (!isActive) return;

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isActive, handleKeyDown]);

  return containerRef;
}

export default useFocusTrap;
