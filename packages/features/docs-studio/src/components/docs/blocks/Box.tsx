"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  FLEX_ALIGN_MAP,
  FLEX_JUSTIFY_MAP,
  type FlexAlign,
  type FlexDirection,
  type FlexJustify,
} from "#/lib/block-schema";

interface BoxProps {
  direction?: FlexDirection | string;
  align?: FlexAlign | string;
  justify?: FlexJustify | string;
  gap?: number;
  wrap?: boolean;
  children?: ReactNode;
  studioMode?: boolean;
  selected?: boolean;
  empty?: boolean;
}

export default function Box({
  direction = "column",
  align = "stretch",
  justify = "start",
  gap,
  wrap,
  children,
  studioMode,
  selected,
  empty,
}: BoxProps) {
  const style: CSSProperties = {
    display: "flex",
    flexDirection: direction as FlexDirection,
    alignItems: FLEX_ALIGN_MAP[align as FlexAlign] ?? align,
    justifyContent: FLEX_JUSTIFY_MAP[justify as FlexJustify] ?? justify,
    flexWrap: wrap ? "wrap" : "nowrap",
    ...(gap != null ? { gap: `${gap}mm` } : {}),
  };

  const showOverlay = studioMode && (selected || empty);

  return (
    <div className={`doc-box${showOverlay ? " studio-flex-active" : ""}`} style={style}>
      {children}
      {showOverlay && (
        <div className="studio-flex-overlay" aria-hidden>
          <span className="studio-flex-direction-label">{direction === "row" ? "→" : "↓"}</span>
          {empty && <div className="studio-flex-empty-zone">Drop element here</div>}
        </div>
      )}
    </div>
  );
}
