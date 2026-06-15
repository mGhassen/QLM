"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { trackPointerDrag } from "#/lib/fluid-drag";
import { DEFAULT_LEVEL_TAB_WIDTH, levelGridTemplate } from "#/lib/levels-layout";

interface LevelsProps {
  headers?: string[];
  highlightLastHeader?: boolean;
  tabWidth?: number;
  colFlex?: number[];
  children?: ReactNode;
  studioMode?: boolean;
  selected?: boolean;
  onResize?: (colFlex: number[]) => void;
}

function snapFr(v: number) {
  return Math.round(v * 20) / 20;
}

export default function Levels({
  headers,
  highlightLastHeader,
  tabWidth = DEFAULT_LEVEL_TAB_WIDTH,
  colFlex,
  children,
  studioMode,
  selected,
  onResize,
}: LevelsProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const latestFlex = useRef<number[] | null>(null);
  const [handlePcts, setHandlePcts] = useState<number[]>([]);

  const columnFlex = colFlex ?? headers?.map(() => 1) ?? [1, 1];
  const gridTemplate = levelGridTemplate(tabWidth, columnFlex);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const row = grid?.querySelector(".lvl");
    if (!grid || !row) {
      setHandlePcts([]);
      return;
    }
    const gridRect = grid.getBoundingClientRect();
    const cells = row.querySelectorAll(".tab, .col");
    const pcts: number[] = [];
    for (let i = 0; i < cells.length - 1; i++) {
      if (i === 0) continue;
      pcts.push(
        (((cells[i] as HTMLElement).getBoundingClientRect().right - gridRect.left) / gridRect.width) *
          100,
      );
    }
    setHandlePcts(pcts);
  }, [gridTemplate, headers, children]);

  function startColResize(e: React.PointerEvent, colIndex: number) {
    if (!studioMode || !onResize || colIndex < 0) return;
    const grid = gridRef.current;
    if (!grid) return;

    const startX = e.clientX;
    const startWidths = [...columnFlex];
    grid.classList.add("studio-transforming");

    trackPointerDrag(e, {
      cursor: "col-resize",
      onMove(ev) {
        const delta = (ev.clientX - startX) / 100;
        const next = [...startWidths];
        next[colIndex] = snapFr(Math.max(0.3, startWidths[colIndex] + delta));
        next[colIndex + 1] = snapFr(Math.max(0.3, startWidths[colIndex + 1] - delta));
        latestFlex.current = next;
        grid.style.setProperty("--levels-grid-cols", levelGridTemplate(tabWidth, next));
      },
      onEnd() {
        grid.classList.remove("studio-transforming");
        grid.style.removeProperty("--levels-grid-cols");
        if (latestFlex.current) onResize(latestFlex.current);
        latestFlex.current = null;
      },
    });
  }

  const style = {
    "--levels-grid-cols": gridTemplate,
  } as CSSProperties;

  return (
    <div
      ref={gridRef}
      className={`levels${selected ? " studio-levels-active" : ""}`}
      style={style}
    >
      {headers && headers.length > 0 && (
        <div className="lhead">
          <div className="s" />
          {headers.map((header, i) => (
            <div
              key={i}
              className={`c${highlightLastHeader && i === headers.length - 1 ? " hi" : ""}`}
            >
              {header}
            </div>
          ))}
        </div>
      )}
      {children}
      {studioMode && onResize && handlePcts.length > 0 && (
        <div className="studio-levels-handles">
          {handlePcts.map((leftPct, i) => (
            <div
              key={i}
              className="studio-levels-col-handle"
              style={{ left: `${leftPct}%` }}
              onPointerDown={(e) => startColResize(e, i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
