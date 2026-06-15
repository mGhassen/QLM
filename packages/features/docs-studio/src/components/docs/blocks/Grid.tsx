'use client';

import { Children, useRef, type CSSProperties, type ReactNode } from 'react';
import {
  FLEX_ALIGN_MAP,
  FLEX_JUSTIFY_MAP,
  type FlexAlign,
  type FlexJustify,
} from '#/lib/block-schema';
import { trackPointerDrag } from '#/lib/fluid-drag';

interface GridProps {
  cols?: 2 | 3 | 4;
  rows?: 1 | 2 | 3 | 4;
  gap?: number;
  colGap?: number;
  rowGap?: number;
  colWidths?: number[];
  rowHeights?: number[];
  align?: FlexAlign;
  justify?: FlexJustify;
  className?: string;
  children?: ReactNode;
  studioMode?: boolean;
  selected?: boolean;
  onResize?: (colWidths: number[]) => void;
  onInsertAtCell?: (cellIndex: number) => void;
}

export default function Grid({
  cols = 2,
  rows = 1,
  gap,
  colGap,
  rowGap,
  colWidths,
  rowHeights,
  align,
  justify,
  className,
  children,
  studioMode,
  selected,
  onResize,
  onInsertAtCell,
}: GridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const classNames = [
    cols === 4 ? 'grid4' : cols === 3 ? 'grid3' : 'grid2',
    'studio-grid',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const widths = colWidths ?? Array.from({ length: cols }, () => 1);
  const heights = rowHeights ?? Array.from({ length: rows }, () => 1);
  const childCount = Children.count(children);
  const totalCells = cols * rows;
  const emptyCells = Math.max(0, totalCells - childCount);

  const colGapVal = colGap ?? gap;
  const rowGapVal = rowGap ?? gap;

  const style: CSSProperties = {
    ...(colGapVal || rowGapVal
      ? {
          columnGap: colGapVal ? `${colGapVal}mm` : undefined,
          rowGap: rowGapVal ? `${rowGapVal}mm` : undefined,
        }
      : {}),
    display: 'grid',
    gridTemplateColumns: widths.map((w) => `${w}fr`).join(' '),
    gridTemplateRows: heights
      .map((h) => (h === 1 ? 'auto' : `${h}fr`))
      .join(' '),
    ...(align ? { alignItems: FLEX_ALIGN_MAP[align] } : {}),
    ...(justify ? { justifyContent: FLEX_JUSTIFY_MAP[justify] } : {}),
  };

  const latestWidths = useRef<number[] | null>(null);

  function snapFr(v: number) {
    return Math.round(v * 20) / 20;
  }

  function startColResize(e: React.PointerEvent, colIndex: number) {
    if (!studioMode || !onResize) return;
    const grid = gridRef.current;
    if (!grid) return;

    const startX = e.clientX;
    const startWidths = [...widths];
    grid.classList.add('studio-transforming');
    grid.style.willChange = 'grid-template-columns';

    trackPointerDrag(e, {
      cursor: 'col-resize',
      onMove(ev) {
        const delta = (ev.clientX - startX) / 100;
        const next = [...startWidths];
        next[colIndex] = snapFr(Math.max(0.3, startWidths[colIndex] + delta));
        next[colIndex + 1] = snapFr(
          Math.max(0.3, startWidths[colIndex + 1] - delta),
        );
        latestWidths.current = next;
        grid.style.gridTemplateColumns = next.map((w) => `${w}fr`).join(' ');
      },
      onEnd() {
        grid.classList.remove('studio-transforming');
        grid.style.willChange = '';
        grid.style.removeProperty('grid-template-columns');
        if (latestWidths.current) onResize(latestWidths.current);
        latestWidths.current = null;
      },
    });
  }

  const showOverlay = studioMode && (selected || emptyCells > 0);

  return (
    <div
      ref={gridRef}
      className={`${classNames}${showOverlay ? ' studio-grid-active' : ''}`}
      style={{
        ...style,
        ...(showOverlay
          ? ({ '--grid-cols': cols, '--grid-rows': rows } as CSSProperties)
          : {}),
      }}
    >
      {children}

      {showOverlay &&
        Array.from({ length: emptyCells }).map((_, i) => {
          const cellIndex = childCount + i;
          const col = (cellIndex % cols) + 1;
          const row = Math.floor(cellIndex / cols) + 1;
          return (
            <div
              key={`empty-${i}`}
              className="studio-grid-empty-cell"
              style={{ gridColumn: col, gridRow: row }}
              onClick={(e) => {
                if (!onInsertAtCell) return;
                e.stopPropagation();
                onInsertAtCell(cellIndex);
              }}
            >
              +
            </div>
          );
        })}

      {showOverlay && (
        <div className="studio-grid-overlay" aria-hidden>
          {widths.map((w, i) => (
            <div
              key={`col-${i}`}
              className="studio-grid-track-label col"
              style={{
                left: `${(widths.slice(0, i).reduce((a, b) => a + b, 0) / widths.reduce((a, b) => a + b, 0)) * 100}%`,
              }}
            >
              {w}fr
            </div>
          ))}
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={`row-${i}`}
              className="studio-grid-track-label row"
              style={{ top: `${(i / rows) * 100}%` }}
            >
              Auto
            </div>
          ))}
        </div>
      )}

      {studioMode && onResize && widths.length > 1 && (
        <div className="studio-grid-handles">
          {widths.slice(0, -1).map((_, i) => {
            const total = widths.reduce((a, b) => a + b, 0);
            const leftPct =
              (widths.slice(0, i + 1).reduce((a, b) => a + b, 0) / total) * 100;
            return (
              <div
                key={i}
                className="studio-grid-col-handle"
                style={{ left: `${leftPct}%` }}
                onPointerDown={(e) => startColResize(e, i)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
