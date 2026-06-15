import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Button } from '../../shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';

import { OrganizationWorkspaceSwitcherMenuContent } from './organization-workspace-switcher-menu';

const meta: Meta<typeof OrganizationWorkspaceSwitcherMenuContent> = {
  title: 'Design System/Layouts/Shell/Organization workspace switcher menu',
  component: OrganizationWorkspaceSwitcherMenuContent,
  decorators: [
    (Story) => (
      <div className="flex justify-center p-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Open menu
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <Story />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OrganizationWorkspaceSwitcherMenuContent>;

export const Default: Story = {
  args: {
    workspaceOrganizations: [
      { slug: 'acme', name: 'Acme Corp' },
      { slug: 'globex', name: 'Globex' },
    ],
    currentOrgSlug: 'acme',
    onSelectOrganization: fn(),
    onCreateWorkspace: fn(),
    onGoToOrgHome: fn(),
  },
};
