import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { ServiceTreeView } from "./service-tree-view";
import { storyPostgresService } from "./story-fixtures";

const meta = {
  title: "Features/Environments/Components/Service tree view",
  component: ServiceTreeView,
  tags: ["autodocs"],
  args: {
    service: storyPostgresService,
    onBack: fn(),
    onOpenCommandPalette: fn(),
    initialServicePanelOpen: false,
    onNavigateCloneUrlId: undefined as ((urlId: number) => void) | undefined,
    selectedCloneUrlId: null as number | null,
  },
  argTypes: {
    service: { control: "object" },
    initialServicePanelOpen: { control: "boolean" },
    selectedCloneUrlId: { control: "number" },
    onBack: { table: { disable: true } },
    onOpenCommandPalette: { table: { disable: true } },
    onNavigateCloneUrlId: { table: { disable: true } },
  },
  render: (args) => (
    <div className="h-[min(85vh,720px)] w-full max-w-5xl overflow-hidden rounded-lg border border-border">
      <ServiceTreeView {...args} />
    </div>
  ),
} satisfies Meta<typeof ServiceTreeView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ServicePanelOpen: Story = {
  name: "Right panel open",
  args: {
    initialServicePanelOpen: true,
  },
};
