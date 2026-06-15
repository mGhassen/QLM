import { type ReactNode } from 'react';

import { ProjectShellFrame } from './project-shell-frame';
import {
  ProjectShellSidebar,
  type SidebarPinnedItem,
  type SidebarPinnedTab,
  type SidebarAppGroup,
} from './project-shell-sidebar';
import {
  ProjectShellTabBar,
  type TabItem,
  type TabGroupDef,
  type TabGroupColor,
  type TabGroupLabels,
} from './project-shell-tab-bar';
import { TopbarActions, type ActivePanel } from '../layout/topbar-actions';
import { RightSidebar } from '../layout/right-sidebar';

export type ProjectShellLayoutProps = {
  // Sidebar
  /** Rendered at the top of the sidebar (e.g. org dropdown). */
  header?: ReactNode;
  /** Rendered at the bottom of the sidebar (e.g. user profile menu). */
  sidebarFooter?: ReactNode;
  /** When true, the left sidebar is not rendered. */
  hideSidebar?: boolean;
  /** Rendered in the tab bar when the sidebar is hidden (e.g. org menu). */
  tabBarLeading?: ReactNode;
  /** Rendered in the tab bar trailing area when the sidebar is hidden. */
  tabBarUserMenu?: ReactNode;
  pinnedItems: SidebarPinnedItem[];
  pinnedTabs?: SidebarPinnedTab[];
  appGroups: SidebarAppGroup[];
  onItemClick: (id: string, newTab: boolean) => void;
  onPinItem?: (id: string) => void;
  onAppAction?: (appId: string, actionId: string) => void;
  // Tabs
  tabs: TabItem[];
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabPin?: (id: string) => void;
  onTabReorder?: (activeId: string, overId: string) => void;
  onNewTab?: () => void;
  onReloadTab?: (id: string) => void;
  onCloseOthers?: (id: string) => void;
  onCloseToRight?: (id: string) => void;
  onCloseToLeft?: (id: string) => void;
  hasClosedTabs?: boolean;
  onReopenClosedTab?: () => void;
  // Tab groups
  tabGroups?: TabGroupDef[];
  groupLabels?: TabGroupLabels;
  onCreateGroup?: (
    tabIds: string[],
    title?: string,
    color?: TabGroupColor,
  ) => string;
  onRenameGroup?: (groupId: string, title: string) => void;
  onSetGroupColor?: (groupId: string, color: TabGroupColor) => void;
  onCollapseGroup?: (groupId: string, collapsed: boolean) => void;
  onUngroupAll?: (groupId: string) => void;
  onAddToGroup?: (tabId: string, groupId: string) => void;
  onRemoveFromGroup?: (tabId: string) => void;
  onReorderGroup?: (groupId: string, overId: string) => void;
  onCloseGroup?: (groupId: string) => void;
  onCloseGroupPreservePinned?: (groupId: string) => void;
  onPinGroup?: (groupId: string) => void;
  onCreateGroupFromSelection?: (tabIds: string[]) => void;
  onCloseAllTabs?: () => void;
  onPinAllTabs?: () => void;
  onUnpinAllTabs?: () => void;
  // Right sidebar — owned by the host so it can lift the state to a
  // DocsPanelProvider that plugins drive via useDocsPanel().
  activePanel: ActivePanel;
  onPanelChange: (panel: ActivePanel) => void;
  docsPanelContent?: ReactNode;
  /**
   * Body for the assistant panel (`activePanel === 'assistant'`). The
   * host injects `<AssistantPanelBody />` from `@guepard/qwery-agent`.
   */
  assistantPanelContent?: ReactNode;
  // Content
  children: ReactNode;
};

export function ProjectShellLayout({
  header,
  sidebarFooter,
  hideSidebar = false,
  tabBarLeading,
  tabBarUserMenu,
  pinnedItems,
  pinnedTabs,
  appGroups,
  onItemClick,
  onPinItem,
  onAppAction,
  tabs,
  onTabClick,
  onTabClose,
  onTabPin,
  onTabReorder,
  onNewTab,
  onReloadTab,
  onCloseOthers,
  onCloseToRight,
  onCloseToLeft,
  hasClosedTabs,
  onReopenClosedTab,
  tabGroups,
  groupLabels,
  onCreateGroup,
  onRenameGroup,
  onSetGroupColor,
  onCollapseGroup,
  onUngroupAll,
  onAddToGroup,
  onRemoveFromGroup,
  onReorderGroup,
  onCloseGroup,
  onCloseGroupPreservePinned,
  onPinGroup,
  onCreateGroupFromSelection,
  onCloseAllTabs,
  onPinAllTabs,
  onUnpinAllTabs,
  activePanel,
  onPanelChange,
  docsPanelContent,
  assistantPanelContent,
  children,
}: Readonly<ProjectShellLayoutProps>) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <ProjectShellFrame
        hideSidebar={hideSidebar}
        sidebar={
          <ProjectShellSidebar
            header={header}
            pinnedItems={pinnedItems}
            pinnedTabs={pinnedTabs}
            appGroups={appGroups}
            onItemClick={onItemClick}
            onPinItem={onPinItem}
            onAppAction={onAppAction}
            footer={sidebarFooter}
          />
        }
        tabBar={
          <ProjectShellTabBar
            tabs={tabs}
            onTabClick={onTabClick}
            onTabClose={onTabClose}
            onTabPin={onTabPin}
            onTabReorder={onTabReorder}
            onNewTab={onNewTab}
            onReloadTab={onReloadTab}
            onCloseOthers={onCloseOthers}
            onCloseToRight={onCloseToRight}
            onCloseToLeft={onCloseToLeft}
            hasClosedTabs={hasClosedTabs}
            onReopenClosedTab={onReopenClosedTab}
            tabGroups={tabGroups}
            groupLabels={groupLabels}
            onCreateGroup={onCreateGroup}
            onRenameGroup={onRenameGroup}
            onSetGroupColor={onSetGroupColor}
            onCollapseGroup={onCollapseGroup}
            onUngroupAll={onUngroupAll}
            onAddToGroup={onAddToGroup}
            onRemoveFromGroup={onRemoveFromGroup}
            onReorderGroup={onReorderGroup}
            onCloseGroup={onCloseGroup}
            onCloseGroupPreservePinned={onCloseGroupPreservePinned}
            onPinGroup={onPinGroup}
            onCreateGroupFromSelection={onCreateGroupFromSelection}
            onCloseAllTabs={onCloseAllTabs}
            onPinAllTabs={onPinAllTabs}
            onUnpinAllTabs={onUnpinAllTabs}
            leading={hideSidebar ? tabBarLeading : undefined}
            showSidebarTrigger={!hideSidebar}
            trailing={
              <div className="flex items-center gap-1">
                <TopbarActions
                  activePanel={activePanel}
                  onPanelChange={onPanelChange}
                />
                {hideSidebar ? tabBarUserMenu : null}
              </div>
            }
          />
        }
      >
        <RightSidebar
          activePanel={activePanel}
          docsPanelContent={docsPanelContent}
          assistantPanelContent={assistantPanelContent}
        >
          {children}
        </RightSidebar>
      </ProjectShellFrame>
    </div>
  );
}
