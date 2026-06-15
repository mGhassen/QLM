import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { environmentsCloneCardWidthPx } from "../../environment-clone-canvas-layout";
import {
  CloneConnectorStripWithToggle,
  Connectors,
} from "./clone-connectors";

const cardWidthPx = environmentsCloneCardWidthPx("postgres");

const meta = {
  title: "Features/Environments/Components/Clone connectors",
  component: Connectors,
  tags: ["autodocs"],
  args: {
    cols: 3,
    cardWidthPx,
  },
  argTypes: {
    cols: { control: { type: "number", min: 1, max: 6, step: 1 } },
    cardWidthPx: { control: { type: "number", min: 120, max: 320, step: 4 } },
  },
  render: (args) => (
    <div className="flex justify-center bg-env-canvas p-10">
      <Connectors {...args} />
    </div>
  ),
} satisfies Meta<typeof Connectors>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleColumn: Story = {
  name: "Single column",
  args: { cols: 1 },
};

export const FanOut: Story = {
  args: { cols: 4 },
};

export const StripWithToggle: StoryObj<typeof meta> = {
  name: "Strip with toggle",
  render: () => {
    const [collapsed, setCollapsed] = React.useState(false);
    return (
      <div className="flex flex-col items-center gap-6 bg-env-canvas p-10">
        <CloneConnectorStripWithToggle
          cols={4}
          cardWidthPx={cardWidthPx}
          collapsed={collapsed}
          showToggle
          onToggle={() => setCollapsed((c) => !c)}
        />
        <p className="text-muted-foreground text-xs">
          {collapsed ? "Collapsed (1 col)" : "Expanded"}
        </p>
      </div>
    );
  },
};

export const StripToggleHiddenFan: StoryObj<typeof meta> = {
  name: "Strip · toggle · no fan lines",
  render: () => {
    const [collapsed, setCollapsed] = React.useState(false);
    return (
      <div className="flex justify-center bg-env-canvas p-10">
        <CloneConnectorStripWithToggle
          cols={3}
          cardWidthPx={cardWidthPx}
          collapsed={collapsed}
          showToggle
          hideFanLines
          onToggle={() => setCollapsed((c) => !c)}
        />
      </div>
    );
  },
};
