import type { BlockNode } from "./types";

export const PLACEMENT_KEYS = [
  "gridColumn",
  "gridRow",
  "gridColumnSpan",
  "gridRowSpan",
  "translateX",
  "translateY",
] as const;

export type PlacementKey = (typeof PLACEMENT_KEYS)[number];

export function stripPlacementProps(
  props: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!props) return props;

  const hasPlacement = PLACEMENT_KEYS.some((key) => props[key] != null);
  if (!hasPlacement) return props;

  const rest = { ...props };
  for (const key of PLACEMENT_KEYS) {
    delete rest[key];
  }
  return Object.keys(rest).length > 0 ? rest : undefined;
}

export function adaptPlacementForGrid(
  props: Record<string, unknown> | undefined,
  cellIndex: number,
  cols: number,
  rows: number,
): Record<string, unknown> | undefined {
  const col = (cellIndex % cols) + 1;
  const row = Math.floor(cellIndex / cols) + 1;
  const base = stripPlacementProps(props) ?? {};
  return { ...base, gridColumn: col, gridRow: Math.min(row, rows) };
}

export function normalizeBlockAfterReparent(
  block: BlockNode,
  parentBlock?: BlockNode | null,
  cellIndex?: number,
): BlockNode {
  if (parentBlock?.type === "grid" && cellIndex != null) {
    const cols = (parentBlock.props?.cols as number) ?? 2;
    const rows = (parentBlock.props?.rows as number) ?? 1;
    return {
      ...block,
      props: adaptPlacementForGrid(block.props, cellIndex, cols, rows),
    };
  }

  const props = stripPlacementProps(block.props);
  if (props === block.props) return block;
  return { ...block, props };
}

export function normalizeBlockPlacementInTree(
  blocks: BlockNode[],
  blockId: string,
  parentBlock?: BlockNode | null,
  cellIndex?: number,
): BlockNode[] {
  return blocks.map((block) => {
    if (block.id === blockId) {
      return normalizeBlockAfterReparent(block, parentBlock, cellIndex);
    }
    if (block.children) {
      return {
        ...block,
        children: normalizeBlockPlacementInTree(block.children, blockId, parentBlock, cellIndex),
      };
    }
    return block;
  });
}
