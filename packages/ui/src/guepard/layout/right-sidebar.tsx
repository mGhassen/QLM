import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { ImperativePanelGroupHandle } from 'react-resizable-panels';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../../shadcn/resizable';
import { cn } from '../../lib/utils';
import { DocumentationPanel } from './documentation-panel';
import type { ActivePanel } from './topbar-actions';

type RightSidebarProps = {
  activePanel: ActivePanel;
  /**
   * Contextual help page rendered inside the documentation panel. The
   * shell host computes this by resolving the current plugin's
   * `HelpPages` map against the page id from `useDocsPanel()`. `null`
   * when no plugin has requested help for the current view.
   */
  docsPanelContent?: ReactNode;
  /**
   * Body rendered inside the assistant panel. The shell host injects
   * `<AssistantPanelBody />` from `@guepard/qwery-agent` so this
   * package stays in the presentation layer (no feature deps — see
   * CLAUDE.md architecture rules).
   */
  assistantPanelContent?: ReactNode;
  children: ReactNode;
};

const DEFAULT_SIDEBAR_SIZE = 30;

export function RightSidebar({
  activePanel,
  docsPanelContent = null,
  assistantPanelContent = null,
  children,
}: Readonly<RightSidebarProps>) {
  const groupRef = useRef<ImperativePanelGroupHandle | null>(null);
  const isOpen = activePanel !== null;

  useLayoutEffect(() => {
    if (!groupRef.current) return;

    if (isOpen) {
      groupRef.current.setLayout([
        100 - DEFAULT_SIDEBAR_SIZE,
        DEFAULT_SIDEBAR_SIZE,
      ]);
    } else {
      groupRef.current.setLayout([100, 0]);
    }
  }, [isOpen]);

  return (
    <ResizablePanelGroup
      ref={groupRef}
      direction="horizontal"
      className="h-full w-full overflow-hidden"
    >
      <ResizablePanel
        defaultSize={isOpen ? 100 - DEFAULT_SIDEBAR_SIZE : 100}
        minSize={isOpen ? 40 : 100}
        className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
      >
        {children}
      </ResizablePanel>

      <ResizableHandle withHandle className={cn(!isOpen && 'hidden')} />

      <ResizablePanel
        defaultSize={isOpen ? DEFAULT_SIDEBAR_SIZE : 0}
        minSize={isOpen ? 20 : 0}
        maxSize={isOpen ? 50 : 0}
        className={cn(
          'flex h-full min-h-0 min-w-0 flex-col overflow-hidden',
          !isOpen && 'hidden',
        )}
      >
        {activePanel === 'documentation' && (
          <DocumentationPanel page={docsPanelContent} />
        )}
        {activePanel === 'assistant' && assistantPanelContent}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
