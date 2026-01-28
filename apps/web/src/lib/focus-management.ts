/**
 * [KEYBOARD-&-FOCUS-INTEGRITY-1] Focus Management Utilities
 *
 * Provides consistent focus management patterns across the application:
 * - Focus trap for modals/dialogs
 * - Focus restoration after modal dismissal
 * - Keyboard navigation helpers
 * - Escape key standardization
 *
 * Design System: v1.5
 * Epic: EA-24 EPIC 18
 */

/**
 * Selector for all focusable elements within a container.
 * Excludes disabled elements and elements with tabindex="-1".
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]:not([disabled]):not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([disabled]):not([tabindex="-1"])',
  '[contenteditable="true"]:not([disabled]):not([tabindex="-1"])',
].join(', ');

/**
 * Get all focusable elements within a container.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Get the first focusable element within a container.
 */
export function getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
}

/**
 * Get the last focusable element within a container.
 */
export function getLastFocusableElement(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[elements.length - 1] || null;
}

/**
 * Check if an element is an editable form element.
 * Used to determine if Escape should be handled by the element vs the container.
 */
export function isEditableElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  if (element.isContentEditable) {
    return true;
  }
  return false;
}

/**
 * Check if an element is an interactive element.
 * Used to prevent row-level keyboard handling from interfering with child elements.
 */
export function isInteractiveElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;
  return !!(
    element.closest('a') ||
    element.closest('button') ||
    element.closest('input') ||
    element.closest('textarea') ||
    element.closest('select') ||
    element.closest('[contenteditable]') ||
    element.closest('[data-no-row-keydown]')
  );
}

/**
 * Check if a modal dialog is currently open.
 * Used to prevent parent containers from handling Escape when a child modal is open.
 */
export function isModalDialogOpen(): boolean {
  return !!document.querySelector(
    'dialog[open], [role="dialog"][aria-modal="true"]'
  );
}

/**
 * Focus trap handler for modal dialogs.
 * Keeps focus cycling within the container when Tab/Shift+Tab is pressed.
 */
export function handleFocusTrap(
  event: KeyboardEvent,
  container: HTMLElement
): void {
  if (event.key !== 'Tab') return;

  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement as HTMLElement;

  if (event.shiftKey) {
    // Shift+Tab: if on first element, wrap to last
    if (activeElement === firstElement || !container.contains(activeElement)) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    // Tab: if on last element, wrap to first
    if (activeElement === lastElement || !container.contains(activeElement)) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}

/**
 * Options for dropdown keyboard navigation.
 */
export interface DropdownKeyboardOptions {
  /** The list of menu item elements */
  items: HTMLElement[];
  /** Currently focused index */
  currentIndex: number;
  /** Callback to update focused index */
  onIndexChange: (index: number) => void;
  /** Callback when item is selected (Enter/Space) */
  onSelect: (index: number) => void;
  /** Callback when dropdown should close (Escape) */
  onClose: () => void;
}

/**
 * Handle keyboard navigation within a dropdown menu.
 * Supports Arrow Up/Down, Enter/Space for selection, Escape to close.
 */
export function handleDropdownKeyboard(
  event: KeyboardEvent,
  options: DropdownKeyboardOptions
): void {
  const { items, currentIndex, onIndexChange, onSelect, onClose } = options;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (currentIndex < items.length - 1) {
        onIndexChange(currentIndex + 1);
      } else {
        // Wrap to first
        onIndexChange(0);
      }
      break;

    case 'ArrowUp':
      event.preventDefault();
      if (currentIndex > 0) {
        onIndexChange(currentIndex - 1);
      } else {
        // Wrap to last
        onIndexChange(items.length - 1);
      }
      break;

    case 'Enter':
    case ' ':
      event.preventDefault();
      if (currentIndex >= 0 && currentIndex < items.length) {
        onSelect(currentIndex);
      }
      break;

    case 'Escape':
      event.preventDefault();
      onClose();
      break;

    case 'Tab':
      // Close dropdown on Tab (standard behavior)
      onClose();
      break;

    case 'Home':
      event.preventDefault();
      onIndexChange(0);
      break;

    case 'End':
      event.preventDefault();
      onIndexChange(items.length - 1);
      break;
  }
}

/**
 * Focus restoration context.
 * Stores the element to restore focus to after a modal/overlay is closed.
 */
export interface FocusRestorationContext {
  /** Store the current active element */
  store: () => void;
  /** Restore focus to the stored element */
  restore: () => void;
  /** Clear the stored reference */
  clear: () => void;
}

/**
 * Create a focus restoration context.
 * Use this when opening modals/overlays to remember where to return focus.
 */
export function createFocusRestoration(): FocusRestorationContext {
  let storedElement: Element | null = null;

  return {
    store: () => {
      storedElement = document.activeElement;
    },
    restore: () => {
      if (storedElement instanceof HTMLElement) {
        // Use requestAnimationFrame to ensure DOM updates are complete
        requestAnimationFrame(() => {
          (storedElement as HTMLElement).focus();
        });
      }
    },
    clear: () => {
      storedElement = null;
    },
  };
}

/**
 * Announce a message to screen readers via ARIA live region.
 * Creates a temporary element that is announced and then removed.
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement is complete
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
