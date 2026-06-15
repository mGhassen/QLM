import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import { ProjectShellTabBar, type TabItem } from './project-shell-tab-bar';

const meta: Meta<typeof ProjectShellTabBar> = {
  title: 'Shell/ProjectShellTabBar',
  component: ProjectShellTabBar,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ProjectShellTabBar>;

function TabBarHarness({ initialTabs }: { initialTabs: TabItem[] }) {
  const [tabs, setTabs] = useState<TabItem[]>(initialTabs);

  const handleClick = (id: string) => {
    setTabs((prev) => prev.map((t) => ({ ...t, active: t.id === id })));
  };
  const handleClose = (id: string) => {
    setTabs((prev) => prev.filter((t) => t.id !== id));
  };
  const handlePin = (id: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)),
    );
  };
  const handleReorder = (activeId: string, overId: string) => {
    setTabs((prev) => {
      const oldIndex = prev.findIndex((t) => t.id === activeId);
      const newIndex = prev.findIndex((t) => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      if (!moved) return prev;
      next.splice(newIndex, 0, moved);
      return next;
    });
  };
  const handleNewTab = () => {
    const nextId = `tab-${tabs.length + 1}`;
    setTabs((prev) => [
      ...prev.map((t) => ({ ...t, active: false })),
      { id: nextId, title: `New tab ${tabs.length + 1}`, active: true },
    ]);
  };

  return (
    <div className="bg-background border-border w-full border-b">
      <ProjectShellTabBar
        tabs={tabs}
        onTabClick={handleClick}
        onTabClose={handleClose}
        onTabPin={handlePin}
        onTabReorder={handleReorder}
        onNewTab={handleNewTab}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <TabBarHarness
      initialTabs={[
        { id: 'overview', title: 'Overview' },
        { id: 'infrastructure', title: 'Infrastructure' },
        { id: 'topology', title: 'Topology', active: true },
        { id: 'environments', title: 'Environments' },
        { id: 'datasources', title: 'Datasources' },
      ]}
    />
  ),
};

export const WithPinnedTabs: Story = {
  render: () => (
    <TabBarHarness
      initialTabs={[
        { id: 'overview', title: 'Overview', pinned: true },
        { id: 'topology', title: 'Topology', pinned: true },
        { id: 'infrastructure', title: 'Infrastructure', active: true },
        { id: 'environments', title: 'Environments' },
        { id: 'notebook', title: 'Notebook' },
      ]}
    />
  ),
};

export const ManyTabsOverflow: Story = {
  render: () => (
    <TabBarHarness
      initialTabs={Array.from({ length: 15 }, (_, i) => ({
        id: `tab-${i + 1}`,
        title: `Long tab title ${i + 1}`,
        active: i === 7,
      }))}
    />
  ),
};
