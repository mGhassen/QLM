import type { PointerEvent as ReactPointerEvent } from "react";

export function trackPointerDrag(
  e: ReactPointerEvent,
  handlers: {
    onMove: (ev: PointerEvent) => void;
    onEnd: () => void;
    cursor?: string;
  },
) {
  e.preventDefault();
  e.stopPropagation();

  let raf = 0;
  let latest: PointerEvent | null = null;

  const flush = () => {
    raf = 0;
    if (latest) handlers.onMove(latest);
  };

  const onMove = (ev: PointerEvent) => {
    latest = ev;
    if (!raf) raf = requestAnimationFrame(flush);
  };

  const end = () => {
    if (raf) cancelAnimationFrame(raf);
    if (latest) handlers.onMove(latest);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    handlers.onEnd();
  };

  document.body.style.userSelect = "none";
  if (handlers.cursor) document.body.style.cursor = handlers.cursor;
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
}
