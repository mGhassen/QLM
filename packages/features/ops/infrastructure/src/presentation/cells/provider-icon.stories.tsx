import type { Meta, StoryObj } from '@storybook/react-vite';

import { ProviderIcon } from './provider-icon';

const meta = {
  title: 'Features/Nodes/Cells/Node Provider Icon',
  component: ProviderIcon,
  tags: ['autodocs'],
  args: {
    provider: 'aws',
    size: 24,
    minimal: false,
  },
  argTypes: {
    provider: {
      control: 'inline-radio',
      options: ['aws', 'gcp', 'azure', 'on-premise'],
    },
    size: { control: { type: 'range', min: 12, max: 64, step: 4 } },
    minimal: { control: 'boolean' },
  },
} satisfies Meta<typeof ProviderIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AWS: Story = {
  args: { provider: 'aws' },
};

export const AWSMinimal: Story = {
  name: 'AWS minimal',
  args: { provider: 'aws', minimal: true },
};

export const GCP: Story = {
  args: { provider: 'gcp' },
};

export const Azure: Story = {
  args: { provider: 'azure' },
};

export const OnPremise: Story = {
  name: 'On-Premise',
  args: { provider: 'on-premise' },
};

export const AllProviders: Story = {
  name: 'All providers',
  render: (args) => (
    <div className="flex items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <ProviderIcon {...args} provider="aws" />
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">AWS</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProviderIcon {...args} provider="gcp" />
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">GCP</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProviderIcon {...args} provider="azure" />
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Azure</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProviderIcon {...args} provider="on-premise" />
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">On-Prem</span>
      </div>
    </div>
  ),
};

export const AllProvidersMinimal: Story = {
  name: 'All providers minimal',
  render: (args) => (
    <div className="flex items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <ProviderIcon {...args} provider="aws" minimal />
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">AWS</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProviderIcon {...args} provider="gcp" />
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">GCP</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProviderIcon {...args} provider="azure" />
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Azure</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProviderIcon {...args} provider="on-premise" />
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">On-Prem</span>
      </div>
    </div>
  ),
};
