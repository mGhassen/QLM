import type { Meta, StoryObj } from '@storybook/react';

import { NameCard } from './name-card';

const meta: Meta<typeof NameCard> = {
  title: 'UserProfile/NameCard',
  component: NameCard,
  parameters: { layout: 'padded' },
  args: {
    onSubmit: (name: string) => {
      // Story noop — real submission is wired by the user-settings plugin root.
      return Promise.resolve(name).then(() => undefined);
    },
  },
};

export default meta;
type Story = StoryObj<typeof NameCard>;

export const Idle: Story = {
  args: { name: 'Hani Chalouati' },
};

export const EmptyName: Story = {
  args: { name: '' },
};

export const Submitting: Story = {
  args: { name: 'Hani Chalouati', isSubmitting: true },
};
