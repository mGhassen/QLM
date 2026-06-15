import {
  createElement,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

import {
  OrganizationOutput,
  ProjectOutput,
} from '@qlm/domain/usecases';
import { useUser } from '@qlm/supabase/hooks/use-user';
import { useSignOut } from '@qlm/supabase/hooks/use-sign-out';
import {
  ProjectShellLayout,
  ShellUserProfileMenu,
  TabSwitcherOverlay,
  QuickTabSwitcher,
  type SwitcherTabItem,
  type TabGroupDef,
  type TabGroupLabels,
  type TabItem,
} from '@qlm/ui/shell';
import {
  AppsPickerCollapsedMenuItem,
  AppsPickerMenu,
  usePinnedApps,
} from '@qlm/shell-apps';
import { ShellTopbar } from '@qlm/shell-topbar';
import type { ActivePanel } from '@qlm/ui/layout';
import { AssistantPanelBody } from '@qlm/qwery-agent';
import {
  DocsPanelProvider,
  ShellAppProvider,
  useDocsPanel,
  type GetDatasourceMetadataFn,
  type RunQueryFn,
  type TestConnectionFn,
} from '@qlm/shell-runtime';
import { useTranslation } from 'react-i18next';

import { useWorkspace } from '@/lib/context/workspace-context';
import { getAccessToken } from '@/lib/repositories/api-client';
import pathsConfig, { createProjectAppPath } from '@/config/paths.config';
import { getAppRegistry } from '@/shell/app-registry';
import {
  getDatasourceMetadata as getDatasourceMetadataImpl,
  testDatasourceConnection,
} from '@/shell/driver-dispatch';
import { predictionsClient } from '@/shell/predictions-client';
import { runQueryAgainstDatasource } from '@/shell/run-query';
import { useAssistantKeybinding } from '@/shell/use-assistant-keybinding';
import { useTabKeybindings } from '@/shell/use-tab-keybindings';
import {
  useTabState,
  TabStateContext,
  purgeStaleProjectTabsOnce,
  type TabStateContextValue,
} from '@/shell/tab-state';

const registry = getAppRegistry();

// Run once at module load — clears stale hrefs from before RFC-0028.
purgeStaleProjectTabsOnce();

const KIND_TO_ROUTE_BASE: Record<string, string> = {
  'database-name': 'databases',
  'node-name': 'infrastructure',
  'performance-profile-name': 'performance-profiles',
  'studio-doc': 'studio',
};

function resolveTabIcon(tabId: string): string | undefined {
  const entry = registry.getByRouteBase(tabId);
  if (entry) return entry.manifest.icon;
  const kind = tabId.split(':')[0];
  if (!kind) return undefined;
  const routeBase = KIND_TO_ROUTE_BASE[kind];
  if (!routeBase) return undefined;
  return registry.getByRouteBase(routeBase)?.manifest.icon;
}

export type VirtualTab = {
  /** Stable id (e.g. `notebook:my-nb-abc`). */
  id: string;
  title: string;
  href: string;
};

export type ProjectShellHostProps = {
  orgSlug: string;
  projectSlug: string;
  organization: OrganizationOutput;
  project: ProjectOutput;
  /** Which tab id should be active. Derived from current URL by the caller. */
  activeTabId: string;
  /** For flat routes — a virtual tab that should be present in the tab bar. */
  virtualTab?: VirtualTab;
  /** The app content rendered inside the shell. */
  children: ReactNode;
};

export function ProjectShellHost({
  orgSlug,
  projectSlug,
  organization,
  project,
  activeTabId,
  virtualTab,
  children,
}: Readonly<ProjectShellHostProps>) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();
  const { repositories } = useWorkspace();
  const { mutateAsync: signOut } = useSignOut();
  const { t } = useTranslation('shell');

  const pinnedItems = useMemo(() => registry.getPinnedItems(), []);
  const pickerAppGroups = useMemo(() => registry.getNavGroups(), []);
  const { pinnedIds, togglePin } = usePinnedApps(project.id);
  const [appsPickerOpen, setAppsPickerOpen] = useState(false);

  // ── Tab state ─────────────────────────────────────────────────────────
  const tabState = useTabState({
    projectId: project.id,
    projectSlug,
    orgSlug,
    activeTabId,
    virtualTab,
  });

  const {
    openTabs,
    tabGroups,
    closedTabsHistory,
    previewTabId,
    handleItemClick,
    handleTabClick,
    handleTabClose,
    handleTabPin,
    handleTabReorder,
    handleReloadTab,
    handleReopenClosedTab,
    handleNavBack,
    handleNavForward,
    handleCloseOthers,
    handleCloseToRight,
    handleCloseToLeft,
    handleNewTab,
    handleCreateGroup,
    handleRenameGroup,
    handleSetGroupColor,
    handleCollapseGroup,
    handleUngroupAll,
    handleAddToGroup,
    handleRemoveFromGroup,
    handleReorderGroup,
    handleCloseGroup,
    handleCloseGroupPreservePinned,
    handlePinGroup,
    handleCloseAllTabs,
    handlePinAllTabs,
    handleUnpinAllTabs,
    replaceNewTab,
    openInBackground,
  } = tabState;

  // Build group leader map for isGroupLeader field
  const groupLeaderMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const g of tabGroups) {
      if (g.tabIds.length > 0) map.set(g.tabIds[0]!, true);
    }
    return map;
  }, [tabGroups]);

  // Tab items for the layout (denormalized)
  const tabs: TabItem[] = useMemo(() => {
    return openTabs.map((t) => {
      const group = t.groupId
        ? tabGroups.find((g) => g.id === t.groupId)
        : undefined;
      return {
        id: t.id,
        title: t.title,
        active: t.id === activeTabId,
        pinned: t.pinned,
        icon: resolveTabIcon(t.id),
        groupId: t.groupId,
        groupColor: group?.color,
        groupCollapsed: group?.collapsed,
        isGroupLeader: t.groupId ? (groupLeaderMap.get(t.id) ?? false) : false,
        preview: t.id === previewTabId,
      };
    });
  }, [openTabs, tabGroups, activeTabId, groupLeaderMap, previewTabId]);

  const mruTabs: SwitcherTabItem[] = useMemo(() => {
    return tabState.mru
      .map((id) => openTabs.find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => ({
        id: t!.id,
        title: t!.title,
        icon: resolveTabIcon(t!.id),
        active: t!.id === activeTabId,
      }));
  }, [tabState.mru, openTabs, activeTabId]);

  const tabGroupDefs: TabGroupDef[] = useMemo(
    () =>
      tabGroups.map((g) => ({
        id: g.id,
        title: g.title,
        color: g.color,
        collapsed: g.collapsed,
        tabCount: g.tabIds.length,
      })),
    [tabGroups],
  );

  const groupLabels: TabGroupLabels = useMemo(
    () => ({
      addToGroup: t('tabGroup.contextMenu.addToGroup'),
      newGroup: t('tabGroup.contextMenu.newGroup'),
      removeFromGroup: t('tabGroup.contextMenu.removeFromGroup'),
      moveToGroup: t('tabGroup.contextMenu.moveToGroup'),
      ungroupAll: t('tabGroup.contextMenu.ungroupAll'),
      rename: t('tabGroup.contextMenu.renameGroup'),
      collapse: t('tabGroup.contextMenu.collapse'),
      expand: t('tabGroup.contextMenu.expand'),
      closeGroup: t('tabGroup.contextMenu.closeGroup'),
      pinGroup: t('tabGroup.contextMenu.pinGroup'),
      unnamedGroup: t('tabGroup.unnamedGroup'),
      selectedTabs: t('tabGroup.selected'),
      groupSelected: t('tabGroup.groupSelected', { count: 0 }),
    }),
    [t],
  );

  // Sidebar item state (active marker)
  const pinnedItemsWithState = useMemo(
    () =>
      pinnedItems.map((item) => {
        const entry = registry.getByRouteBase(item.id);
        const routeBase = entry?.manifest.routeBase ?? item.id;
        return { ...item, active: routeBase === activeTabId };
      }),
    [pinnedItems, activeTabId],
  );


  // ── Right sidebar / docs panel ─────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  useAssistantKeybinding(setActivePanel);

  // ── MRU / quick switcher overlays ─────────────────────────────────────
  const [mruSwitcherOpen, setMruSwitcherOpen] = useState(false);
  const [mruSwitcherIndex, setMruSwitcherIndex] = useState(1);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);

  useTabKeybindings({
    onReopenClosedTab: handleReopenClosedTab,
    onNavBack: handleNavBack,
    onNavForward: handleNavForward,
    onOpenMruSwitcher: () => {
      if (mruSwitcherOpen) {
        setMruSwitcherIndex((i) => (i + 1) % Math.max(tabState.mru.length, 1));
      } else {
        setMruSwitcherOpen(true);
        setMruSwitcherIndex(1);
      }
    },
    onOpenQuickSwitcher: () => setQuickSwitcherOpen((v) => !v),
  });

  const activeRouteBase = useMemo<string | null>(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const prjIdx = segments.indexOf('prj');
    if (prjIdx !== -1) return segments[prjIdx + 2] ?? null;
    return null;
  }, [location.pathname]);

  // ── User / auth ────────────────────────────────────────────────────────
  const email = user.data?.email ?? '';
  const currentUserIdForProfile = user.data?.id ?? '';

  // Shared query key with `shell.personalAccount.getMine()` in
  // `packages/shell-runtime/src/resources/personal-account.ts`.
  // Invalidations from the Profile page (RFC 0025 phase 1) propagate here.
  const personalAccountQuery = useQuery({
    queryKey: ['personal-account', currentUserIdForProfile],
    queryFn: () =>
      repositories.personalAccount.getMine(currentUserIdForProfile),
    enabled: currentUserIdForProfile.length > 0,
  });
  const displayName = personalAccountQuery.data?.name ?? email;
  const avatarUrl = personalAccountQuery.data?.pictureUrl ?? null;

  const handleLogOut = useCallback(async () => {
    await signOut();
    void navigate({ to: pathsConfig.auth.signIn });
  }, [signOut, navigate]);

  // ── Shell runtime ──────────────────────────────────────────────────────
  const runQuery: RunQueryFn = useCallback(
    (input) => runQueryAgainstDatasource(input),
    [],
  );
  const testConnection: TestConnectionFn = useCallback(
    (input) => testDatasourceConnection(input),
    [],
  );
  const getDatasourceMetadata: GetDatasourceMetadataFn = useCallback(
    (input) => getDatasourceMetadataImpl(input),
    [],
  );
  const currentUserId = user.data?.id ?? '';

  const { data: accessToken } = useQuery({
    queryKey: ['supabase:access-token'],
    queryFn: getAccessToken,
    staleTime: 30_000,
    enabled: currentUserId.length > 0,
  });

  const handleNavigate = useCallback(
    (path: string) => void navigate({ to: path }),
    [navigate],
  );

  // ── Narrow context for new-tab page ───────────────────────────────────
  const tabStateCtx: TabStateContextValue = useMemo(
    () => ({ replaceNewTab, openInBackground }),
    [replaceNewTab, openInBackground],
  );

  const pinnedTabs = useMemo(
    () =>
      pinnedIds
        .map((appId) => {
          const entry = registry.getByManifestId(appId);
          if (!entry) return null;
          const routeBase = entry.manifest.routeBase;
          const onStudio =
            appId === 'studio' &&
            (location.pathname.endsWith('/studio') ||
              activeTabId.startsWith('studio-doc:'));
          return {
            id: appId,
            label: entry.manifest.displayName,
            icon: entry.manifest.icon,
            active: onStudio || routeBase === activeTabId,
            actions:
              appId === 'studio'
                ? [
                    {
                      id: 'open-documents',
                      label: 'Documents',
                      icon: 'FileText',
                    },
                  ]
                : undefined,
          };
        })
        .filter((tab): tab is NonNullable<typeof tab> => tab !== null),
    [pinnedIds, activeTabId, location.pathname],
  );

  const handleAppAction = useCallback(
    (appId: string, actionId: string) => {
      if (appId === 'studio' && actionId === 'open-documents') {
        void navigate({
          to: '/prj/$projectSlug/studio',
          params: { projectSlug },
          search: (prev: Record<string, unknown>) => ({
            ...prev,
            docsPicker: 1,
          }),
        });
      }
    },
    [navigate, projectSlug],
  );

  const hideSidebar = organization.hideSidebar;

  const topbarMenuExtension = useCallback(
    ({ closeMenu }: { closeMenu: () => void }) => (
      <AppsPickerCollapsedMenuItem
        onOpen={() => {
          closeMenu();
          setAppsPickerOpen(true);
        }}
      />
    ),
    [],
  );

  const shellTopbar = (
    <ShellTopbar
      onNavigate={handleNavigate}
      expandMenuExtension={hideSidebar}
      collapsedMenuExtension={topbarMenuExtension}
    />
  );

  const appsPicker = (
    <AppsPickerMenu
      open={appsPickerOpen}
      onOpenChange={setAppsPickerOpen}
      appGroups={pickerAppGroups}
      pinnedIds={pinnedIds}
      onTogglePin={togglePin}
      onOpenApp={(appId) => handleItemClick(appId, false)}
      showTrigger={!hideSidebar}
    />
  );

  const userProfileMenu = (
    <ShellUserProfileMenu
      variant={hideSidebar ? 'tabbar' : 'sidebar'}
      displayName={displayName}
      email={email}
      avatarUrl={avatarUrl}
      onLogOutClick={handleLogOut}
      onHomePageClick={() => void navigate({ to: pathsConfig.app.home })}
      onSettingsClick={() =>
        void navigate({
          to: createProjectAppPath(projectSlug, 'user-settings'),
        })
      }
      platformStatus={{ ok: true, message: 'All systems normal.' }}
    />
  );

  return (
    <TabStateContext.Provider value={tabStateCtx}>
      <DocsPanelProvider
        onOpenChange={(open) => {
          setActivePanel(open ? 'documentation' : null);
        }}
      >
        <ShellAppProvider
          value={{
            projectId: project.id,
            projectSlug,
            orgSlug,
            organizationId: project.organizationId,
            currentUserId,
            authReady: Boolean(accessToken),
            repositories,
            runQuery,
            testConnection,
            getDatasourceMetadata,
            predictionsClient,
            projectTabs: { closeTab: handleTabClose },
          }}
        >
          <ProjectShellLayout
            hideSidebar={hideSidebar}
            header={
              hideSidebar ? undefined : (
                <div className="flex w-full min-w-0 items-center gap-0.5 pr-1">
                  <div className="min-w-0 flex-1">{shellTopbar}</div>
                  {appsPicker}
                </div>
              )
            }
            tabBarLeading={hideSidebar ? shellTopbar : undefined}
            tabBarUserMenu={hideSidebar ? userProfileMenu : undefined}
            sidebarFooter={hideSidebar ? undefined : userProfileMenu}
            pinnedItems={pinnedItemsWithState}
            pinnedTabs={pinnedTabs}
            appGroups={[]}
            onItemClick={handleItemClick}
            onAppAction={handleAppAction}
            tabs={tabs}
            onTabClick={handleTabClick}
            onTabClose={handleTabClose}
            onTabPin={handleTabPin}
            onTabReorder={handleTabReorder}
            onNewTab={handleNewTab}
            onReloadTab={handleReloadTab}
            onCloseOthers={handleCloseOthers}
            onCloseToRight={handleCloseToRight}
            onCloseToLeft={handleCloseToLeft}
            hasClosedTabs={closedTabsHistory.length > 0}
            onReopenClosedTab={handleReopenClosedTab}
            tabGroups={tabGroupDefs}
            groupLabels={groupLabels}
            onCreateGroup={handleCreateGroup}
            onRenameGroup={handleRenameGroup}
            onSetGroupColor={handleSetGroupColor}
            onCollapseGroup={handleCollapseGroup}
            onUngroupAll={handleUngroupAll}
            onAddToGroup={handleAddToGroup}
            onRemoveFromGroup={handleRemoveFromGroup}
            onReorderGroup={handleReorderGroup}
            onCloseGroup={handleCloseGroup}
            onCloseGroupPreservePinned={handleCloseGroupPreservePinned}
            onPinGroup={handlePinGroup}
            onCreateGroupFromSelection={handleCreateGroup}
            onCloseAllTabs={handleCloseAllTabs}
            onPinAllTabs={handlePinAllTabs}
            onUnpinAllTabs={handleUnpinAllTabs}
            activePanel={activePanel}
            onPanelChange={setActivePanel}
            docsPanelContent={
              <ActiveHelpPage activeRouteBase={activeRouteBase} />
            }
            assistantPanelContent={
              <AssistantPanelBody
                initialSuggestions={registry.getSuggestedPrompts(
                  activeRouteBase,
                )}
              />
            }
          >
            {children}
          </ProjectShellLayout>
          {hideSidebar ? appsPicker : null}
        </ShellAppProvider>
      </DocsPanelProvider>

      {mruSwitcherOpen && (
        <TabSwitcherOverlay
          tabs={mruTabs}
          selectedIndex={mruSwitcherIndex}
          labels={{
            title: t('tabSwitcher.title'),
            hint: t('tabSwitcher.hint'),
          }}
          onClose={() => setMruSwitcherOpen(false)}
          onConfirm={(tabId) => {
            setMruSwitcherOpen(false);
            handleTabClick(tabId);
          }}
        />
      )}

      {quickSwitcherOpen && (
        <QuickTabSwitcher
          tabs={mruTabs}
          labels={{
            title: t('quickTabSwitcher.title'),
            placeholder: t('quickTabSwitcher.placeholder'),
            noResults: t('quickTabSwitcher.noResults'),
          }}
          onClose={() => setQuickSwitcherOpen(false)}
          onConfirm={(tabId) => {
            setQuickSwitcherOpen(false);
            handleTabClick(tabId);
          }}
        />
      )}
    </TabStateContext.Provider>
  );
}

function ActiveHelpPage({
  activeRouteBase,
}: Readonly<{ activeRouteBase: string | null }>) {
  const docs = useDocsPanel();
  if (activeRouteBase === null || docs.activePageId === null) {
    return null;
  }
  const PageComponent = registry.getHelpPage(
    activeRouteBase,
    docs.activePageId,
  );
  return PageComponent ? createElement(PageComponent) : null;
}

export function useProjectShellContextBySlug(projectSlug: string) {
  const { repositories } = useWorkspace();

  const {
    data: project,
    isLoading: isProjectLoading,
    isFetched: isProjectFetched,
    isError: isProjectError,
  } = useQuery({
    queryKey: ['project-by-slug', projectSlug],
    retry: false,
    queryFn: async () => {
      const found = await repositories.project.findBySlug(projectSlug);
      return found ? ProjectOutput.new(found) : null;
    },
  });

  const { data: organization, isLoading: isOrgLoading } = useQuery({
    queryKey: ['organization-by-id', project?.organizationId],
    queryFn: async () => {
      if (!project) return null;
      const org = await repositories.organization.findById(
        project.organizationId,
      );
      return org ? OrganizationOutput.new(org) : null;
    },
    enabled: !!project,
    retry: false,
  });

  const projectNotFound =
    isProjectFetched && !isProjectLoading && !isProjectError && !project;

  return {
    organization: organization ?? null,
    project: project ?? null,
    isProjectLoading,
    isOrgLoading,
    isLoading: isProjectLoading || (!!project && isOrgLoading),
    projectNotFound,
  };
}
