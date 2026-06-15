import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  initialCloneForest,
  type CloneForestNode,
} from "../../environment-clone-tree";
import { CloneForestRenderer } from "./clone-forest-renderer";
import { storyPostgresService } from "./story-fixtures";

function storyForest(): CloneForestNode[] {
  return initialCloneForest({
    ...storyPostgresService,
    urlId: 1,
    cloneUrlIds: [2, 3],
  });
}

const meta = {
  title: "Features/Environments/Components/Clone forest renderer",
  component: CloneForestRenderer,
  tags: ["autodocs"],
  args: {
    roots: storyForest(),
    selectedServiceId: null as string | null,
    onSelectClone: fn(),
    onOpenBranching: fn(),
    onOpenMasking: fn(),
    onCreateDownstreamClone: fn(),
  },
  argTypes: {
    roots: { control: "object" },
    selectedServiceId: { control: "text" },
    onSelectClone: { table: { disable: true } },
    onOpenBranching: { table: { disable: true } },
    onOpenMasking: { table: { disable: true } },
    onCreateDownstreamClone: { table: { disable: true } },
  },
  render: (args) => (
    <div className="min-h-[420px] w-full bg-env-canvas py-6">
      <CloneForestRenderer {...args} />
    </div>
  ),
} satisfies Meta<typeof CloneForestRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSelection: Story = {
  args: {
    selectedServiceId: "svc-story-pg__clone__1",
  },
};

export const Empty: Story = {
  args: {
    roots: [],
  },
};
