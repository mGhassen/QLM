import { useQuery } from '@tanstack/react-query';
import { Check, Plus, Receipt, Search, Settings, UserPlus } from 'lucide-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useShell } from '@guepard/shell-runtime';
import { useShellSidebar } from '@guepard/ui/shell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@guepard/ui/dropdown-menu';

import { CreateOrgDialog } from './create-org-dialog';
import { CreateProjectDialog } from './create-project-dialog';
import { TopbarTrigger } from './topbar-trigger';

/**
 * Composite that wires the trigger, the level-1 dropdown with project +
 * organization cascade submenus, and the two create-dialogs to live
 * shell data (`useShell()`). Uses Radix DropdownMenu primitives for
 * anchoring, keyboard nav, outside-click, portal, and cascade submenu
 * positioning.
 *
 * Spec reference: docs/specs/0024-global-shell-ui-phase1.md §3.2, §3.3, §4.1.
 */
export interface ShellTopbarProps {
  onNavigate: (path: string) => void;
  /** Rendered inside the org/project menu when the sidebar is collapsed. */
  collapsedMenuExtension?: (api: { closeMenu: () => void }) => ReactNode;
  /** Always show `collapsedMenuExtension` (e.g. when the sidebar is hidden). */
  expandMenuExtension?: boolean;
}

type DialogState = null | 'create-project' | 'create-org';

function deriveColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export function ShellTopbar(props: Readonly<ShellTopbarProps>) {
  const { onNavigate, collapsedMenuExtension, expandMenuExtension = false } =
    props;
  const { t } = useTranslation('shell');
  const shell = useShell();
  const { collapsed } = useShellSidebar();

  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [projectQuery, setProjectQuery] = useState('');
  const [orgQuery, setOrgQuery] = useState('');
  const [serverError, setServerError] = useState<{
    project?: string;
    org?: string;
  }>({});

  // ── Live data ───────────────────────────────────────────────────────
  const orgsQuery = useQuery({
    queryKey: shell.organizations.keys.all,
    queryFn: () => shell.organizations.list(),
  });

  const activeOrg = useMemo(
    () => orgsQuery.data?.find((o) => o.slug === shell.orgSlug) ?? null,
    [orgsQuery.data, shell.orgSlug],
  );

  const projectsQuery = useQuery({
    enabled: !!activeOrg,
    queryKey: activeOrg
      ? shell.projects.keys.listByOrganization(activeOrg.id)
      : ['projects', 'disabled'],
    queryFn: () => shell.projects.list({ organizationId: activeOrg!.id }),
  });

  const activeProject = useMemo(
    () => projectsQuery.data?.find((p) => p.slug === shell.projectSlug) ?? null,
    [projectsQuery.data, shell.projectSlug],
  );

  const orgLogoInitial = (activeOrg?.name ?? '?').slice(0, 1).toUpperCase();
  const orgLogoColor = deriveColor(activeOrg?.id ?? 'default');

  const setProjectError = useCallback(
    (msg?: string) => setServerError((s) => ({ ...s, project: msg })),
    [],
  );
  const setOrgError = useCallback(
    (msg?: string) => setServerError((s) => ({ ...s, org: msg })),
    [],
  );

  // ── Callbacks ───────────────────────────────────────────────────────

  const closeAll = () => {
    setOpen(false);
    setDialog(null);
  };

  const handleNavigate = (path: string) => {
    closeAll();
    onNavigate(path);
  };

  const handleSelectProject = async (projectId: string) => {
    const project = projectsQuery.data?.find((p) => p.id === projectId);
    if (!project || !activeOrg) return;
    closeAll();
    await shell.userPreferences.setLastProject(activeOrg.id, project.id);
    onNavigate(`/prj/${project.slug}`);
  };

  const handleSelectOrg = async (orgId: string) => {
    closeAll();
    const { slug } = await shell.organizations.switchTo(orgId);
    onNavigate(`/prj/${slug}`);
  };

  const handleCreateProject = async (values: { name: string }) => {
    if (!activeOrg) return;
    setProjectError(undefined);
    try {
      const project = await shell.projects.create({
        organizationId: activeOrg.id,
        name: values.name,
        createdBy: shell.projectId,
      });
      await shell.projects.invalidate.list(activeOrg.id);
      setDialog(null);
      onNavigate(`/prj/${project.slug}`);
    } catch (err) {
      setProjectError(
        err instanceof Error ? err.message : t('errors.loadFailed'),
      );
    }
  };

  const handleCreateOrg = async (values: { name: string }) => {
    setOrgError(undefined);
    try {
      const org = await shell.organizations.create({
        name: values.name,
        userId: shell.projectId,
        createdBy: shell.projectId,
      });
      await shell.organizations.invalidate.all();
      const { slug } = await shell.organizations.switchTo(org.id);
      setDialog(null);
      onNavigate(`/prj/${slug}`);
    } catch (err) {
      setOrgError(err instanceof Error ? err.message : t('errors.loadFailed'));
    }
  };

  // ── Render ──────────────────────────────────────────────────────────
  const allProjects = projectsQuery.data ?? [];
  const allOrgs = orgsQuery.data ?? [];
  const projects = useMemo(() => {
    const q = projectQuery.trim().toLowerCase();
    if (!q) return allProjects;
    return allProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [allProjects, projectQuery]);
  const orgs = useMemo(() => {
    const q = orgQuery.trim().toLowerCase();
    if (!q) return allOrgs;
    return allOrgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
    );
  }, [allOrgs, orgQuery]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setProjectQuery('');
      setOrgQuery('');
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <TopbarTrigger
            orgInitial={orgLogoInitial}
            orgColor={orgLogoColor}
            projectName={activeProject?.name ?? ''}
            isOpen={open}
            onOpen={() => {}}
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
            {t('dropdown.section.project')}
          </DropdownMenuLabel>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <LogoBadge initial={orgLogoInitial} color={orgLogoColor} />
              <span className="flex-1 truncate">
                {activeProject?.name ?? ''}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
              <SearchInput
                value={projectQuery}
                onChange={setProjectQuery}
                placeholder={t('submenu.project.searchPlaceholder')}
              />
              <DropdownMenuSeparator />
              {projects.length === 0 ? (
                <div className="text-muted-foreground px-3 py-2 text-sm">—</div>
              ) : (
                projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    onSelect={() => void handleSelectProject(project.id)}
                  >
                    <span className="flex-1 truncate">{project.name}</span>
                    {project.id === activeProject?.id ? (
                      <Check className="size-4 shrink-0" />
                    ) : null}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setDialog('create-project')}>
                <Plus className="size-4" />
                <span>{t('submenu.project.newProject')}</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem
            onSelect={() =>
              handleNavigate(`/prj/${shell.projectSlug}/project-settings`)
            }
          >
            <Settings className="size-4" />
            <span>{t('dropdown.shortcut.projectSettings')}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
            {t('dropdown.section.organization')}
          </DropdownMenuLabel>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <LogoBadge initial={orgLogoInitial} color={orgLogoColor} />
              <span className="flex-1 truncate">{activeOrg?.name ?? ''}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-64">
              <SearchInput
                value={orgQuery}
                onChange={setOrgQuery}
                placeholder={t('submenu.org.searchPlaceholder')}
              />
              <DropdownMenuSeparator />
              {orgs.length === 0 ? (
                <div className="text-muted-foreground px-3 py-2 text-sm">—</div>
              ) : (
                orgs.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onSelect={() => void handleSelectOrg(org.id)}
                  >
                    <span className="flex-1 truncate">{org.name}</span>
                    {org.id === activeOrg?.id ? (
                      <Check className="size-4 shrink-0" />
                    ) : null}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setDialog('create-org')}>
                <Plus className="size-4" />
                <span>{t('submenu.org.newOrganization')}</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem
            onSelect={() =>
              handleNavigate(
                `/prj/${shell.projectSlug}/org-settings?section=members`,
              )
            }
          >
            <UserPlus className="size-4" />
            <span>{t('dropdown.shortcut.inviteMembers')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              handleNavigate(
                `/prj/${shell.projectSlug}/org-settings?section=billing`,
              )
            }
          >
            <Receipt className="size-4" />
            <span>{t('dropdown.shortcut.billing')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              handleNavigate(`/prj/${shell.projectSlug}/org-settings`)
            }
          >
            <Settings className="size-4" />
            <span>{t('dropdown.shortcut.organizationSettings')}</span>
          </DropdownMenuItem>

          {(collapsed || expandMenuExtension) &&
            collapsedMenuExtension?.({
              closeMenu: closeAll,
            })}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateProjectDialog
        open={dialog === 'create-project'}
        onOpenChange={(next) => setDialog(next ? 'create-project' : null)}
        onSubmit={handleCreateProject}
        serverError={serverError.project}
      />
      <CreateOrgDialog
        open={dialog === 'create-org'}
        onOpenChange={(next) => setDialog(next ? 'create-org' : null)}
        onSubmit={handleCreateOrg}
        serverError={serverError.org}
      />
    </>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <Search className="text-muted-foreground size-4 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus
        // Radix owns Arrow/Enter/typeahead on the menu root; stop those here
        // so typing 'o' doesn't jump focus to the first menu item starting
        // with 'o'. We still let Escape bubble so it closes the menu.
        onKeyDown={(e) => {
          if (e.key !== 'Escape') e.stopPropagation();
        }}
        className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
      />
    </div>
  );
}

function LogoBadge({ initial, color }: { initial: string; color: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-5 shrink-0 items-center justify-center rounded text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  );
}
