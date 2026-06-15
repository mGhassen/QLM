import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { integrationsListFixture } from './__fixtures__';
import { IntegrationsUI } from './integrations-ui';
import { withIntegrationsProviders } from './lib/story-helpers';

const FIXED_NOW = new Date('2026-04-11T11:00:00.000Z');

const meta: Meta<typeof IntegrationsUI> = {
  title: 'Features/Integrations/IntegrationsUI',
  component: IntegrationsUI,
  decorators: [withIntegrationsProviders],
  parameters: { layout: 'fullscreen' },
  args: {
    now: FIXED_NOW,
    canManage: true,
    isLoading: false,
    error: null,
    integrations: [],
    onCreateClick: fn(),
    onRowClick: fn(),
    onTest: fn(),
    onRename: fn(),
    onRotate: fn(),
    onDelete: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof IntegrationsUI>;

export const Empty: Story = {
  name: 'Empty',
};

export const Populated: Story = {
  name: 'Populated (mixed statuses)',
  args: { integrations: integrationsListFixture },
};

export const ReadOnlyMember: Story = {
  name: 'Read-only member (canManage=false)',
  args: { integrations: integrationsListFixture, canManage: false },
};

export const Loading: Story = {
  name: 'Loading',
  args: { isLoading: true },
};

export const Error: Story = {
  name: 'Error',
  args: {
    error: 'Could not reach the QLM API (502 Bad Gateway). Retry in a moment.',
  },
};
