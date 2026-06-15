import { useState, useCallback, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChevronsUpDown, LogOut, Moon, Sun, Computer } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';
import { ProfileAvatar } from '../profile-avatar';
import { Markdown } from '../markdown';
import type { ActivePanel } from '../layout/topbar-actions';
import { ProjectShellLayout } from './project-shell-layout';
import type {
  SidebarPinnedItem,
  SidebarAppGroup,
} from './project-shell-sidebar';
import type { TabItem } from './project-shell-tab-bar';

const PINNED_ITEMS: SidebarPinnedItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
];

const APP_GROUPS: SidebarAppGroup[] = [
  {
    title: 'Ops',
    items: [
      { id: 'databases', label: 'Databases', icon: 'Database' },
      { id: 'nodes', label: 'Nodes', icon: 'Server' },
      {
        id: 'performance-profiles',
        label: 'Performance Profiles',
        icon: 'Gauge',
      },
      { id: 'integrations', label: 'Integrations', icon: 'Link' },
    ],
  },
  {
    title: 'Data',
    items: [
      { id: 'datasources', label: 'Datasources', icon: 'FolderOpen' },
      { id: 'notebook', label: 'Notebook', icon: 'Notebook' },
      { id: 'tasks', label: 'Tasks', icon: 'ListTodo' },
    ],
  },
  {
    title: 'AI',
    items: [
      { id: 'models', label: 'Models', icon: 'Brain' },
      { id: 'agents', label: 'Agents', icon: 'Bot' },
      { id: 'skills', label: 'Skills', icon: 'Wrench' },
      { id: 'commands', label: 'Commands', icon: 'Terminal' },
      { id: 'knowledge', label: 'Knowledge', icon: 'BookOpen' },
      { id: 'ontology', label: 'Ontology', icon: 'Network' },
      { id: 'graph', label: 'Graph', icon: 'CircuitBoard' },
    ],
  },
  {
    title: 'Artefacts',
    items: [
      { id: 'reports', label: 'Reports', icon: 'FileText' },
      { id: 'data-apps', label: 'Data Apps', icon: 'Globe' },
      { id: 'api', label: 'API', icon: 'Blocks' },
    ],
  },
];

const SAMPLE_DOCS_MARKDOWN = `# Getting started

This is the contextual documentation panel. Plugins render whatever
help content they want here via \`useDocsPanel().open(pageId)\` and
the app registry's \`HelpPages\` map.

- Install the CLI
- Connect your first database
- Create a branch
- Run a query against it

## Example

\`\`\`ts
import { useDocsPanel } from '@guepard/shell-runtime';

export function MyPluginView() {
  const docs = useDocsPanel();
  // Open the panel on a specific help page when something changes
  return <button onClick={() => docs.open('my-page')}>Show help</button>;
}
\`\`\`
`;

const APP_LOOKUP = new Map<string, { label: string; icon: string }>();
for (const pinned of PINNED_ITEMS) {
  APP_LOOKUP.set(pinned.id, { label: pinned.label, icon: pinned.icon });
}
for (const group of APP_GROUPS) {
  for (const item of group.items) {
    APP_LOOKUP.set(item.id, { label: item.label, icon: item.icon });
  }
}

function findAppLabel(id: string): string {
  return APP_LOOKUP.get(id)?.label ?? id;
}

/** Mock org dropdown header for the sidebar. */
function MockOrgDropdown() {
  return (
    <button
      type="button"
      className="hover:bg-sidebar-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-black"
        style={{ backgroundColor: 'hsl(42 100% 66%)' }}
      >
        AC
      </span>
      <span className="text-sidebar-foreground min-w-0 flex-1 truncate text-xs font-medium">
        Acme Corp
      </span>
      <ChevronsUpDown className="text-sidebar-foreground/45 h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

/** Mock user profile menu for the sidebar footer. */
function MockUserProfile() {
  const [theme, setTheme] = useState('dark');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
        >
          <ProfileAvatar
            displayName="John Doe"
            className="h-6 w-6 text-[10px]"
          />
          <span className="text-sidebar-foreground min-w-0 flex-1 truncate text-xs font-medium">
            John Doe
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-56">
        <div className="px-3 py-2.5">
          <p className="truncate text-sm font-semibold">John Doe</p>
          <p className="text-muted-foreground truncate text-xs">
            john@acme.com
          </p>
        </div>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm">Theme</span>
          <div className="flex items-center gap-0.5 rounded-md border p-0.5">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                  theme === t
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={t.charAt(0).toUpperCase() + t.slice(1)}
              >
                {t === 'light' && <Sun className="h-3.5 w-3.5" />}
                {t === 'dark' && <Moon className="h-3.5 w-3.5" />}
                {t === 'system' && <Computer className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProjectShellDemo() {
  const [activeItemId, setActiveItemId] = useState('dashboard');
  const [pinnedAppIds, setPinnedAppIds] = useState<Set<string>>(new Set());
  const [tabs, setTabs] = useState<TabItem[]>([
    { id: 'tab-1', title: 'Dashboard', active: true },
  ]);
  // Right sidebar ownership moved out of ProjectShellLayout — the
  // host owns activePanel state so a DocsPanelProvider can bridge
  // plugin `useDocsPanel().open(...)` calls into this state.
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  const handleItemClick = useCallback((itemId: string, newTab: boolean) => {
    setActiveItemId(itemId);
    const label = findAppLabel(itemId);

    setTabs((prev) => {
      if (newTab) {
        const tab: TabItem = {
          id: `tab-${Date.now()}`,
          title: label,
          active: true,
        };
        return [...prev.map((t) => ({ ...t, active: false })), tab];
      }

      const activeIndex = prev.findIndex((t) => t.active);
      if (activeIndex === -1) {
        return [{ id: `tab-${Date.now()}`, title: label, active: true }];
      }
      return prev.map((t, i) =>
        i === activeIndex ? { ...t, title: label } : t,
      );
    });
  }, []);

  const handleTabClick = useCallback((tabId: string) => {
    setTabs((prev) => prev.map((t) => ({ ...t, active: t.id === tabId })));
  }, []);

  const handleTabClose = useCallback((tabId: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter((t) => t.id !== tabId);
      if (filtered.some((t) => t.active)) return filtered;
      return filtered.map((t, i) => ({
        ...t,
        active: i === filtered.length - 1,
      }));
    });
  }, []);

  const handleTabPin = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, pinned: !t.pinned } : t)),
    );
  }, []);

  const handleTabReorder = useCallback((activeId: string, overId: string) => {
    setTabs((prev) => {
      const oldIndex = prev.findIndex((t) => t.id === activeId);
      const newIndex = prev.findIndex((t) => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved!);
      return next;
    });
  }, []);

  const handleNewTab = useCallback(() => {
    const newTab: TabItem = {
      id: `tab-${Date.now()}`,
      title: 'New Tab',
      active: true,
    };
    setTabs((prev) => [...prev.map((t) => ({ ...t, active: false })), newTab]);
  }, []);

  const handlePinItem = useCallback((itemId: string) => {
    setPinnedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const pinnedTabs = useMemo(
    () =>
      Array.from(pinnedAppIds)
        .map((id) => {
          const app = APP_LOOKUP.get(id);
          if (!app) return null;
          return {
            id,
            label: app.label,
            icon: app.icon,
            active: id === activeItemId,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [pinnedAppIds, activeItemId],
  );

  const pinnedItems = PINNED_ITEMS.map((item) => ({
    ...item,
    active: item.id === activeItemId,
  }));

  const appGroups = APP_GROUPS.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      active: item.id === activeItemId,
      pinned: pinnedAppIds.has(item.id),
    })),
  }));

  const activeTab = tabs.find((t) => t.active);

  return (
    <ProjectShellLayout
      header={<MockOrgDropdown />}
      sidebarFooter={<MockUserProfile />}
      pinnedItems={pinnedItems}
      pinnedTabs={pinnedTabs}
      appGroups={appGroups}
      onItemClick={handleItemClick}
      onPinItem={handlePinItem}
      tabs={tabs}
      onTabClick={handleTabClick}
      onTabClose={handleTabClose}
      onTabPin={handleTabPin}
      onTabReorder={handleTabReorder}
      onNewTab={handleNewTab}
      activePanel={activePanel}
      onPanelChange={setActivePanel}
      docsPanelContent={<Markdown source={SAMPLE_DOCS_MARKDOWN} />}
    >
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-muted-foreground text-center">
          <h2 className="text-foreground mb-2 text-lg font-semibold">
            {activeTab?.title ?? 'No tab selected'}
          </h2>
          <p className="text-sm">
            Active item:{' '}
            <span className="text-foreground font-medium">{activeItemId}</span>
          </p>
        </div>
      </div>
    </ProjectShellLayout>
  );
}

const meta: Meta = {
  title: 'Shell/ProjectShell',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <ProjectShellDemo />,
};
