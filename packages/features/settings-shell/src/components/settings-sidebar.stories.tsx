import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Database, KeyRound, Settings as SettingsIcon } from 'lucide-react';

import { SettingsSidebar } from './settings-sidebar';
import { withSettingsShellProviders } from './story-helpers';
import type { SettingsSection } from '../types/settings-section';

const meta: Meta<typeof SettingsSidebar> = {
  title: 'SettingsShell/SettingsSidebar',
  component: SettingsSidebar,
  decorators: [withSettingsShellProviders],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof SettingsSidebar>;

const oneSection: SettingsSection[] = [
  { key: 'personal-tokens', label: 'Personal tokens', content: null },
];

const threeSections: SettingsSection[] = [
  { key: 'personal-tokens', label: 'Personal tokens', content: null },
  { key: 'datasources', label: 'Datasources', content: null },
  { key: 'preferences', label: 'Preferences', content: null },
];

const threeWithIcons: SettingsSection[] = [
  {
    key: 'personal-tokens',
    label: 'Personal tokens',
    icon: <KeyRound className="h-3.5 w-3.5" />,
    content: null,
  },
  {
    key: 'datasources',
    label: 'Datasources',
    icon: <Database className="h-3.5 w-3.5" />,
    content: null,
  },
  {
    key: 'preferences',
    label: 'Preferences',
    icon: <SettingsIcon className="h-3.5 w-3.5" />,
    content: null,
  },
];

function ControlledSidebar({ sections }: { sections: SettingsSection[] }) {
  const [active, setActive] = useState(sections[0]?.key ?? '');
  return (
    <div className="border-border w-[220px] rounded border p-3">
      <SettingsSidebar
        sections={sections}
        activeKey={active}
        onSelect={setActive}
      />
    </div>
  );
}

export const Empty: Story = {
  render: () => <ControlledSidebar sections={[]} />,
};

export const OneItem: Story = {
  render: () => <ControlledSidebar sections={oneSection} />,
};

export const ThreeItems: Story = {
  render: () => <ControlledSidebar sections={threeSections} />,
};

export const WithIcons: Story = {
  render: () => <ControlledSidebar sections={threeWithIcons} />,
};
