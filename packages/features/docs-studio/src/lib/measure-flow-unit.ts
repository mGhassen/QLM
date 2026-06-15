import type { FlowUnit } from "./flow-units";
import { getSectionChildWidthPx } from "./page-metrics";
import type { BlockNode } from "./types";

/** Child block only — section chrome is applied once per page group, not per unit. */
export function blocksForUnitMeasure(unit: FlowUnit): BlockNode[] {
  const block = unit.blocks[0];
  if (block.type === "section") {
    const child = block.children?.[0];
    return child ? [child] : [block];
  }
  return unit.blocks;
}

export function blocksForPartMeasure(unit: FlowUnit, partBlock: BlockNode): BlockNode[] {
  return [partBlock];
}

export function unitMeasureWidthPx(unit: FlowUnit, pageContentWidthPx: number): number {
  return unit.blocks[0].type === "section"
    ? getSectionChildWidthPx(pageContentWidthPx)
    : pageContentWidthPx;
}
