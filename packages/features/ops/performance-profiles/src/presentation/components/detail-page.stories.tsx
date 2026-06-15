import type { Meta, StoryObj } from '@storybook/react-vite';

import { PerformanceProfileDetailPage } from './detail-page';
import { storyProfile } from '../story-fixtures';

const meta = {
  title: 'Features/PerformanceProfiles/DetailPage',
  component: PerformanceProfileDetailPage,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PerformanceProfileDetailPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithConfig: Story = {
  args: { profile: storyProfile() },
};

export const WithBackButton: Story = {
  args: {
    profile: storyProfile(),
    onBack: () => {},
  },
};

export const NoConfigFlags: Story = {
  args: {
    profile: storyProfile({ configFlags: {} }),
  },
};

export const Inactive: Story = {
  args: {
    profile: storyProfile({ labelName: 'legacy-v14', isActive: false, isDefault: false, configFlags: {} }),
  },
};

export const MySQL: Story = {
  args: {
    profile: storyProfile({
      labelName: 'mysql-standard',
      databaseProvider: 'mysql',
      databaseVersion: '8.0',
      configFlags: { innodb_buffer_pool_size: '512M', max_connections: 200 },
    }),
  },
};

export const HighPerformance: Story = {
  args: {
    profile: storyProfile({
      labelName: 'performance',
      minCpu: 4000,
      minMemory: 8192,
      isDefault: false,
      configFlags: {
        max_connections: 500,
        shared_buffers: '2GB',
        work_mem: '64MB',
        huge_pages: 'on',
        effective_cache_size: '6GB',
      },
    }),
  },
};
