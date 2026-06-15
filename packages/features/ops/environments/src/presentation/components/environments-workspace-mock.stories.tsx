import type { Meta, StoryObj } from "@storybook/react-vite";

import { EnvironmentsWorkspaceMock } from "./environments-workspace-mock";

const meta = {
  title: "Features/Environments/Components/Workspace mock",
  component: EnvironmentsWorkspaceMock,
  tags: ["autodocs"],
  args: {
    enableEnvironmentServiceCanvas: true,
    urlPathTail: "",
  },
  argTypes: {
    enableEnvironmentServiceCanvas: { control: "boolean" },
    urlPathTail: { control: "text" },
    environments: { control: "object" },
    services: { control: "object", table: { category: "Data" } },
    service: { control: "object", table: { category: "Data" } },
    className: { control: false },
    onUrlPathTailChange: { table: { disable: true } },
  },
  render: (args) => (
    <div className="bg-background h-[min(85vh,760px)] w-full max-w-6xl overflow-hidden rounded-lg border border-border">
      <EnvironmentsWorkspaceMock {...args} />
    </div>
  ),
} satisfies Meta<typeof EnvironmentsWorkspaceMock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ServiceTreeCanvas: Story = {
  name: "Card → service tree",
  args: {
    enableEnvironmentServiceCanvas: true,
  },
};

export const GridWithRightPanel: Story = {
  name: "Card → right panel",
  args: {
    enableEnvironmentServiceCanvas: false,
  },
};
