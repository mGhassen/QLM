import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  EnvironmentsCanvasChromeContext,
  useEnvironmentsCanvasChrome,
} from "./environments-canvas-chrome-context";

function ChromeReadout({ label }: { label?: string }) {
  const chrome = useEnvironmentsCanvasChrome();
  if (!chrome) {
    return (
      <div className="text-destructive text-sm">
        {label ?? "Outside provider"} — context is null
      </div>
    );
  }
  return (
    <div className="border-border space-y-2 rounded-md border bg-card p-4 text-sm">
      <div className="text-muted-foreground font-medium">
        {label ?? "Inside provider"}
      </div>
      <div
        ref={chrome.viewportRef}
        className="bg-muted/40 text-muted-foreground rounded px-2 py-6 text-center text-xs"
      >
        viewport ref target
      </div>
    </div>
  );
}

function ChromeProviderDemo() {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  return (
    <EnvironmentsCanvasChromeContext.Provider value={{ viewportRef }}>
      <ChromeReadout />
    </EnvironmentsCanvasChromeContext.Provider>
  );
}

const meta = {
  title: "Features/Environments/Components/Canvas chrome context",
  component: ChromeProviderDemo,
  tags: ["autodocs"],
  render: () => (
    <div className="flex flex-col gap-6 p-6">
      <ChromeReadout label="No provider (hook)" />
      <ChromeProviderDemo />
    </div>
  ),
} satisfies Meta<typeof ChromeProviderDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
