import type { Meta, StoryObj } from "@storybook/react-vite";

import { EnvironmentsCanvasDotGrid } from "./environments-canvas-dot-grid";

function EnvironmentsCanvasDotGridFrame({
  hostHeight,
  hostWidth,
}: {
  hostHeight: number;
  hostWidth: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-border"
      style={{ height: hostHeight, width: hostWidth }}
    >
      <div className="absolute inset-0 bg-env-canvas">
        <EnvironmentsCanvasDotGrid />
      </div>
    </div>
  );
}

const meta = {
  title: "Features/Environments/Components/Canvas dot grid",
  component: EnvironmentsCanvasDotGridFrame,
  tags: ["autodocs"],
  args: {
    hostHeight: 200,
    hostWidth: 448,
  },
  argTypes: {
    hostHeight: { control: { type: "range", min: 80, max: 480, step: 8 } },
    hostWidth: { control: { type: "range", min: 200, max: 800, step: 16 } },
  },
} satisfies Meta<typeof EnvironmentsCanvasDotGridFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
