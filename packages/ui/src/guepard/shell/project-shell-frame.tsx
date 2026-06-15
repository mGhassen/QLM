import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { PanelLeftClose } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../../shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../shadcn/tooltip';

// ---------------------------------------------------------------------------
// Sidebar collapse context
// ---------------------------------------------------------------------------

type ShellSidebarContextValue = {
  collapsed: boolean;
  hidden: boolean;
  toggle: () => void;
};

const ShellSidebarContext = createContext<ShellSidebarContextValue>({
  collapsed: false,
  hidden: false,
  toggle: () => {},
});

export function useShellSidebar() {
  return useContext(ShellSidebarContext);
}

/** Toggle button for the project shell sidebar — place in the tab bar. */
export function ShellSidebarTrigger() {
  const { collapsed, hidden, toggle } = useShellSidebar();

  if (hidden) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-full w-full rounded-none"
            onClick={toggle}
          >
            <PanelLeftClose
              className={cn(
                'h-4 w-4 transition-transform',
                collapsed && 'rotate-180',
              )}
            />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {collapsed ? 'Show sidebar' : 'Hide sidebar'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Frame
// ---------------------------------------------------------------------------

const SIDEBAR_WIDTH_ICON = '3rem';

export type ProjectShellFrameProps = {
  /** Left sidebar with pinned items + apps grouped by category. */
  sidebar: ReactNode;
  /** Top tab bar. */
  tabBar: ReactNode;
  /** Main content area. */
  children: ReactNode;
  className?: string;
  /** Width of the sidebar column when expanded. */
  sidebarWidth?: string;
  /** When true, the sidebar column is not rendered at all. */
  hideSidebar?: boolean;
};

export function ProjectShellFrame({
  sidebar,
  tabBar,
  children,
  className,
  sidebarWidth = '14rem',
  hideSidebar = false,
}: Readonly<ProjectShellFrameProps>) {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = useCallback(() => setCollapsed((prev) => !prev), []);

  return (
    <ShellSidebarContext.Provider
      value={{ collapsed, hidden: hideSidebar, toggle }}
    >
      <div
        className={cn(
          'flex h-full min-h-0 w-full min-w-0 flex-row overflow-hidden',
          className,
        )}
      >
        {!hideSidebar && (
          <div
            className="flex h-full shrink-0 flex-col overflow-hidden transition-[width] duration-200 ease-in-out"
            style={{ width: collapsed ? SIDEBAR_WIDTH_ICON : sidebarWidth }}
          >
            {sidebar}
          </div>
        )}

        {/* Tab bar + content */}
        <div className="bg-background flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {tabBar}
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </ShellSidebarContext.Provider>
  );
}
