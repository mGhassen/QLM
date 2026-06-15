import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ShellUserProfileMenu } from './shell-user-profile-menu';

const meta: Meta<typeof ShellUserProfileMenu> = {
  title: 'Design System/Shell/Shell User Profile Menu',
  component: ShellUserProfileMenu,
  args: {
    displayName: 'apps-3815',
    email: 'apps@rasm.ai',
    // Gear icon in the header (RFC 0009 AM-1 renamed the prop from `onSettingsClick`).
    onProfileSettingsIconClick: fn(),
    onHomePageClick: fn(),
    // "Settings" nav-item button. Opens the settings dialog; stub here.
    onSettingsClick: fn(),
    onHelpClick: fn(),
    onLogOutClick: fn(),
    onUpgradeClick: fn(),
    platformStatus: { ok: true, message: 'All systems normal.' },
  },
  decorators: [
    (Story) => (
      <div className="flex h-screen w-64 items-end p-2">
        <div className="w-full">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ShellUserProfileMenu>;

export const Default: Story = {};

export const WithAvatar: Story = {
  args: {
    avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
  },
};

export const WithoutUpgrade: Story = {
  args: {
    onUpgradeClick: undefined,
  },
};

export const WithoutGearIcon: Story = {
  name: 'Without gear icon (header)',
  args: {
    onProfileSettingsIconClick: undefined,
  },
};

export const WithoutSettingsNavItem: Story = {
  name: 'Without Settings nav-item',
  args: {
    onSettingsClick: undefined,
  },
};

export const Minimal: Story = {
  name: 'Minimal (no optional affordances)',
  args: {
    onProfileSettingsIconClick: undefined,
    onHomePageClick: undefined,
    onSettingsClick: undefined,
    onHelpClick: undefined,
    onUpgradeClick: undefined,
    platformStatus: undefined,
  },
};

export const SystemDown: Story = {
  args: {
    platformStatus: { ok: false, message: 'Partial outage detected.' },
  },
};
