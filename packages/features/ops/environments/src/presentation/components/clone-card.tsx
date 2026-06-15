import { useState, type HTMLAttributes, type Ref } from "react";
import { cn } from "@guepard/ui/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@guepard/ui/context-menu";
import {
  Copy,
  Plus,
  Terminal,
  SlidersHorizontal,
  Zap,
  Braces,
  BarChart2,
  Settings,
  Trash2,
  HardDrive,
  Network,
  GitBranch,
  Link2,
  Shield,
  ChevronRight,
} from "lucide-react";

import type { Service, ServiceStatus, ServiceType } from "./service-card";

interface CloneCardProps {
  service: Service;
  /** Outer wrapper (e.g. RF node: `h-full` so handles align with the painted card). */
  className?: string;
  /** RF: measure painted height vs node shell to place bottom handle on the real card edge. */
  measureRef?: Ref<HTMLDivElement>;
  onClick?: (service: Service) => void;
  /**
   * Canvas (dnd-kit): put activator on the inner card surface only so drag does not start from
   * outer box-shadow or merged-stack top padding.
   */
  canvasDragActivatorProps?: HTMLAttributes<HTMLDivElement>;
  /** Opens branching / history for this clone (header Git control). */
  onOpenBranching?: (service: Service) => void;
  /** Data-plane tray (same slot as service card node row) — opens masking panel. */
  onOpenMasking?: (service: Service) => void;
  /** Workspace tree: context menu action to fork another clone from this node (or from primary). */
  onCreateDownstreamClone?: (service: Service) => void;
  selected?: boolean;
  stacked?: boolean;
  branchingButtonVisibility?: "hover" | "always";
}

function isDataServiceType(type: ServiceType) {
  return (
    type === "external_datasource" ||
    type === "postgres" ||
    type === "redis" ||
    type === "mongo" ||
    type === "mysql"
  );
}

function ServiceIcon({ type }: { type: ServiceType }) {
  if (type === "external_datasource") {
    return (
      <div className="flex size-8 items-center justify-center rounded-none border border-border-subtle bg-secondary">
        <Link2 className="size-4 text-primary" />
      </div>
    );
  }
  if (type === "postgres") {
    return (
      <div className="flex size-8 items-center justify-center rounded-none border border-border-subtle bg-muted text-lg">
        🐘
      </div>
    );
  }
  if (type === "redis") {
    return (
      <div className="flex size-8 items-center justify-center rounded-none border border-border-subtle bg-muted text-lg">
        🟥
      </div>
    );
  }
  if (type === "mongo") {
    return (
      <div className="flex size-8 items-center justify-center rounded-none border border-border-subtle bg-muted text-lg">
        🍃
      </div>
    );
  }
  if (type === "mysql") {
    return (
      <div className="flex size-8 items-center justify-center rounded-none border border-border-subtle bg-muted text-lg">
        🐬
      </div>
    );
  }
  if (type === "web") {
    return (
      <div className="flex size-8 items-center justify-center rounded-none bg-primary/15">
        <Network className="size-4 text-primary" />
      </div>
    );
  }
  if (type === "bucket") {
    return (
      <div className="flex size-8 items-center justify-center rounded-none bg-primary/10">
        <HardDrive className="size-4 text-primary" />
      </div>
    );
  }
  return (
    <div className="flex size-8 items-center justify-center rounded-none bg-muted">
      <HardDrive className="size-4 text-muted-foreground" />
    </div>
  );
}

const STATUS_TITLE: Record<ServiceStatus, string> = {
  online: "Online",
  deploying: "Deploying",
  offline: "Offline",
  error: "Error",
};

function StatusDot({ status }: { status: ServiceStatus }) {
  const cls: Record<ServiceStatus, string> = {
    online: "bg-emerald-500",
    deploying: "bg-amber-500",
    offline: "bg-muted-foreground",
    error: "bg-destructive",
  };
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", cls[status])}
    />
  );
}

function ProviderLogo({
  url,
  label,
  size = 22,
  plain = false,
}: {
  url?: string;
  label: string;
  size?: number;
  plain?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className={cn(
          "shrink-0 object-contain",
          plain
            ? "rounded-sm bg-transparent"
            : "rounded-none border border-border-subtle bg-muted",
        )}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center text-[10px] font-bold text-muted-foreground",
        plain
          ? "rounded-sm bg-transparent"
          : "rounded-none border border-border-subtle bg-muted",
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

function CloneBranchingActionButton({
  service,
  visible,
  onOpenBranching,
}: {
  service: Service;
  visible: boolean;
  onOpenBranching?: (s: Service) => void;
}) {
  if (!visible || !onOpenBranching) return null;
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onOpenBranching(service);
      }}
      title="Open branching"
      aria-label="Open branching"
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md",
        "text-primary/80 transition-[background-color,color] duration-150",
        "hover:bg-muted/45 hover:text-primary",
        "active:bg-muted/65",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30",
      )}
    >
      <GitBranch className="size-3.5" aria-hidden />
    </button>
  );
}

function CloneBranchingActionSlot({
  service,
  onOpenBranching,
  branchingButtonVisibility,
  showBranchingBtn,
}: {
  service: Service;
  onOpenBranching?: (s: Service) => void;
  branchingButtonVisibility: "hover" | "always";
  showBranchingBtn: boolean;
}) {
  if (!onOpenBranching) return null;
  if (branchingButtonVisibility === "hover" && !showBranchingBtn) {
    return <span className="size-6 shrink-0" aria-hidden />;
  }
  return (
    <CloneBranchingActionButton
      service={service}
      visible={showBranchingBtn}
      onOpenBranching={onOpenBranching}
    />
  );
}

/** Max stacked “back” cards drawn (depth hint for many clones). */
const MERGED_STACK_VISUAL_LAYERS_MAX = 8;
/** Space above the front card so stacked “backs” read at full clone width (not squeezed). */
const MERGED_STACK_TOP_PAD = "pt-[42px]";
const MERGED_STACK_LAYER_H = "h-[112px]";
const MERGED_STACK_LAYER_STAGGER_PX = 6;

export function CloneCard({
  service,
  className,
  measureRef,
  onClick,
  canvasDragActivatorProps,
  onOpenBranching,
  onOpenMasking,
  onCreateDownstreamClone,
  selected,
  stacked,
  branchingButtonVisibility = "hover",
}: CloneCardProps) {
  void stacked;
  const [hovered, setHovered] = useState(false);
  const {
    className: canvasDragActivatorClassName,
    ...canvasDragActivatorRest
  } = canvasDragActivatorProps ?? {};
  const showBranchingBtn =
    Boolean(onOpenBranching) &&
    (branchingButtonVisibility === "always" || hovered);
  const dataPlane = isDataServiceType(service.type);
  const providerLabel = service.databaseProviderName ?? service.name;
  const mergedStack = service.mergedCloneStackPreview;
  /** Stacked “card backs” only for the collapsed aggregate (many clones); not for individual nodes. */
  const showMergedStackVisual = Boolean(mergedStack);
  const mergedLayers =
    mergedStack != null
      ? Math.min(
          MERGED_STACK_VISUAL_LAYERS_MAX,
          Math.max(2, mergedStack.total - 1),
        )
      : 0;
  const cardWidth = dataPlane ? "w-[236px]" : "w-[200px]";
  const showMaskingFooter =
    dataPlane && Boolean(onOpenMasking) && !showMergedStackVisual;
  const dataMasked = service.dataMaskingEnabled ?? true;
  const emptyMaskingStrip = showMaskingFooter && !dataMasked;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={measureRef}
          className={cn(
            "relative shrink-0 outline-none rounded-2xl",
            cardWidth,
            "group",
            "transition-[box-shadow,ring] duration-300 ease-out",
            className,
            showMergedStackVisual && MERGED_STACK_TOP_PAD,
            showMergedStackVisual && selected && "border-[0.5px] border-primary",
            !selected &&
              !hovered &&
              cn("shadow-xs", "dark:shadow-svc-card-dark-idle"),
            !selected &&
              hovered &&
              cn("shadow-lg", "dark:shadow-svc-card-dark-hover"),
            selected && cn("shadow-xl", "dark:shadow-svc-card-dark-selected"),
            selected && !showMergedStackVisual && "ring-2 ring-primary/25",
          )}
        >
          {showMergedStackVisual && mergedStack ? (
            <>
              {Array.from({ length: mergedLayers }, (_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "pointer-events-none absolute inset-x-0 rounded-2xl border shadow-none",
                    MERGED_STACK_LAYER_H,
                    idx === 0 && "border-border/50 bg-card",
                    idx === 1 && "border-border/65 bg-card/92",
                    idx >= 2 && "border-border/70 bg-card/80",
                  )}
                  style={{
                    top: idx * MERGED_STACK_LAYER_STAGGER_PX,
                    zIndex: idx,
                    opacity: Math.max(0.55, 1 - idx * 0.07),
                  }}
                  aria-hidden
                />
              ))}
            </>
          ) : null}
          <div
            className={cn(
              "relative z-10 flex cursor-pointer flex-col bg-card text-card-foreground select-none",
              showMaskingFooter
                ? "overflow-x-hidden overflow-y-visible"
                : "overflow-hidden",
              showMergedStackVisual
                ? cn(
                    "w-full",
                    dataPlane ? "min-w-[236px]" : "min-w-[200px]",
                  )
                : cardWidth,
              "rounded-2xl",
              showMergedStackVisual
                ? cn(
                    showMaskingFooter ? "border border-border" : "border-subtle-frame",
                    "shadow-none",
                  )
                : cn(
                    selected && !emptyMaskingStrip && "border-[0.5px] border-primary",
                    selected && emptyMaskingStrip && "rounded-2xl ring-2 ring-primary/25",
                    !selected &&
                      !emptyMaskingStrip &&
                      (showMaskingFooter ? "border border-border" : "border-subtle-frame"),
                  ),
              canvasDragActivatorProps && "touch-none cursor-grab active:cursor-grabbing",
              canvasDragActivatorClassName,
            )}
            onClick={() => onClick?.(service)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            {...canvasDragActivatorRest}
          >
            <div
              className={cn(
                "relative z-[1] bg-card px-4 pb-3",
                mergedStack ? "pt-4" : "pt-3",
                emptyMaskingStrip &&
                  cn(
                    "overflow-hidden rounded-b-2xl border",
                    selected ? "border-primary" : "border-border",
                  ),
                dataPlane &&
                  showMaskingFooter &&
                  dataMasked &&
                  cn("rounded-b-2xl", "shadow-lg", "dark:shadow-svc-card-dark-footer"),
              )}
            >
              {dataPlane ? (
                <>
                  <div
                    className={cn(
                      "mb-2 flex min-w-0 flex-col gap-1.5",
                      mergedStack && "gap-2",
                    )}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span
                          className="flex shrink-0 items-center"
                          title={STATUS_TITLE[service.status]}
                        >
                          <StatusDot status={service.status} />
                        </span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate font-semibold text-foreground",
                            mergedStack ? "text-base leading-snug" : "text-sm",
                          )}
                        >
                          {service.name}
                        </span>
                      </div>
                      <CloneBranchingActionSlot
                        service={service}
                        onOpenBranching={onOpenBranching}
                        branchingButtonVisibility={branchingButtonVisibility}
                        showBranchingBtn={showBranchingBtn}
                      />
                    </div>
                    <div className="flex min-w-0 items-start gap-2">
                      <ProviderLogo
                        url={service.databaseProviderLogoUrl}
                        label={providerLabel}
                        size={mergedStack ? 26 : 22}
                        plain
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold leading-tight text-muted-foreground">
                          {service.databaseProviderName ?? "Database"}
                        </div>
                        {service.databaseVersion ? (
                          <div className="mt-0.5 text-[10px] text-muted-foreground/90">
                            v{service.databaseVersion}
                          </div>
                        ) : null}
                        {mergedStack ? (
                          <div className="mt-2 text-[11px] leading-snug text-muted-foreground">
                            Click to show all {mergedStack.total} clones
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <ServiceIcon type={service.type} />
                    <span
                      className="flex shrink-0 items-center"
                      title={STATUS_TITLE[service.status]}
                    >
                      <StatusDot status={service.status} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                      {service.name}
                    </span>
                  </div>
                  <CloneBranchingActionSlot
                    service={service}
                    onOpenBranching={onOpenBranching}
                    branchingButtonVisibility={branchingButtonVisibility}
                    showBranchingBtn={showBranchingBtn}
                  />
                </div>
              )}
            </div>

            {showMaskingFooter && dataMasked ? (
              <div
                className={cn(
                  "relative z-0 -mt-3 flex shrink-0 items-center border-t border-violet-500/25 bg-violet-500/[0.12] px-4 py-4 transition-colors duration-200",
                  "dark:border-violet-400/30 dark:bg-violet-500/15",
                  "group-hover:bg-violet-500/[0.18] dark:group-hover:bg-violet-500/22",
                )}
              >
                <button
                  type="button"
                  aria-label="Open data masking"
                  className="flex min-w-0 w-full translate-y-1.5 cursor-pointer items-center justify-between gap-3 border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMasking?.(service);
                  }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Shield className="size-3.5 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
                    <span className="truncate text-[11px] font-semibold text-violet-950 dark:text-violet-100">
                      Data masking
                    </span>
                  </div>
                  <div className="flex min-w-0 max-w-[58%] flex-1 items-center justify-end gap-1">
                    <span className="truncate text-right font-mono text-[11px] font-medium text-violet-800/90 dark:text-violet-200/90">
                      Column rules
                    </span>
                    <ChevronRight className="size-3 shrink-0 text-violet-600/70 dark:text-violet-400/80" aria-hidden />
                  </div>
                </button>
              </div>
            ) : showMaskingFooter ? (
              <div
                className={cn(
                  "group/mask-empty relative z-0 -mt-3 flex shrink-0 items-center rounded-b-2xl border-x border-b border-dashed border-t-0 border-muted-foreground/50 bg-card px-4 py-4 transition-[border-color,background-color] duration-200",
                  "hover:border-violet-500 hover:bg-muted/10 dark:hover:border-violet-400 dark:hover:bg-muted/10",
                )}
              >
                <button
                  type="button"
                  aria-label="Add data masking"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMasking?.(service);
                  }}
                  className="flex min-w-0 w-full translate-y-1.5 cursor-pointer items-center border-0 bg-transparent p-0 text-left font-mono text-[11px] font-medium text-muted-foreground outline-none transition-colors duration-200 group-hover/mask-empty:text-violet-600 dark:group-hover/mask-empty:text-violet-400 focus-visible:ring-2 focus-visible:ring-violet-500/40"
                >
                  + Add masking
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56 rounded-none border border-border-subtle bg-popover py-1 text-popover-foreground shadow-xl">
        {onCreateDownstreamClone ? (
          <ContextMenuItem
            className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-foreground focus:text-foreground"
            onSelect={() => onCreateDownstreamClone(service)}
          >
            <Plus className="size-4 text-primary" />
            Create clone
          </ContextMenuItem>
        ) : null}
        {onCreateDownstreamClone ? (
          <ContextMenuSeparator className="bg-border-subtle" />
        ) : null}
        {onOpenMasking ? (
          <ContextMenuItem
            className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-foreground focus:text-foreground"
            onSelect={() => onOpenMasking(service)}
          >
            <Shield className="size-4 text-violet-400" />
            Data masking
          </ContextMenuItem>
        ) : null}
        {onOpenMasking ? <ContextMenuSeparator className="bg-border-subtle" /> : null}
        {onOpenBranching ? (
          <ContextMenuItem
            className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-foreground focus:text-foreground"
            onSelect={() => onOpenBranching(service)}
          >
            <GitBranch className="size-4 text-primary" />
            Open branching
          </ContextMenuItem>
        ) : null}
        {onOpenBranching ? <ContextMenuSeparator className="bg-border-subtle" /> : null}
        <ContextMenuSub>
          <ContextMenuSubTrigger className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
            <Copy className="size-4 text-muted-foreground" />
            Group
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="rounded-none border border-border-subtle bg-popover text-popover-foreground shadow-lg">
            <ContextMenuItem className="cursor-pointer text-sm">New group</ContextMenuItem>
            <ContextMenuItem className="cursor-pointer text-sm">Add to existing</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
          <Terminal className="size-4 text-muted-foreground" />
          Copy SSH Command
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            Config
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="rounded-none border border-border-subtle bg-popover text-popover-foreground shadow-lg">
            <ContextMenuItem className="cursor-pointer text-sm">Environment Variables</ContextMenuItem>
            <ContextMenuItem className="cursor-pointer text-sm">Resource Limits</ContextMenuItem>
            <ContextMenuItem className="cursor-pointer text-sm">Networking</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator className="bg-border-subtle" />

        <ContextMenuItem className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
          <Zap className="size-4 text-muted-foreground" />
          Latest deploy
        </ContextMenuItem>

        <ContextMenuItem className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
          <Braces className="size-4 text-muted-foreground" />
          View Variables
        </ContextMenuItem>

        <ContextMenuItem className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
          <BarChart2 className="size-4 text-muted-foreground" />
          View Metrics
        </ContextMenuItem>

        <ContextMenuItem className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
          <Settings className="size-4 text-muted-foreground" />
          View Settings
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-border-subtle" />

        <ContextMenuItem className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground focus:text-foreground">
          <Copy className="size-4 text-muted-foreground" />
          Duplicate
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-border-subtle" />

        <ContextMenuItem className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-destructive focus:text-destructive">
          <Trash2 className="size-4" />
          Delete Service
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
