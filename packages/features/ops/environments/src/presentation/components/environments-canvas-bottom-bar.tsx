import type { ReactNode } from "react";
import {
  LayoutGrid,
  Minus,
  Plus,
  Maximize2,
  Undo2,
  Redo2,
  Layers,
} from "lucide-react";

import { cn } from "@qlm/ui/utils";
import { Separator } from "@qlm/ui/separator";

function BarBtn({
  onClick,
  label,
  children,
  disabled,
  pressed,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors disabled:opacity-40",
        pressed
          ? "bg-primary/12 text-primary hover:bg-primary/20 hover:text-foreground"
          : "text-muted-foreground hover:bg-env-hover hover:text-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function EnvironmentsCanvasBottomBar({
  scalePct,
  onZoomIn,
  onZoomOut,
  onFitView,
  onOpenCommandPalette,
  onEnvironmentList,
  environmentListActive,
  zoomControlsDisabled,
}: {
  scalePct: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onOpenCommandPalette: () => void;
  /** When set, first control toggles environment list instead of fitting the canvas. */
  onEnvironmentList?: () => void;
  environmentListActive?: boolean;
  /** Disables zoom / fit controls (e.g. while environment list is shown). */
  zoomControlsDisabled?: boolean;
}) {
  return (
    <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-border bg-card px-1.5 py-1 shadow-xl">
      {onEnvironmentList ? (
        <BarBtn
          label="Environment list"
          onClick={onEnvironmentList}
          pressed={environmentListActive}
        >
          <LayoutGrid className="h-4 w-4" />
        </BarBtn>
      ) : (
        <BarBtn label="Overview" onClick={onFitView}>
          <LayoutGrid className="h-4 w-4" />
        </BarBtn>
      )}
      <Separator orientation="vertical" className="mx-0.5 h-5 shrink-0 self-center" />
      <BarBtn label="Zoom out" onClick={onZoomOut} disabled={zoomControlsDisabled}>
        <Minus className="h-4 w-4" />
      </BarBtn>
      <span className="min-w-[3rem] px-1 text-center font-mono text-xs tabular-nums text-foreground">
        {scalePct}%
      </span>
      <BarBtn label="Zoom in" onClick={onZoomIn} disabled={zoomControlsDisabled}>
        <Plus className="h-4 w-4" />
      </BarBtn>
      <BarBtn label="Fit to view" onClick={onFitView} disabled={zoomControlsDisabled}>
        <Maximize2 className="h-4 w-4" />
      </BarBtn>
      <Separator orientation="vertical" className="mx-0.5 h-5 shrink-0 self-center" />
      <BarBtn label="Undo" onClick={() => {}} disabled>
        <Undo2 className="h-4 w-4" />
      </BarBtn>
      <BarBtn label="Redo" onClick={() => {}} disabled>
        <Redo2 className="h-4 w-4" />
      </BarBtn>
      <BarBtn label="Layers" onClick={() => {}} disabled>
        <Layers className="h-4 w-4" />
      </BarBtn>
      <Separator orientation="vertical" className="mx-0.5 h-5 shrink-0 self-center" />
      <button
        type="button"
        aria-label="Add resource"
        title="Add resource (⌘K)"
        onClick={onOpenCommandPalette}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary transition-colors hover:bg-primary/20"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
