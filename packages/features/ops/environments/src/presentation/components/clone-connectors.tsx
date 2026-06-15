import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@guepard/ui/utils";

import { ENVIRONMENTS_CLONE_ROW_GAP_PX } from "../../environment-clone-canvas-layout";

/** Junction of primary stem + horizontal bar (same coords as {@link Connectors}). */
export function connectorJunctionPx(
  cols: number,
  cardWidthPx: number,
  gapPx: number = ENVIRONMENTS_CLONE_ROW_GAP_PX,
) {
  const colStep = cardWidthPx + gapPx;
  const totalW = cols * cardWidthPx + (cols - 1) * gapPx;
  const midY = 34;
  return { totalW, x: totalW / 2, y: midY, colStep };
}

export function Connectors({
  cols,
  cardWidthPx,
  gapPx = ENVIRONMENTS_CLONE_ROW_GAP_PX,
}: {
  cols: number;
  cardWidthPx: number;
  gapPx?: number;
}) {
  const { totalW, x: halfW, y: midY, colStep } = connectorJunctionPx(
    cols,
    cardWidthPx,
    gapPx,
  );
  const botY = 76;
  const barLeft = cardWidthPx / 2;
  const barRight = totalW - cardWidthPx / 2;
  const lineBase = { initial: { opacity: 0 }, animate: { opacity: 1 } };

  if (cols <= 1) {
    return (
      <svg
        width={totalW}
        height={botY + 4}
        className="block overflow-visible"
        aria-hidden
      >
        <motion.line
          x1={halfW}
          y1={0}
          x2={halfW}
          y2={botY}
          className="text-primary/55"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          {...lineBase}
          transition={{ delay: 0.06, duration: 0.28 }}
        />
      </svg>
    );
  }

  return (
    <svg
      width={totalW}
      height={botY + 4}
      className="block overflow-visible"
      aria-hidden
    >
      <motion.line
        x1={halfW}
        y1={0}
        x2={halfW}
        y2={midY}
        className="text-primary/55"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        {...lineBase}
        transition={{ delay: 0.06, duration: 0.22 }}
      />
      <motion.line
        x1={barLeft}
        y1={midY}
        x2={barRight}
        y2={midY}
        className="text-border"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        {...lineBase}
        transition={{ delay: 0.12, duration: 0.22 }}
      />
      {Array.from({ length: cols }, (_, i) => {
        const cx = cardWidthPx / 2 + i * colStep;
        const primary = i === 0;
        return (
          <motion.line
            key={i}
            x1={cx}
            y1={midY}
            x2={cx}
            y2={botY}
            className={primary ? "text-primary/50" : "text-muted-foreground/40"}
            stroke="currentColor"
            strokeWidth={primary ? 2 : 1.25}
            strokeLinecap="round"
            {...lineBase}
            transition={{ delay: 0.16 + i * 0.035, duration: 0.22 }}
          />
        );
      })}
    </svg>
  );
}

const junctionToggleBtnClass =
  "absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted/70 hover:text-foreground";

export function CloneConnectorStripWithToggle({
  cols,
  cardWidthPx,
  collapsed = false,
  showToggle = false,
  onToggle,
  className,
  /** When true, keeps strip width / toggle position but omits SVG fan (e.g. {@link Xarrow} replaces it). */
  hideFanLines = false,
  ariaLabelWhenExpanded = "Collapse branch",
  ariaLabelWhenCollapsed = "Expand branch",
}: {
  cols: number;
  cardWidthPx: number;
  collapsed?: boolean;
  showToggle?: boolean;
  onToggle?: () => void;
  className?: string;
  hideFanLines?: boolean;
  ariaLabelWhenExpanded?: string;
  ariaLabelWhenCollapsed?: string;
}) {
  const effectiveCols = collapsed ? 1 : Math.max(1, cols);
  const junction = connectorJunctionPx(effectiveCols, cardWidthPx);
  const aria = collapsed ? ariaLabelWhenCollapsed : ariaLabelWhenExpanded;
  const connectorStripHeightPx = 80;
  return (
    <div className={cn("-mt-1 flex w-full justify-center", className)}>
      <div className="relative shrink-0" style={{ width: junction.totalW }}>
        {hideFanLines ? (
          <div
            aria-hidden
            className="shrink-0"
            style={{ width: junction.totalW, height: connectorStripHeightPx }}
          />
        ) : (
          <Connectors cols={effectiveCols} cardWidthPx={cardWidthPx} />
        )}
        {showToggle && onToggle ? (
          <button
            type="button"
            aria-label={aria}
            title={aria}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={junctionToggleBtnClass}
            style={{ left: junction.x, top: junction.y }}
          >
            {collapsed ? (
              <ChevronDown
                className="h-3.5 w-3.5"
                strokeWidth={2.25}
                aria-hidden
              />
            ) : (
              <ChevronUp
                className="h-3.5 w-3.5"
                strokeWidth={2.25}
                aria-hidden
              />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
