import type { Meta, StoryObj } from '@storybook/react-vite';

import { HeatBar } from './heat-bar';

const meta = {
  title: 'Features/Nodes/Cells/Heat Bar',
  component: HeatBar,
  tags: ['autodocs'],
  args: {
    value: 6,
    max: 16,
    utilPct: 38,
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 32, step: 1 } },
    max: { control: { type: 'range', min: 1, max: 32, step: 1 } },
    utilPct: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HeatBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Low: Story = {
  name: 'Low utilization (<65%)',
  args: { value: 6, max: 16, utilPct: 38 },
};

export const Medium: Story = {
  name: 'Medium utilization (65–84%)',
  args: { value: 11, max: 16, utilPct: 70 },
};

export const High: Story = {
  name: 'High utilization (≥85%)',
  args: { value: 14, max: 16, utilPct: 90 },
};

export const NoUtilData: Story = {
  name: 'No utilization data (neutral)',
  args: { value: 8, max: 16, utilPct: undefined },
};

export const AllLevels: Story = {
  name: 'All levels',
  render: () => (
    <div className="flex w-48 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Low</span>
        <HeatBar value={6} max={16} utilPct={38} aria-label="Low utilization" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Medium</span>
        <HeatBar value={11} max={16} utilPct={70} aria-label="Medium utilization" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">High</span>
        <HeatBar value={14} max={16} utilPct={90} aria-label="High utilization" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unknown</span>
        <HeatBar value={8} max={16} aria-label="Unknown utilization" />
      </div>
    </div>
  ),
};
