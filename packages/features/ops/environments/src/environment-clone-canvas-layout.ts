import type { Service } from "./presentation/components/service-card";

/** Keep in sync with clone row flex gap (Tailwind `gap-8` = 2rem at default root). */
export const ENVIRONMENTS_CLONE_ROW_GAP_PX = 32;

/** Vertical gap between a clone card row and the next level (px). */
export const CLONE_FOREST_LEVEL_GAP_PX = 40;

export function environmentsCloneCardWidthPx(type: Service["type"]): number {
  if (
    type === "external_datasource" ||
    type === "postgres" ||
    type === "redis" ||
    type === "mongo" ||
    type === "mysql"
  ) {
    return 236;
  }
  return 200;
}

export function environmentsCloneRowContentWidthPx(
  cloneCount: number,
  cardWidthPx: number,
  gapPx = ENVIRONMENTS_CLONE_ROW_GAP_PX,
): number {
  if (cloneCount <= 0) return 0;
  return cloneCount * cardWidthPx + (cloneCount - 1) * gapPx;
}
