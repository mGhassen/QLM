import type { ReactNode } from "react";
import { Grid3x3, History, Move, Rows2, Sparkles } from "lucide-react";

import { cn } from "@guepard/ui/utils";
import { Separator } from "@guepard/ui/separator";

import type { CanvasCardLayoutMode } from "./canvas-card-layout";

function BarIconBtn({
  label,
  onClick,
  pressed,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  pressed?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        pressed
          ? "bg-primary/12 text-primary hover:bg-primary/20"
          : "text-muted-foreground hover:bg-env-hover hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function EnvironmentsCanvasLayoutTopBar({
  mode,
  onChange,
  className,
}: {
  mode: CanvasCardLayoutMode;
  onChange: (mode: CanvasCardLayoutMode) => void;
  className?: string;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Card layout"
      className={cn(
        "pointer-events-auto flex h-fit w-fit shrink-0 items-center gap-0.5 rounded-lg border border-border bg-card/95 px-0.5 py-0.5 shadow-md backdrop-blur-sm",
        className,
      )}
    >
      <BarIconBtn
        label="Grid layout — drag cards to reorder in slots"
        pressed={mode === "grid"}
        onClick={() => onChange("grid")}
      >
        <Grid3x3 className="h-3.5 w-3.5" />
      </BarIconBtn>
      <BarIconBtn
        label="Free canvas — drag cards anywhere"
        pressed={mode === "free"}
        onClick={() => onChange("free")}
      >
        <Move className="h-3.5 w-3.5" />
      </BarIconBtn>
      <BarIconBtn
        label="Timeline — checkpoints along a horizontal axis"
        pressed={mode === "timeline"}
        onClick={() => onChange("timeline")}
      >
        <History className="h-3.5 w-3.5" />
      </BarIconBtn>
      <Separator orientation="vertical" className="mx-0.5 h-4 shrink-0 self-center" />
      <BarIconBtn label="Row packing (soon)" disabled>
        <Rows2 className="h-3.5 w-3.5" />
      </BarIconBtn>
      <BarIconBtn label="Auto-arrange (soon)" disabled>
        <Sparkles className="h-3.5 w-3.5" />
      </BarIconBtn>
    </div>
  );
}
