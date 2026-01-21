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

/**
 * Command Palette state and controls.
 */
interface CommandPaletteContextValue {
  /** Whether the palette is currently open */
  isOpen: boolean;
  /** Current search query */
  query: string;
  /** Update search query */
  setQuery: (query: string) => void;
  /** Open the palette */
  openPalette: () => void;
  /** Close the palette */
  closePalette: () => void;
  /** Toggle the palette open/closed */
  togglePalette: () => void;
  /** Ref for the search input (for focus management) */
  inputRef: React.RefObject<HTMLInputElement>;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null
);

/**
 * Hook to access Command Palette state and controls.
 * Must be used within CommandPaletteProvider.
 */
export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error(
      'useCommandPalette must be used within CommandPaletteProvider'
    );
  }
  return context;
}

/**
 * Provider for global Command Palette state.
 *
 * Deterministic state rules:
 * - Default CLOSED
 * - Opens only via explicit triggers (keyboard shortcut or top-bar trigger)
 * - Closes via ESC, outside click, or command execution
 * - Does NOT persist open state across reloads
 *
 * Focus management:
 * - On open: stores document.activeElement and focuses the palette search input
 * - On close: restores focus to the stored opener element (best-effort)
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<Element | null>(null);

  const openPalette = useCallback(() => {
    // Store the current active element for focus restoration
    openerRef.current = document.activeElement;
    setIsOpen(true);
    setQuery('');
  }, []);

  const closePalette = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    // Restore focus to opener element (best-effort)
    if (openerRef.current instanceof HTMLElement) {
      openerRef.current.focus();
    }
    openerRef.current = null;
  }, []);

  const togglePalette = useCallback(() => {
    if (isOpen) {
      closePalette();
    } else {
      openPalette();
    }
  }, [isOpen, openPalette, closePalette]);

  // Focus the input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Use requestAnimationFrame to ensure the element is mounted and visible
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K toggles palette
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux) - case-insensitive
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        togglePalette();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePalette]);

  const value: CommandPaletteContextValue = {
    isOpen,
    query,
    setQuery,
    openPalette,
    closePalette,
    togglePalette,
    inputRef,
  };

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}
