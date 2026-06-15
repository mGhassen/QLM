import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '../../shadcn/sidebar';
import { OrganizationDropdown } from '../organization/organization-dropdown';
import { OrganizationWorkspaceRow } from '../organization/organization-workspace-switcher-menu';
import {
  UserProfileMenu,
  type UserProfileMenuProps,
} from './user-profile-menu';

export type SidebarNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

export type SidebarNavGroup = {
  label: string;
  items: SidebarNavItem[];
};

export type RootSidebarProps = {
  organizationName: string;
  organizationPlan: string;
  workspaceOrganizations: OrganizationWorkspaceRow[];
  currentOrgSlug: string;
  onCreateWorkspace: () => void;
  onSelectOrganization: (orgSlug: string) => void;
  onViewAllOrganizations?: () => void;
  navigationGroups: SidebarNavGroup[];
  userProfile: UserProfileMenuProps;
  collapsible?: 'offcanvas' | 'icon' | 'none';
  resizable?: boolean;
};

export function RootSidebar({
  organizationName,
  organizationPlan,
  workspaceOrganizations,
  currentOrgSlug,
  onCreateWorkspace,
  onSelectOrganization,
  onViewAllOrganizations,
  navigationGroups,
  userProfile,
  collapsible = 'icon',
  resizable = true,
}: Readonly<RootSidebarProps>) {
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar
      collapsible={collapsible}
      resizable={resizable}
      className="border-sidebar-border bg-sidebar flex h-full flex-col border-r"
    >
      <SidebarHeader className="border-sidebar-border flex h-[38px] shrink-0 flex-row items-center gap-0 border-b p-0 px-2 group-data-[collapsible=icon]:px-1">
        <OrganizationDropdown
          workspaceMenuOpen={workspaceMenuOpen}
          setWorkspaceMenuOpen={setWorkspaceMenuOpen}
          organizationName={organizationName}
          organizationPlan={organizationPlan}
          workspaceOrganizations={workspaceOrganizations}
          currentOrgSlug={currentOrgSlug}
          onSelectOrganization={onSelectOrganization}
          onCreateWorkspace={onCreateWorkspace}
          onViewAllOrganizations={onViewAllOrganizations}
        />
      </SidebarHeader>

      <SidebarContent className="gap-2 overflow-y-auto p-2">
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.path}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserProfileMenu {...userProfile} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {collapsible !== 'none' && <SidebarRail />}
    </Sidebar>
  );
}
