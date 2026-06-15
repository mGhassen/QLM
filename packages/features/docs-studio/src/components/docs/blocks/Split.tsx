"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { trackPointerDrag } from "#/lib/fluid-drag";

interface SplitProps {
  reverse?: boolean;
  mainFlex?: number;
  railFlex?: number;
  children?: ReactNode;
  studioMode?: boolean;
  onResize?: (mainFlex: number, railFlex: number) => void;
}

export default function Split({
  reverse,
  mainFlex = 1.75,
  railFlex = 1,
  children,
  studioMode,
  onResize,
}: SplitProps) {
  const splitRef = useRef<HTMLDivElement>(null);
  const latestFlex = useRef<{ main: number; rail: number } | null>(null);

  const style = {
    "--main-flex": mainFlex,
    "--rail-flex": railFlex,
  } as CSSProperties;

  function handleResize(e: React.PointerEvent) {
    if (!studioMode || !onResize) return;
    const split = splitRef.current;
    if (!split) return;

    const startX = e.clientX;
    const startMain = mainFlex;
    const startRail = railFlex;
    split.classList.add("studio-transforming");
    split.style.willChange = "--main-flex, --rail-flex";

    trackPointerDrag(e, {
      cursor: "col-resize",
      onMove(ev) {
        const delta = (ev.clientX - startX) / 100;
        const next = {
          main: Math.max(0.5, Math.min(3, startMain + delta)),
          rail: Math.max(0.5, Math.min(3, startRail - delta)),
        };
        latestFlex.current = next;
        split.style.setProperty("--main-flex", String(next.main));
        split.style.setProperty("--rail-flex", String(next.rail));
      },
      onEnd() {
        split.classList.remove("studio-transforming");
        split.style.willChange = "";
        split.style.removeProperty("--main-flex");
        split.style.removeProperty("--rail-flex");
        if (latestFlex.current) {
          onResize(latestFlex.current.main, latestFlex.current.rail);
        }
        latestFlex.current = null;
      },
    });
  }

  return (
    <div ref={splitRef} className={`split${reverse ? " rev" : ""}`} style={style}>
      {children}
      {studioMode && onResize && (
        <div className="resize-handle right" onPointerDown={handleResize} />
      )}
    </div>
  );
}
