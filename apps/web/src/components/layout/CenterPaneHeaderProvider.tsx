'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

/**
 * [CENTER-PANE-NAV-REMODEL-1] Header state context for the center pane.
 *
 * State fields (all optional):
 * - breadcrumbs: Override the shell breadcrumbs
 * - title: Override the shell title
 * - description: Optional one-line description (muted)
 * - actions: React node for right-aligned header actions
 * - hideHeader: When true, shell header is not rendered at all
 */

export interface CenterPaneHeaderState {
  breadcrumbs?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  hideHeader?: boolean;
}

interface CenterPaneHeaderContextValue {
  headerState: CenterPaneHeaderState;
  setHeaderState: (state: CenterPaneHeaderState) => void;
  resetHeaderState: () => void;
}

const CenterPaneHeaderContext =
  createContext<CenterPaneHeaderContextValue | null>(null);

const DEFAULT_HEADER_STATE: CenterPaneHeaderState = {};

export function CenterPaneHeaderProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [headerState, setHeaderStateInternal] =
    useState<CenterPaneHeaderState>(DEFAULT_HEADER_STATE);

  const setHeaderState = useCallback((state: CenterPaneHeaderState) => {
    setHeaderStateInternal(state);
  }, []);

  const resetHeaderState = useCallback(() => {
    setHeaderStateInternal(DEFAULT_HEADER_STATE);
  }, []);

  return (
    <CenterPaneHeaderContext.Provider
      value={{ headerState, setHeaderState, resetHeaderState }}
    >
      {children}
    </CenterPaneHeaderContext.Provider>
  );
}

/**
 * Hook to set/reset center pane header fields per-page.
 * Resets to defaults on unmount (no persistence).
 */
export function useCenterPaneHeader() {
  const context = useContext(CenterPaneHeaderContext);
  if (!context) {
    throw new Error(
      'useCenterPaneHeader must be used within CenterPaneHeaderProvider'
    );
  }

  const { setHeaderState, resetHeaderState, headerState } = context;

  // Convenience wrapper that resets on unmount
  const setHeader = useCallback(
    (state: CenterPaneHeaderState) => {
      setHeaderState(state);
    },
    [setHeaderState]
  );

  // Effect to reset on unmount
  useEffect(() => {
    return () => {
      resetHeaderState();
    };
  }, [resetHeaderState]);

  return {
    setHeader,
    resetHeader: resetHeaderState,
    currentHeader: headerState,
  };
}

/**
 * Internal hook for LayoutShell to read header state without unmount reset.
 */
export function useCenterPaneHeaderState() {
  const context = useContext(CenterPaneHeaderContext);
  if (!context) {
    throw new Error(
      'useCenterPaneHeaderState must be used within CenterPaneHeaderProvider'
    );
  }
  return context.headerState;
}
