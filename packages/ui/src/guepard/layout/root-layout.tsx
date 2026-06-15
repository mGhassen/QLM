import { type CSSProperties, type ReactNode, useState } from 'react';

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '../../shadcn/sidebar';
import { OrganizationWorkspaceRow } from '../organization/organization-workspace-switcher-menu';
import { RootSidebar, type SidebarNavGroup } from './root-sidebar';
import type { UserProfileMenuProps } from './user-profile-menu';
import { TopbarActions, type ActivePanel } from './topbar-actions';
import { RightSidebar } from './right-sidebar';

const workspaceSidebarStyle = {
  '--sidebar-width': '14rem',
  '--sidebar-width-icon': '3rem',
} as CSSProperties;

type SidebarCollapsible = 'offcanvas' | 'icon' | 'none';

export type RootLayoutProps = {
  organizationName: string;
  organizationPlan: string;
  workspaceOrganizations: OrganizationWorkspaceRow[];
  currentOrgSlug: string;
  onCreateWorkspace: () => void;
  onSelectOrganization: (orgSlug: string) => void;
  onViewAllOrganizations?: () => void;
  navigationGroups: SidebarNavGroup[];
  userProfile: UserProfileMenuProps;
  /**
   * React node rendered inside the documentation panel body. Consumers
   * resolve the current view's help page (via `useDocsPanel()` + the
   * app registry) and pass the rendered element here.
   */
  docsPanelContent?: ReactNode;
  /**
   * React node rendered inside the assistant panel body. The host
   * injects `<AssistantPanelBody />` from `@guepard/qwery-agent`.
   */
  assistantPanelContent?: ReactNode;
  sidebarCollapsible?: SidebarCollapsible;
  sidebarResizable?: boolean;
  showSidebarTrigger?: boolean;
  children: ReactNode;
};

export function RootLayout({
  organizationName,
  organizationPlan,
  workspaceOrganizations,
  currentOrgSlug,
  onCreateWorkspace,
  onSelectOrganization,
  onViewAllOrganizations,
  navigationGroups,
  userProfile,
  docsPanelContent,
  assistantPanelContent,
  sidebarCollapsible = 'icon',
  sidebarResizable = true,
  showSidebarTrigger = sidebarCollapsible !== 'none',
  children,
}: Readonly<RootLayoutProps>) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <SidebarProvider
        style={workspaceSidebarStyle}
        defaultOpen={true}
        className="min-h-0 flex-1 overflow-hidden"
      >
        <RootSidebar
          organizationName={organizationName}
          organizationPlan={organizationPlan}
          workspaceOrganizations={workspaceOrganizations}
          currentOrgSlug={currentOrgSlug}
          onCreateWorkspace={onCreateWorkspace}
          onSelectOrganization={onSelectOrganization}
          onViewAllOrganizations={onViewAllOrganizations}
          navigationGroups={navigationGroups}
          userProfile={userProfile}
          collapsible={sidebarCollapsible}
          resizable={sidebarResizable}
        />
        <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <header className="bg-background flex h-[38px] shrink-0 items-center gap-2 border-b px-2 md:px-3">
            {showSidebarTrigger && <SidebarTrigger />}
            <div className="ml-auto">
              <TopbarActions
                activePanel={activePanel}
                onPanelChange={setActivePanel}
              />
            </div>
          </header>
          <RightSidebar
            activePanel={activePanel}
            docsPanelContent={docsPanelContent}
            assistantPanelContent={assistantPanelContent}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {children}
            </div>
          </RightSidebar>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
