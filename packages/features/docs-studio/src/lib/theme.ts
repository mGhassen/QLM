import type { CSSProperties } from "react";
import type { DocTheme } from "./types";

export function themeToStyle(theme: DocTheme): CSSProperties {
  const style: Record<string, string> = {};
  if (theme.brand) style["--doc-brand"] = theme.brand;
  if (theme.ink) style["--doc-ink"] = theme.ink;
  if (theme.surface) style["--doc-surface"] = theme.surface;
  if (theme.bg) style["--doc-bg"] = theme.bg;
  if (theme.eyebrow) style["--doc-eyebrow"] = theme.eyebrow;
  return style as CSSProperties;
}
