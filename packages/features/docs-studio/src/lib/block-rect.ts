'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

const CANVAS_SELECTOR = '.doc-studio .studio-canvas';

function getCanvas(): HTMLElement | null {
  return document.querySelector<HTMLElement>(CANVAS_SELECTOR);
}

const canvasListeners = new Set<() => void>();
let canvasScrollAttached = false;
let canvasScrollRaf = 0;

function flushCanvasListeners() {
  canvasScrollRaf = 0;
  canvasListeners.forEach((fn) => fn());
}

function scheduleCanvasListeners() {
  if (canvasScrollRaf) return;
  canvasScrollRaf = requestAnimationFrame(flushCanvasListeners);
}

function attachCanvasListeners() {
  if (canvasScrollAttached) return;
  const canvas = getCanvas();
  if (!canvas) return;
  canvasScrollAttached = true;
  canvas.addEventListener('scroll', scheduleCanvasListeners, { passive: true });
  const ro = new ResizeObserver(scheduleCanvasListeners);
  ro.observe(canvas);
}

function subscribeCanvasUpdates(fn: () => void) {
  canvasListeners.add(fn);
  attachCanvasListeners();
  return () => {
    canvasListeners.delete(fn);
  };
}

export function getBlockRect(root: HTMLElement | null): DOMRect | null {
  if (!root) return null;

  const rootRect = root.getBoundingClientRect();
  if (rootRect.width > 0 || rootRect.height > 0) return rootRect;

  const queue: Element[] = [...root.children];
  while (queue.length) {
    const node = queue.shift()!;
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) return rect;
    for (const child of node.children) queue.push(child);
  }

  return null;
}

export function viewportRectToCanvas(rect: DOMRect): DOMRect {
  const canvas = getCanvas();
  if (!canvas) return rect;

  const canvasRect = canvas.getBoundingClientRect();
  return new DOMRect(
    rect.left - canvasRect.left + canvas.scrollLeft,
    rect.top - canvasRect.top + canvas.scrollTop,
    rect.width,
    rect.height,
  );
}

/** Block bounds in canvas scroll-content coordinates (scrolls with the document). */
export function getBlockCanvasRect(root: HTMLElement | null): DOMRect | null {
  const blockRect = getBlockRect(root);
  if (!blockRect) return null;

  const canvas = getCanvas();
  if (!canvas) return blockRect;

  const canvasRect = canvas.getBoundingClientRect();
  return new DOMRect(
    blockRect.left - canvasRect.left + canvas.scrollLeft,
    blockRect.top - canvasRect.top + canvas.scrollTop,
    blockRect.width,
    blockRect.height,
  );
}

export function useBlockRect(blockRef: RefObject<HTMLElement | null>) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const root = blockRef.current;
    if (!root) return;

    const update = () => {
      const next = getBlockCanvasRect(root);
      if (!next) return;
      setRect((prev) => {
        if (
          prev &&
          prev.top === next.top &&
          prev.left === next.left &&
          prev.width === next.width &&
          prev.height === next.height
        ) {
          return prev;
        }
        return next;
      });
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(root);

    const mo = new MutationObserver(update);
    mo.observe(root, { childList: true, subtree: true, attributes: true });

    const offCanvas = subscribeCanvasUpdates(update);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      mo.disconnect();
      offCanvas();
      window.removeEventListener('resize', update);
    };
  }, [blockRef]);

  return rect;
}
