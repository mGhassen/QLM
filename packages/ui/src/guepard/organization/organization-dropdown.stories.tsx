import type { ComponentPropsWithoutRef } from 'react';
import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
} from '../../shadcn/sidebar';

import { OrganizationDropdown } from './organization-dropdown';

const meta: Meta<typeof OrganizationDropdown> = {
  title: 'Design System/Layouts/Shell/Organization dropdown',
  component: OrganizationDropdown,
  decorators: [
    (Story) => (
      <SidebarProvider defaultOpen>
        <div className="flex w-64 items-start p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <Story />
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OrganizationDropdown>;

type DropdownProps = ComponentPropsWithoutRef<typeof OrganizationDropdown>;

const sharedArgs: Omit<
  DropdownProps,
  'workspaceMenuOpen' | 'setWorkspaceMenuOpen'
> = {
  organizationName: 'Acme Corp',
  organizationPlan: 'Pro',
  workspaceOrganizations: [
    { slug: 'acme', name: 'Acme Corp' },
    { slug: 'globex', name: 'Globex' },
  ],
  currentOrgSlug: 'acme',
  onSelectOrganization: fn(),
  onCreateWorkspace: fn(),
};

function InteractiveDropdown(args: DropdownProps) {
  const [open, setOpen] = useState(false);
  return (
    <OrganizationDropdown
      {...args}
      workspaceMenuOpen={open}
      setWorkspaceMenuOpen={setOpen}
    />
  );
}

function InteractiveDropdownOpen(args: DropdownProps) {
  const [open, setOpen] = useState(true);
  return (
    <OrganizationDropdown
      {...args}
      workspaceMenuOpen={open}
      setWorkspaceMenuOpen={setOpen}
    />
  );
}

export const Default: Story = {
  render: (args) => <InteractiveDropdown {...args} />,
  args: { ...sharedArgs, workspaceMenuOpen: false, setWorkspaceMenuOpen: fn() },
};

export const Open: Story = {
  render: (args) => <InteractiveDropdownOpen {...args} />,
  args: { ...sharedArgs, workspaceMenuOpen: true, setWorkspaceMenuOpen: fn() },
};
