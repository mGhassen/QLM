import type { Meta, StoryObj } from "@storybook/react-vite";

import { EnvironmentsPluginRoot } from "./plugin-root";
import { withEnvironmentsRouter } from "./storybook-router";

function PluginRootFrame({ shellHeight }: { shellHeight: number }) {
  return (
    <div
      className="bg-background flex h-full min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-border"
      style={{ height: shellHeight }}
    >
      <EnvironmentsPluginRoot />
    </div>
  );
}

const meta = {
  title: "Features/Environments/Plugin root",
  component: PluginRootFrame,
  decorators: [withEnvironmentsRouter],
  tags: ["autodocs"],
  args: {
    shellHeight: 720,
  },
  argTypes: {
    shellHeight: { control: { type: "range", min: 400, max: 900, step: 20 } },
  },
} satisfies Meta<typeof PluginRootFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
