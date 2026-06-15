import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { EnvironmentsCanvasBottomBar } from "./environments-canvas-bottom-bar";

const meta = {
  title: "Features/Environments/Components/Canvas bottom bar",
  component: EnvironmentsCanvasBottomBar,
  tags: ["autodocs"],
  args: {
    scalePct: 100,
    environmentListActive: false,
    zoomControlsDisabled: false,
    onZoomIn: fn(),
    onZoomOut: fn(),
    onFitView: fn(),
    onOpenCommandPalette: fn(),
    onEnvironmentList: undefined as (() => void) | undefined,
  },
  argTypes: {
    scalePct: { control: { type: "range", min: 25, max: 200, step: 5 } },
    environmentListActive: { control: "boolean" },
    zoomControlsDisabled: { control: "boolean" },
    onZoomIn: { table: { disable: true } },
    onZoomOut: { table: { disable: true } },
    onFitView: { table: { disable: true } },
    onOpenCommandPalette: { table: { disable: true } },
    onEnvironmentList: { table: { disable: true } },
  },
  render: (args) => {
    const { onEnvironmentList, ...rest } = args;
    return (
      <div
        className="flex items-end justify-center bg-env-canvas p-8"
        style={{ minHeight: 160 }}
      >
        <EnvironmentsCanvasBottomBar
          {...rest}
          onEnvironmentList={onEnvironmentList}
        />
      </div>
    );
  },
} satisfies Meta<typeof EnvironmentsCanvasBottomBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithEnvironmentList: Story = {
  args: {
    onEnvironmentList: fn(),
    environmentListActive: false,
  },
};
