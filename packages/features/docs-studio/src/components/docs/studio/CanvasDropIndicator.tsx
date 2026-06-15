"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { CanvasDropTarget } from "#/lib/canvas-drop";
import { viewportRectToCanvas } from "#/lib/block-rect";

interface CanvasDropIndicatorProps {
  dropTarget: CanvasDropTarget | null;
}

export default function CanvasDropIndicator({ dropTarget }: CanvasDropIndicatorProps) {
  const [dock, setDock] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setDock(document.querySelector<HTMLElement>(".studio-block-chrome-dock"));
  }, []);

  if (!dock || !dropTarget) return null;

  const { rect: viewportRect, position, valid } = dropTarget;
  const rect = viewportRectToCanvas(viewportRect);
  const invalid = !valid;

  if (position === "inside") {
    return createPortal(
      <div
        className={`studio-canvas-drop-indicator inside${invalid ? " invalid" : ""}`}
        style={{
          position: "absolute",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          pointerEvents: "none",
          zIndex: 200,
        }}
      />,
      dock,
    );
  }

  const lineTop = position === "before" ? rect.top : rect.top + rect.height;

  return createPortal(
    <div
      className={`studio-canvas-drop-indicator line${invalid ? " invalid" : ""}`}
      style={{
        position: "absolute",
        top: lineTop - 1,
        left: rect.left,
        width: rect.width,
        height: 2,
        pointerEvents: "none",
        zIndex: 200,
      }}
    />,
    dock,
  );
}
