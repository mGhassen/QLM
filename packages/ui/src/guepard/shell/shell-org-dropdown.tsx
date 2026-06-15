import { useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';
import { RasmSymbolLogo } from '../guepard-symbol-logo';
import {
  type OrganizationWorkspaceRow,
  OrganizationWorkspaceSwitcherMenuContent,
} from '../organization/organization-workspace-switcher-menu';
import { useShellSidebar } from './project-shell-frame';

type ShellOrgDropdownProps = {
  organizationName: string;
  organizationPlan: string;
  workspaceOrganizations: OrganizationWorkspaceRow[];
  currentOrgSlug: string;
  onSelectOrganization: (orgSlug: string) => void;
  onCreateWorkspace: () => void;
  onViewAllOrganizations?: () => void;
};

export function ShellOrgDropdown({
  organizationName,
  organizationPlan,
  workspaceOrganizations,
  currentOrgSlug,
  onSelectOrganization,
  onCreateWorkspace,
  onViewAllOrganizations,
}: Readonly<ShellOrgDropdownProps>) {
  const [open, setOpen] = useState(false);
  const { collapsed } = useShellSidebar();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent flex w-full items-center justify-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
          data-testid="button-organization-selector"
        >
          <div className="flex aspect-square size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg">
            <RasmSymbolLogo className="size-full" aria-hidden />
          </div>
          {!collapsed && (
            <>
              <div className="grid min-w-0 flex-1 text-left text-xs leading-tight">
                <span className="truncate font-semibold">
                  {organizationName}
                </span>
                <span className="text-sidebar-foreground/70 truncate">
                  {organizationPlan}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 shrink-0" aria-hidden />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="max-h-[min(var(--radix-dropdown-menu-content-available-height),70vh)] min-w-56 overflow-y-auto"
        side={collapsed ? 'right' : 'bottom'}
        align="start"
      >
        <OrganizationWorkspaceSwitcherMenuContent
          workspaceOrganizations={workspaceOrganizations}
          currentOrgSlug={currentOrgSlug}
          onSelectOrganization={onSelectOrganization}
          onCreateWorkspace={onCreateWorkspace}
          onViewAllOrganizations={onViewAllOrganizations}
          onRequestCloseMenu={() => setOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
