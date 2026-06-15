import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import type { CanvasCardLayoutMode } from "./canvas-card-layout";
import {
  defaultCanvasFreePosition,
  EnvironmentsServicesCanvas,
} from "./environments-services-canvas";
import { DEFAULT_CANVAS_SERVICES } from "./environments-workspace-mock";

const meta = {
  title: "Features/Environments/Components/Services canvas",
  component: EnvironmentsServicesCanvas,
  tags: ["autodocs"],
  args: {
    services: DEFAULT_CANVAS_SERVICES,
    onSelectService: fn(),
  },
  argTypes: {
    services: { table: { disable: true } },
    onSelectService: { table: { disable: true } },
    onOpenServiceWorkspace: { table: { disable: true } },
    onOpenCommandPalette: { table: { disable: true } },
    onReorderServices: { table: { disable: true } },
    onCardLayoutModeChange: { table: { disable: true } },
    inventoryServices: { table: { disable: true } },
    inventoryEnvironmentOrder: { table: { disable: true } },
    activeEnvironment: { table: { disable: true } },
    onInventorySelect: { table: { disable: true } },
    showEnvironmentList: { table: { disable: true } },
    onToggleEnvironmentList: { table: { disable: true } },
    inventoryGroupBy: { table: { disable: true } },
    onInventoryGroupByChange: { table: { disable: true } },
    focusServiceId: { table: { disable: true } },
    onFocusServiceApplied: { table: { disable: true } },
    onDismissCanvasUrlSelection: { table: { disable: true } },
    selectedServiceId: { control: "text" },
    cardLayoutMode: {
      control: "inline-radio",
      options: ["grid", "free", "timeline"] satisfies CanvasCardLayoutMode[],
    },
  },
} satisfies Meta<typeof EnvironmentsServicesCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

function CanvasShell(props: { children: React.ReactNode }) {
  return (
    <div className="relative h-[min(85vh,720px)] w-full max-w-5xl overflow-hidden rounded-lg border border-border">
      {props.children}
    </div>
  );
}

export const DrillIntoTree: Story = {
  name: "Single action (tree)",
  render: () => {
    const [services, setServices] = React.useState(() =>
      DEFAULT_CANVAS_SERVICES.map((s) => ({ ...s })),
    );
    const [layoutMode, setLayoutMode] = React.useState<CanvasCardLayoutMode>("grid");
    const onLayoutMode = React.useCallback((mode: CanvasCardLayoutMode) => {
      setLayoutMode(mode);
      if (mode === "free") {
        setServices((prev) =>
          prev.map((s, i) => {
            if (s.x != null && s.y != null) return s;
            return { ...s, ...defaultCanvasFreePosition(i, prev.length) };
          }),
        );
      }
    }, []);
    return (
      <CanvasShell>
        <EnvironmentsServicesCanvas
          services={services}
          onSelectService={fn()}
          onOpenCommandPalette={fn()}
          onReorderServices={setServices}
          cardLayoutMode={layoutMode}
          onCardLayoutModeChange={onLayoutMode}
        />
      </CanvasShell>
    );
  },
};

export const GridWithSidePanel: Story = {
  name: "Split (panel + workspace)",
  render: () => {
    const [services, setServices] = React.useState(() =>
      DEFAULT_CANVAS_SERVICES.map((s) => ({ ...s })),
    );
    const [layoutMode, setLayoutMode] = React.useState<CanvasCardLayoutMode>("grid");
    const onLayoutMode = React.useCallback((mode: CanvasCardLayoutMode) => {
      setLayoutMode(mode);
      if (mode === "free") {
        setServices((prev) =>
          prev.map((s, i) => {
            if (s.x != null && s.y != null) return s;
            return { ...s, ...defaultCanvasFreePosition(i, prev.length) };
          }),
        );
      }
    }, []);
    return (
      <CanvasShell>
        <EnvironmentsServicesCanvas
          services={services}
          selectedServiceId="svc-pg"
          onSelectService={fn()}
          onOpenServiceWorkspace={fn()}
          onOpenCommandPalette={fn()}
          onReorderServices={setServices}
          cardLayoutMode={layoutMode}
          onCardLayoutModeChange={onLayoutMode}
        />
      </CanvasShell>
    );
  },
};

export const Playground: Story = {
  args: {
    selectedServiceId: "",
    cardLayoutMode: "grid" as CanvasCardLayoutMode,
  },
  render: function PlaygroundRender(args) {
    const [services, setServices] = React.useState(() =>
      DEFAULT_CANVAS_SERVICES.map((s) => ({ ...s })),
    );
    const [layoutMode, setLayoutMode] = React.useState<CanvasCardLayoutMode>(
      args.cardLayoutMode ?? "grid",
    );

    React.useEffect(() => {
      setLayoutMode(args.cardLayoutMode ?? "grid");
    }, [args.cardLayoutMode]);

    const onLayoutMode = React.useCallback((mode: CanvasCardLayoutMode) => {
      setLayoutMode(mode);
      if (mode === "free") {
        setServices((prev) =>
          prev.map((s, i) => {
            if (s.x != null && s.y != null) return s;
            return { ...s, ...defaultCanvasFreePosition(i, prev.length) };
          }),
        );
      }
    }, []);

    return (
      <CanvasShell>
        <EnvironmentsServicesCanvas
          services={services}
          selectedServiceId={
            args.selectedServiceId === "" ? null : args.selectedServiceId
          }
          onSelectService={fn()}
          onOpenServiceWorkspace={fn()}
          onOpenCommandPalette={fn()}
          onReorderServices={setServices}
          cardLayoutMode={layoutMode}
          onCardLayoutModeChange={onLayoutMode}
        />
      </CanvasShell>
    );
  },
};
