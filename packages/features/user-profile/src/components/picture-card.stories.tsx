import type { Meta, StoryObj } from '@storybook/react';

import { PictureCard } from './picture-card';

const noop = () => Promise.resolve();

const meta: Meta<typeof PictureCard> = {
  title: 'UserProfile/PictureCard',
  component: PictureCard,
  parameters: { layout: 'padded' },
  args: {
    onUpload: noop,
    onClear: noop,
  },
};

export default meta;
type Story = StoryObj<typeof PictureCard>;

export const InitialsFallback: Story = {
  args: {
    displayName: 'Hani Chalouati',
    pictureUrl: null,
  },
};

export const WithAvatar: Story = {
  args: {
    displayName: 'Hani Chalouati',
    pictureUrl: 'https://i.pravatar.cc/120?u=hani',
  },
};

export const Uploading: Story = {
  args: {
    displayName: 'Hani Chalouati',
    pictureUrl: 'https://i.pravatar.cc/120?u=hani',
    isPending: true,
  },
};
