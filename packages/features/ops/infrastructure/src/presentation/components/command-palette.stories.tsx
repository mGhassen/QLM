import { type ComponentProps, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { CommandPalette } from './command-palette';
import { STORY_NODES } from '../story-fixtures';

function ControlledPalette(props: Omit<ComponentProps<typeof CommandPalette>, 'open' | 'onOpenChange'>) {
  const [open, setOpen] = useState(true);
  return (
    <div className="relative h-[500px] w-full border border-dashed border-border flex items-center justify-center">
      <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
        Press ⌘K to open palette
      </span>
      <CommandPalette
        {...props}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

const meta = {
  title: 'Features/Nodes/Components/Nodes Command Palette',
  component: ControlledPalette,
  tags: ['autodocs'],
  args: {
    rows: STORY_NODES,
    onOpenNode: fn(),
    onToggleLifecycle: fn(),
    onToggleProvider: fn(),
    onSetDisplayMode: fn(),
    onCreate: fn(),
  },
  argTypes: {
    rows: { table: { disable: true } },
    onOpenNode: { table: { disable: true } },
    onToggleLifecycle: { table: { disable: true } },
    onToggleProvider: { table: { disable: true } },
    onSetDisplayMode: { table: { disable: true } },
    onCreate: { table: { disable: true } },
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ControlledPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Open (all command groups)',
};

export const FewNodes: Story = {
  name: 'Few nodes (short jump list)',
  args: { rows: STORY_NODES.slice(0, 3) },
};

export const ManyNodes: Story = {
  name: 'Many nodes (capped at 50)',
  args: {
    rows: Array.from({ length: 80 }, (_, i) => ({
      ...STORY_NODES[i % STORY_NODES.length]!,
      id: `node_many_${i}`,
      name: `worker-${String(i + 1).padStart(3, '0')}`,
    })),
  },
};
