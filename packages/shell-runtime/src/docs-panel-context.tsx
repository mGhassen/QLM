import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Imperative control over the project shell's documentation panel.
 *
 * Plugins call `useDocsPanel().open(pageId)` to force-open the panel
 * and request a specific help page. The host resolves `pageId` to a
 * React component via the app registry's `HelpPages` map, then renders
 * that component inside the panel body.
 *
 * This file intentionally contains only state — no registry lookup,
 * no component rendering — so `@guepard/shell-runtime` doesn't take a
 * dependency on the host's app-registry shape. The host
 * (`apps/web/src/shell/project-shell-host.tsx`) owns both the provider
 * instance AND the registry-lookup logic that derives the rendered
 * component from `(routeBase, activePageId)`.
 */
export type DocsPanelContextValue = Readonly<{
  /** The id of the help page the current view has asked us to surface, or `null` when nothing is selected. */
  activePageId: string | null;
  /** True when the panel is visibly open in the shell. */
  isOpen: boolean;
  /** Force-open the panel on a specific page. Safe to call in a `useEffect`. */
  open: (pageId: string) => void;
  /** Close the panel. Used by the topbar button — plugins rarely call this directly. */
  close: () => void;
}>;

const DocsPanelContext = createContext<DocsPanelContextValue | null>(null);

export type DocsPanelProviderProps = Readonly<{
  children: ReactNode;
  /**
   * Fired whenever the active page id changes. The host listens to
   * this to flip its own `activePanel` state to `'documentation'` (or
   * back to `null` on close), since the topbar button and the
   * assistant panel share the same `ActivePanel` slot.
   */
  onOpenChange?: (open: boolean) => void;
}>;

export function DocsPanelProvider(
  props: DocsPanelProviderProps,
): React.ReactElement {
  const { children, onOpenChange } = props;
  const [activePageId, setActivePageId] = useState<string | null>(null);

  const open = useCallback(
    (pageId: string) => {
      setActivePageId(pageId);
      onOpenChange?.(true);
    },
    [onOpenChange],
  );

  const close = useCallback(() => {
    setActivePageId(null);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const value = useMemo<DocsPanelContextValue>(
    () => ({
      activePageId,
      isOpen: activePageId !== null,
      open,
      close,
    }),
    [activePageId, open, close],
  );

  return (
    <DocsPanelContext.Provider value={value}>
      {children}
    </DocsPanelContext.Provider>
  );
}

/**
 * Hook for plugins to drive the docs panel. Throws when called outside
 * a `DocsPanelProvider` so tests and Storybook stories that render
 * plugin components must wrap them in the provider (or a no-op one —
 * see the story helpers in `@guepard/integrations`).
 */
export function useDocsPanel(): DocsPanelContextValue {
  const ctx = useContext(DocsPanelContext);
  if (ctx === null) {
    throw new Error(
      'useDocsPanel() must be called inside a <DocsPanelProvider>. ' +
        'Mount the provider in the shell host or wrap your Storybook story in one.',
    );
  }
  return ctx;
}
