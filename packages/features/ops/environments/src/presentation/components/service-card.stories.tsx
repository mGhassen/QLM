import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { ServiceCard } from "./service-card";
import { storyPostgresService, storyRedisService } from "./story-fixtures";

const meta = {
  title: "Features/Environments/Components/Service card",
  component: ServiceCard,
  tags: ["autodocs"],
  args: {
    service: storyPostgresService,
    selected: false,
    onClick: fn(),
    onExpand: fn(),
  },
  argTypes: {
    service: { control: "object" },
    selected: { control: "boolean" },
    stacked: {
      control: "boolean",
      description:
        "Stacked card backs. Leave unset to follow `service.cloneUrlIds?.length > 0`.",
    },
    workspaceButtonVisibility: {
      control: "inline-radio",
      options: ["hover", "always"],
    },
    onClick: { table: { disable: true } },
    onExpand: { table: { disable: true } },
  },
} satisfies Meta<typeof ServiceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Stacked: Story = {
  args: {
    stacked: true,
  },
};

export const NotStacked: Story = {
  args: {
    stacked: false,
  },
};

export const Selected: Story = {
  args: {
    selected: true,
  },
};

export const WorkspaceButtonAlwaysVisible: Story = {
  name: "Workspace button (always)",
  args: {
    workspaceButtonVisibility: "always",
  },
};

export const RedisOffline: Story = {
  name: "Redis · offline",
  args: {
    service: { ...storyRedisService, status: "offline" },
    onExpand: undefined,
  },
};
