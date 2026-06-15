import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { CmdKPalette, type Screen } from "./cmdk-palette";

type CmdKPalettePlaygroundProps = Omit<
  React.ComponentProps<typeof CmdKPalette>,
  "open" | "onOpenChange"
> & {
  startOpen?: boolean;
};

function CmdKPalettePlayground({
  startOpen = true,
  ...cmdkProps
}: CmdKPalettePlaygroundProps) {
  const [open, setOpen] = React.useState(startOpen);
  React.useEffect(() => {
    setOpen(startOpen);
  }, [startOpen]);

  if (cmdkProps.overlay === "viewport") {
    return (
      <CmdKPalette
        open={open}
        onOpenChange={setOpen}
        onAddService={cmdkProps.onAddService}
        onNavigate={cmdkProps.onNavigate}
        openTo={cmdkProps.openTo}
        overlay="viewport"
      />
    );
  }

  return (
    <div className="bg-background relative h-[min(80vh,720px)] w-full max-w-4xl overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        className="absolute left-3 top-3 z-[60] rounded border border-border bg-background px-2 py-1 text-xs"
        onClick={() => setOpen(true)}
      >
        Open palette
      </button>
      <CmdKPalette
        open={open}
        onOpenChange={setOpen}
        onAddService={cmdkProps.onAddService}
        onNavigate={cmdkProps.onNavigate}
        openTo={cmdkProps.openTo}
        overlay="layout"
      />
    </div>
  );
}

const meta = {
  title: "Features/Environments/Components/CmdK palette",
  component: CmdKPalettePlayground,
  tags: ["autodocs"],
  args: {
    overlay: "layout" as const,
    startOpen: true,
    onAddService: fn(),
    onNavigate: fn(),
  },
  argTypes: {
    overlay: { control: "inline-radio", options: ["layout", "viewport"] },
    startOpen: { control: "boolean", name: "Open on load" },
    openTo: { control: "object" },
    onAddService: { table: { disable: true } },
    onNavigate: { table: { disable: true } },
  },
} satisfies Meta<typeof CmdKPalettePlayground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ViewportOverlay: Story = {
  args: {
    overlay: "viewport",
    startOpen: true,
  },
};

export const OpenToDatabaseFlow: Story = {
  name: "Open to · add database",
  args: {
    openTo: { screen: "db-choose" as Screen },
    startOpen: true,
  },
};
