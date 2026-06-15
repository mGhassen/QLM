import type { BlockNode } from "./types";
import { canBlockResize, layoutSize } from "./studio-transform";

export type AlignDimension = "width" | "height" | "both";

export function canAlignBlock(type: BlockNode["type"]): boolean {
  return canBlockResize(type);
}

export function getMeasuredBlockSize(
  blockId: string,
  block: BlockNode,
): { width: number; height: number } {
  const el =
    typeof document !== "undefined"
      ? document.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`)
      : null;
  const props = block.props ?? {};
  return {
    width: layoutSize(props.width, el?.offsetWidth ?? 100),
    height: layoutSize(props.height ?? props.minHeight, el?.offsetHeight ?? 40),
  };
}

export function buildAlignProps(
  dimension: AlignDimension,
  target: { width: number; height: number },
  existing: Record<string, unknown>,
): Record<string, unknown> {
  const props = { ...existing };
  if (dimension === "width" || dimension === "both") {
    props.width = `${Math.round(target.width)}px`;
  }
  if (dimension === "height" || dimension === "both") {
    const h = Math.round(target.height);
    props.height = `${h}px`;
    props.minHeight = `${h}px`;
  }
  return props;
}
