import type { BlockNode } from "./types";

export const TEXT_NODE_PREFIX = "text:";

const TEXT_BLOCK_TYPES = new Set([
  "paragraph",
  "quote",
  "opener",
  "pat",
  "seclabel",
  "subheading",
  "flow",
  "engines",
  "main",
  "hero",
  "card",
  "alert",
  "rail",
  "figure",
  "phase",
  "lvlcol",
  "lcard",
  "kpi",
  "vmcol",
  "brand",
  "coverSubt",
  "coverToc",
  "table",
]);

export function toTextNodeId(blockId: string) {
  return `${TEXT_NODE_PREFIX}${blockId}`;
}

export function parseTreeSelection(id: string): { blockId: string; mode: "block" | "text" } {
  if (id.startsWith(TEXT_NODE_PREFIX)) {
    return { blockId: id.slice(TEXT_NODE_PREFIX.length), mode: "text" };
  }
  return { blockId: id, mode: "block" };
}

export function blockHasEditableText(block: BlockNode): boolean {
  if (block.contentRef !== undefined || block.content !== undefined) return true;
  return TEXT_BLOCK_TYPES.has(block.type);
}
