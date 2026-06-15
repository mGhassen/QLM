import { createContext, useContext, type ReactNode } from 'react';

export type StudioShellContextValue = {
  projectSlug: string;
  activeSlug?: string;
  openDoc: (slug: string, title?: string) => void;
  closeDocTab: (slug: string) => void;
  syncDocTitle: (title: string) => void;
  openDocsPicker: () => void;
};

const StudioShellContext = createContext<StudioShellContextValue | null>(null);

export function StudioShellProvider({
  children,
  ...value
}: StudioShellContextValue & { children: ReactNode }) {
  return (
    <StudioShellContext.Provider value={value}>
      {children}
    </StudioShellContext.Provider>
  );
}

export function useStudioShell(): StudioShellContextValue {
  const value = useContext(StudioShellContext);
  if (!value) {
    throw new Error('useStudioShell must be used within StudioShellProvider');
  }
  return value;
}
