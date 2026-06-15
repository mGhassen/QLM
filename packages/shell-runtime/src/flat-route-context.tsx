import { createContext, useContext, type ReactNode } from 'react';

/**
 * Context set by the web app's flat catch-all route before rendering an
 * app's FlatRoot component. Apps read it via `useFlatRoute()` to get the
 * parsed URL params.
 */
export type FlatRouteContextValue = {
  prefix: string;
  params: Record<string, string>;
};

const FlatRouteContext = createContext<FlatRouteContextValue | null>(null);

export function FlatRouteProvider({
  value,
  children,
}: {
  value: FlatRouteContextValue;
  children: ReactNode;
}) {
  return (
    <FlatRouteContext.Provider value={value}>
      {children}
    </FlatRouteContext.Provider>
  );
}

export function useFlatRoute(): FlatRouteContextValue {
  const ctx = useContext(FlatRouteContext);
  if (!ctx) {
    throw new Error(
      'useFlatRoute must be used inside a FlatRouteProvider (rendered by the web app flat catch-all route)',
    );
  }
  return ctx;
}
