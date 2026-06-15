import { Building2, Check, Home, Plus } from 'lucide-react';
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../shadcn/dropdown-menu';

const WORKSPACE_AVATAR_SWATCHES = [
  'hsl(142 71% 42%)',
  'hsl(199 89% 48%)',
  'hsl(262 83% 58%)',
  'hsl(25 95% 53%)',
  'hsl(330 81% 56%)',
] as const;

function workspaceAvatarColor(slug: string, override?: string) {
  if (override) return override;
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h + slug.charCodeAt(i) * (i + 17)) % WORKSPACE_AVATAR_SWATCHES.length;
  }
  return WORKSPACE_AVATAR_SWATCHES[h]!;
}

export type OrganizationWorkspaceRow = {
  slug: string;
  name: string;
  plan?: string;
  initials?: string;
  avatarColor?: string;
};

export type OrganizationWorkspaceSwitcherMenuContentProps = {
  workspaceOrganizations: OrganizationWorkspaceRow[];
  currentOrgSlug: string;
  onSelectOrganization: (orgSlug: string) => void;
  onCreateWorkspace?: () => void;
  onRequestCloseMenu?: () => void;
  /** Navigate to the full `/organizations` index page. Rendered as
   * a "View all organizations" menu item just above Create. */
  onViewAllOrganizations?: () => void;
  /** Project shell: open current org workspace home (`/$orgSlug`). Omitted in org-layer sidebar. */
  onGoToOrgHome?: () => void;
};

export function OrganizationWorkspaceSwitcherMenuContent({
  workspaceOrganizations,
  currentOrgSlug,
  onSelectOrganization,
  onCreateWorkspace,
  onRequestCloseMenu,
  onViewAllOrganizations,
  onGoToOrgHome,
}: OrganizationWorkspaceSwitcherMenuContentProps) {
  return (
    <>
      <DropdownMenuLabel className="text-muted-foreground text-xs">
        Your organization
      </DropdownMenuLabel>
      {workspaceOrganizations.map((o) => {
        const selected = o.slug === currentOrgSlug;
        const initials =
          o.initials ??
          (() => {
            const parts = o.name.trim().split(/\s+/).filter(Boolean);
            if (parts.length >= 2) {
              return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
            }
            return o.name.slice(0, 2).toUpperCase() || 'O';
          })();
        const dot = workspaceAvatarColor(o.slug, o.avatarColor);
        return (
          <DropdownMenuItem
            key={o.slug}
            className="gap-2"
            data-testid={`menu-org-${o.slug}`}
            onSelect={() => {
              onSelectOrganization(o.slug);
              onRequestCloseMenu?.();
            }}
          >
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold text-white"
              style={{ backgroundColor: dot }}
            >
              {initials}
            </span>
            <span className="min-w-0 flex-1 truncate">{o.name}</span>
            {selected ? <Check className="ml-auto size-4" /> : null}
          </DropdownMenuItem>
        );
      })}
      {onViewAllOrganizations || onCreateWorkspace ? (
        <DropdownMenuSeparator />
      ) : null}
      {onViewAllOrganizations ? (
        <DropdownMenuItem
          className="text-muted-foreground focus:text-foreground gap-2"
          data-testid="menu-view-all-organizations"
          onSelect={() => {
            onRequestCloseMenu?.();
            onViewAllOrganizations();
          }}
        >
          <Building2 className="size-4 shrink-0" aria-hidden />
          <span>View all organizations</span>
        </DropdownMenuItem>
      ) : null}
      {onCreateWorkspace ? (
        <DropdownMenuItem
          className="text-muted-foreground focus:text-foreground gap-2"
          data-testid="menu-create-workspace"
          onSelect={() => {
            onRequestCloseMenu?.();
            onCreateWorkspace();
          }}
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          <span>Create Organization</span>
        </DropdownMenuItem>
      ) : null}
      {onGoToOrgHome ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2"
            data-testid="menu-org-home"
            onSelect={() => {
              onGoToOrgHome();
              onRequestCloseMenu?.();
            }}
          >
            <Home className="size-4 shrink-0 opacity-70" />
            <span>Home</span>
          </DropdownMenuItem>
        </>
      ) : null}
    </>
  );
}
