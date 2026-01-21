'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface UnsavedChangesContextValue {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
}

const UnsavedChangesContext = createContext<
  UnsavedChangesContextValue | undefined
>(undefined);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    if (hasUnsavedChanges && typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [hasUnsavedChanges]);

  const value = useMemo(
    () => ({ hasUnsavedChanges, setHasUnsavedChanges }),
    [hasUnsavedChanges]
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges(): UnsavedChangesContextValue {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error(
      'useUnsavedChanges must be used within an UnsavedChangesProvider'
    );
  }
  return context;
}
