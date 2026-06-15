import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import type { CanvasCardLayoutMode } from "./canvas-card-layout";
import { EnvironmentsCanvasLayoutTopBar } from "./environments-canvas-layout-top-bar";

const meta = {
  title: "Features/Environments/Components/Canvas layout top bar",
  component: EnvironmentsCanvasLayoutTopBar,
  tags: ["autodocs"],
  args: {
    mode: "grid" as CanvasCardLayoutMode,
    onChange: fn(),
  },
  argTypes: {
    mode: {
      control: "inline-radio",
      options: ["grid", "free", "timeline"] satisfies CanvasCardLayoutMode[],
    },
    onChange: { table: { disable: true } },
  },
  render: (args) => (
    <div
      className="relative bg-env-canvas p-6"
      style={{ minHeight: 120, minWidth: 280 }}
    >
      <div className="absolute right-6 top-6">
        <EnvironmentsCanvasLayoutTopBar {...args} />
      </div>
    </div>
  ),
} satisfies Meta<typeof EnvironmentsCanvasLayoutTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FreeCanvas: Story = {
  args: { mode: "free" },
};
