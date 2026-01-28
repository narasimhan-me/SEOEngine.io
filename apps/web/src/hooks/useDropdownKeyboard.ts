/**
 * [KEYBOARD-&-FOCUS-INTEGRITY-1] useDropdownKeyboard Hook
 *
 * React hook for keyboard navigation in dropdown menus.
 * Supports Arrow Up/Down, Enter/Space for selection, Escape to close.
 *
 * Usage:
 * ```tsx
 * function Dropdown({ isOpen, onClose, items, onSelect }) {
 *   const { focusedIndex, getItemProps, listProps } = useDropdownKeyboard({
 *     isOpen,
 *     onClose,
 *     itemCount: items.length,
 *     onSelect,
 *   });
 *
 *   return (
 *     <ul {...listProps}>
 *       {items.map((item, index) => (
 *         <li key={item.id} {...getItemProps(index)}>
 *           {item.label}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 *
 * Epic: EA-24 EPIC 18
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseDropdownKeyboardOptions {
  /** Whether the dropdown is currently open */
  isOpen: boolean;
  /** Callback to close the dropdown */
  onClose: () => void;
  /** Number of items in the dropdown */
  itemCount: number;
  /** Callback when an item is selected */
  onSelect: (index: number) => void;
  /** Whether to auto-focus the first item when opened */
  autoFocus?: boolean;
  /** Initial focused index (-1 means none) */
  initialIndex?: number;
  /** Whether to wrap around when reaching the end */
  wrap?: boolean;
}

export interface DropdownKeyboardResult {
  /** Currently focused item index (-1 means none) */
  focusedIndex: number;
  /** Set the focused index manually */
  setFocusedIndex: (index: number) => void;
  /** Props to spread on each menu item */
  getItemProps: (index: number) => {
    ref: (el: HTMLElement | null) => void;
    tabIndex: number;
    'aria-selected': boolean;
    'data-focused': boolean;
    onMouseEnter: () => void;
    onClick: () => void;
  };
  /** Props to spread on the list container */
  listProps: {
    role: 'listbox' | 'menu';
    'aria-activedescendant': string | undefined;
    onKeyDown: (event: React.KeyboardEvent) => void;
  };
  /** Ref for the list container */
  listRef: React.RefObject<HTMLElement>;
}

export function useDropdownKeyboard({
  isOpen,
  onClose,
  itemCount,
  onSelect,
  autoFocus = true,
  initialIndex = -1,
  wrap = true,
}: UseDropdownKeyboardOptions): DropdownKeyboardResult {
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const listRef = useRef<HTMLElement>(null);

  // Reset focused index when dropdown opens/closes
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(autoFocus && itemCount > 0 ? 0 : initialIndex);
    } else {
      setFocusedIndex(initialIndex);
    }
  }, [isOpen, autoFocus, itemCount, initialIndex]);

  // Focus the item when focusedIndex changes
  useEffect(() => {
    if (!isOpen || focusedIndex < 0) return;

    const item = itemRefs.current[focusedIndex];
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, focusedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => {
            if (prev < itemCount - 1) return prev + 1;
            return wrap ? 0 : prev;
          });
          break;

        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => {
            if (prev > 0) return prev - 1;
            return wrap ? itemCount - 1 : prev;
          });
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < itemCount) {
            onSelect(focusedIndex);
          }
          break;

        case 'Escape':
          event.preventDefault();
          onClose();
          break;

        case 'Tab':
          // Let Tab close the dropdown naturally
          onClose();
          break;

        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          break;

        case 'End':
          event.preventDefault();
          setFocusedIndex(itemCount - 1);
          break;
      }
    },
    [itemCount, focusedIndex, onSelect, onClose, wrap]
  );

  // Props for individual menu items
  const getItemProps = useCallback(
    (index: number) => ({
      ref: (el: HTMLElement | null) => {
        itemRefs.current[index] = el;
      },
      tabIndex: focusedIndex === index ? 0 : -1,
      'aria-selected': focusedIndex === index,
      'data-focused': focusedIndex === index,
      onMouseEnter: () => setFocusedIndex(index),
      onClick: () => onSelect(index),
    }),
    [focusedIndex, onSelect]
  );

  // Props for the list container
  const listProps = {
    role: 'listbox' as const,
    'aria-activedescendant':
      focusedIndex >= 0 ? `dropdown-item-${focusedIndex}` : undefined,
    onKeyDown: handleKeyDown,
  };

  return {
    focusedIndex,
    setFocusedIndex,
    getItemProps,
    listProps,
    listRef,
  };
}

export default useDropdownKeyboard;
