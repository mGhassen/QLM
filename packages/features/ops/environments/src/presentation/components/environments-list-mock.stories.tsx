import type { Meta, StoryObj } from "@storybook/react-vite";

import { EnvironmentsListMock } from "./environments-list-mock";

const meta = {
  title: "Features/Environments/Components/Environments list (mock)",
  component: EnvironmentsListMock,
  tags: ["autodocs"],
  args: {
    hideHeading: false,
  },
  argTypes: {
    hideHeading: { control: "boolean", name: "Hide heading" },
  },
  render: (args) => (
    <div className="bg-background p-6">
      <EnvironmentsListMock {...args} />
    </div>
  ),
} satisfies Meta<typeof EnvironmentsListMock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoHeading: Story = {
  args: {
    hideHeading: true,
  },
};
