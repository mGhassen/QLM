import { createContext, useContext } from 'react';

export type TabStateContextValue = {
  replaceNewTab: (routeBase: string) => void;
  openInBackground: (routeBase: string) => void;
};

export const TabStateContext = createContext<TabStateContextValue | null>(null);

export function useTabStateContext(): TabStateContextValue {
  const ctx = useContext(TabStateContext);
  if (!ctx)
    throw new Error('useTabStateContext must be used inside ProjectShellHost');
  return ctx;
}
