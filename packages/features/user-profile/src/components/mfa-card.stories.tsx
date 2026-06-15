import type { Meta, StoryObj } from '@storybook/react';

import { MfaCard } from './mfa-card';

const meta: Meta<typeof MfaCard> = {
  title: 'UserProfile/MfaCard',
  component: MfaCard,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof MfaCard>;

export const Empty: Story = {
  args: { factors: [] },
};

export const WithOneFactor: Story = {
  args: {
    factors: [{ id: 'factor-1', friendlyName: 'iPhone Authenticator' }],
  },
};

export const WithMultipleFactors: Story = {
  args: {
    factors: [
      { id: 'factor-1', friendlyName: 'iPhone Authenticator' },
      { id: 'factor-2', friendlyName: 'Backup laptop' },
    ],
  },
};

export const Loading: Story = {
  args: { factors: [], isLoading: true },
};
