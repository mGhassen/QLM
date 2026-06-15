import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';
import { RasmSymbolLogo } from '../guepard-symbol-logo';
import { ChevronsUpDown } from 'lucide-react';
import {
  type OrganizationWorkspaceRow,
  OrganizationWorkspaceSwitcherMenuContent,
} from './organization-workspace-switcher-menu';

type OrganizationDropdownProps = {
  workspaceMenuOpen: boolean;
  setWorkspaceMenuOpen: (open: boolean) => void;
  organizationName: string;
  organizationPlan: string;
  workspaceOrganizations: OrganizationWorkspaceRow[];
  currentOrgSlug: string;
  onSelectOrganization: (orgSlug: string) => void;
  onCreateWorkspace: () => void;
  onViewAllOrganizations?: () => void;
};

export function OrganizationDropdown({
  workspaceMenuOpen,
  setWorkspaceMenuOpen,
  organizationName,
  organizationPlan,
  workspaceOrganizations,
  currentOrgSlug,
  onSelectOrganization,
  onCreateWorkspace,
  onViewAllOrganizations,
}: Readonly<OrganizationDropdownProps>) {
  return (
    <DropdownMenu open={workspaceMenuOpen} onOpenChange={setWorkspaceMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent flex h-full w-full items-center gap-2 rounded-md px-1.5 text-left transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          data-testid="button-organization-selector"
        >
          <div className="flex aspect-square size-6 shrink-0 items-center justify-center overflow-hidden rounded-md">
            <RasmSymbolLogo className="size-full" aria-hidden />
          </div>
          <div className="grid min-w-0 flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">{organizationName}</span>
            {organizationPlan && (
              <span className="text-sidebar-foreground/70 truncate">
                {organizationPlan}
              </span>
            )}
          </div>
          <ChevronsUpDown
            className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="max-h-[min(var(--radix-dropdown-menu-content-available-height),70vh)] min-w-56 overflow-y-auto"
        align="start"
      >
        <OrganizationWorkspaceSwitcherMenuContent
          workspaceOrganizations={workspaceOrganizations}
          currentOrgSlug={currentOrgSlug}
          onSelectOrganization={onSelectOrganization}
          onCreateWorkspace={onCreateWorkspace}
          onViewAllOrganizations={onViewAllOrganizations}
          onRequestCloseMenu={() => setWorkspaceMenuOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
