import * as React from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { Cpu, Database, Settings2 } from 'lucide-react';

import { DataRow } from './data-row';

const meta: Meta<typeof DataRow> = {
  title: 'Entity Primitives/DataRow',
  component: DataRow,
};

export default meta;
type Story = StoryObj<typeof DataRow>;

export const Default: Story = {
  render: () => (
    <div className="border-border divide-border/50 flex w-80 flex-col divide-y border p-4">
      <DataRow
        icon={<Cpu className="h-3 w-3" />}
        label="Min CPU"
        value="2.0 vCPU"
        mono
      />
      <DataRow
        icon={<Database className="h-3 w-3" />}
        label="Provider"
        value="PostgreSQL"
      />
      <DataRow
        icon={<Settings2 className="h-3 w-3" />}
        label="Max Connections"
        value="100"
        mono
      />
    </div>
  ),
};

export const WithValueNode: Story = {
  render: () => (
    <div className="border-border divide-border/50 flex w-80 flex-col divide-y border p-4">
      <DataRow
        icon={<Cpu className="h-3 w-3" />}
        label="Status"
        valueNode={
          <span className="inline-flex h-5 items-center rounded-none border border-emerald-500/30 bg-emerald-500/15 px-2 text-[10px] leading-none font-black tracking-widest text-emerald-700 uppercase">
            Active
          </span>
        }
      />
      <DataRow icon={<Database className="h-3 w-3" />} label="Missing value" />
    </div>
  ),
};
