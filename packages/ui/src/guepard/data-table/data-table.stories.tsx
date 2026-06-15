import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable, type DataTableRow } from './data-table';

const meta: Meta<typeof DataTable> = {
  title: 'Design System/DataTable (Port)',
  component: DataTable,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Ported DataTable kept for evaluation. Storybook-only — not exported from package.json. Prefer `@guepard/ui/data-table-advanced` for production.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DataTable>;

type Node = DataTableRow & {
  name: string;
  region: string;
  cpu: number;
  status: 'running' | 'idle' | 'error';
};

const NODES: Node[] = Array.from({ length: 37 }, (_, i) => ({
  id: i + 1,
  name: `node-${String(i + 1).padStart(3, '0')}`,
  region: ['us-east-1', 'eu-west-1', 'ap-southeast-1'][i % 3]!,
  cpu: 2 + (i % 4) * 2,
  status: (['running', 'idle', 'error'] as const)[i % 3]!,
}));

const columns: ColumnDef<Node>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'region', header: 'Region' },
  { accessorKey: 'cpu', header: 'CPU' },
  { accessorKey: 'status', header: 'Status' },
];

export const Basic: Story = {
  name: 'Basic',
  render: () => (
    <div className="h-[500px]">
      <DataTable<Node> data={NODES} columns={columns} title="Basic" />
    </div>
  ),
};

function SelectableStory() {
  const [selected, setSelected] = useState(new Set<number>());
  return (
    <div className="h-[500px]">
      <DataTable<Node>
        data={NODES}
        columns={columns}
        title="Selectable"
        selectable
        selectedRows={selected}
        onSelectedRowsChange={setSelected}
      />
    </div>
  );
}

export const Selectable: Story = {
  name: 'Selectable',
  render: () => <SelectableStory />,
};

export const WithExpansion: Story = {
  name: 'With row expansion',
  render: () => (
    <div className="h-[500px]">
      <DataTable<Node>
        data={NODES.slice(0, 15)}
        columns={columns}
        title="Expandable"
        renderExpandedRow={(row) => (
          <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-semibold">id:</span> {row.id}
            </div>
            <div>
              <span className="font-semibold">region:</span> {row.region}
            </div>
            <div>
              <span className="font-semibold">cpu:</span> {row.cpu} vCPU
            </div>
            <div>
              <span className="font-semibold">status:</span> {row.status}
            </div>
          </div>
        )}
        isRowExpandable={(row) => row.status !== 'error'}
      />
    </div>
  ),
};

function WithActiveRowStory() {
  const [activeId, setActiveId] = useState<number | undefined>(3);
  return (
    <div className="h-[500px]">
      <DataTable<Node>
        data={NODES.slice(0, 10)}
        columns={columns}
        title="Active"
        activeRowId={activeId}
        onRowClick={(row) => setActiveId(row.id)}
      />
    </div>
  );
}

export const WithActiveRow: Story = {
  name: 'With active row highlight',
  render: () => <WithActiveRowStory />,
};
