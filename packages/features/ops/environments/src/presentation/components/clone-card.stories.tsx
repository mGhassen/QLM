import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { CloneCard } from "./clone-card";
import { storyPostgresService, storyRedisService } from "./story-fixtures";

const meta = {
  title: "Features/Environments/Components/Clone card",
  component: CloneCard,
  tags: ["autodocs"],
  args: {
    service: {
      ...storyPostgresService,
      id: "svc-clone-pg",
      name: "replica-1",
      urlId: 2,
      dataMaskingEnabled: true,
    },
    selected: false,
    onClick: fn(),
    onOpenBranching: fn(),
    onOpenMasking: fn(),
    onCreateDownstreamClone: fn(),
    branchingButtonVisibility: "hover" as const,
  },
  argTypes: {
    service: { control: "object" },
    selected: { control: "boolean" },
    branchingButtonVisibility: {
      control: "inline-radio",
      options: ["hover", "always"],
    },
    onClick: { table: { disable: true } },
    onOpenBranching: { table: { disable: true } },
    onOpenMasking: { table: { disable: true } },
    onCreateDownstreamClone: { table: { disable: true } },
  },
  render: (args) => (
    <div className="flex justify-center bg-env-canvas p-8">
      <CloneCard {...args} />
    </div>
  ),
} satisfies Meta<typeof CloneCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: { selected: true },
};

export const MergedStackPreview: Story = {
  name: "Merged stack preview",
  args: {
    service: {
      ...storyPostgresService,
      id: "svc-merged",
      name: "postgres-primary",
      mergedCloneStackPreview: { total: 6 },
      dataMaskingEnabled: true,
    },
  },
};

export const WebService: Story = {
  name: "Web service",
  args: {
    service: {
      id: "svc-web",
      name: "api-gateway",
      type: "web",
      status: "deploying",
      urlId: 10,
    },
    onOpenMasking: undefined,
  },
};

export const RedisNoMaskingFooter: Story = {
  name: "Redis (no masking strip)",
  args: {
    service: {
      ...storyRedisService,
      id: "svc-clone-rd",
      name: "redis-b",
      urlId: 3,
      dataMaskingEnabled: false,
    },
    onOpenMasking: undefined,
  },
};

export const MaskingDisabledStrip: Story = {
  name: "Postgres · not masked",
  args: {
    service: {
      ...storyPostgresService,
      id: "svc-unmasked",
      name: "replica-2",
      urlId: 4,
      dataMaskingEnabled: false,
    },
  },
};

export const BranchingButtonAlways: Story = {
  name: "Branching control always visible",
  args: {
    branchingButtonVisibility: "always",
  },
};
