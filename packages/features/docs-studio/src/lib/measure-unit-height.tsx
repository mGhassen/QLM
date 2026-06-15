"use client";

import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import DocRenderer from "#/components/docs/DocRenderer";
import type { BlockPageFragment } from "./page-fragment";
import type { BlockNode } from "./types";

let measureHost: HTMLDivElement | null = null;
let measureRoot: Root | null = null;

function ensureMeasureHost(widthPx: number): HTMLDivElement {
  if (!measureHost) {
    measureHost = document.createElement("div");
    measureHost.setAttribute("aria-hidden", "true");
    measureHost.style.position = "fixed";
    measureHost.style.left = "-10000px";
    measureHost.style.top = "0";
    measureHost.style.visibility = "hidden";
    measureHost.style.pointerEvents = "none";
    measureHost.style.zIndex = "-1";
    document.body.appendChild(measureHost);
    measureRoot = createRoot(measureHost);
  }

  measureHost.style.width = `${widthPx}px`;
  return measureHost;
}

export function measureUnitBlocksHeight(
  blocks: BlockNode[],
  sections: Record<string, string>,
  widthPx: number,
  studioMode = false,
  pageFragments?: Record<string, BlockPageFragment>,
): number {
  if (typeof document === "undefined") return 0;

  const host = ensureMeasureHost(widthPx);
  if (!measureRoot) return 0;

  flushSync(() => {
    measureRoot!.render(
      <div className={`doc-page doc-measure-column${studioMode ? " doc-studio" : ""}`}>
        <DocRenderer
          blocks={blocks}
          sections={sections}
          studioMode={studioMode}
          pageFragments={pageFragments}
        />
      </div>,
    );
  });

  return host.getBoundingClientRect().height;
}
