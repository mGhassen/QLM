import type { Meta, StoryObj } from '@storybook/react';

import { PasswordCard } from './password-card';

const noop = () => Promise.resolve();

const meta: Meta<typeof PasswordCard> = {
  title: 'UserProfile/PasswordCard',
  component: PasswordCard,
  parameters: { layout: 'padded' },
  args: { onSubmit: noop },
};

export default meta;
type Story = StoryObj<typeof PasswordCard>;

export const Linked: Story = {
  args: { isLinked: true },
};

export const OauthOnly: Story = {
  args: { isLinked: false },
};

export const WrongCurrent: Story = {
  args: {
    isLinked: true,
    currentPasswordError: 'Current password is incorrect.',
  },
};

export const Submitting: Story = {
  args: { isLinked: true, isSubmitting: true },
};
