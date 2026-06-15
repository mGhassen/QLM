import { resolveBlockContent } from "./content";
import { splitSplittableParts } from "./content-segments";
import type { BlockNode, BlockType } from "./types";

const DEFAULT_SPLITTABLE_TYPES = new Set<BlockType>([
  "flow",
  "paragraph",
  "main",
  "engines",
  "quote",
  "pull",
  "cquote",
  "subheading",
  "raw",
]);

export function hasBlockText(block: BlockNode): boolean {
  return !!(block.content?.trim() || block.contentRef);
}

/** Whether a block may flow across page boundaries (override with props.pageSplit). */
export function isSplittableBlockType(type: BlockType): boolean {
  return DEFAULT_SPLITTABLE_TYPES.has(type);
}

export function getSplittableChild(unitBlock: BlockNode): BlockNode | null {
  if (unitBlock.type === "section") {
    return unitBlock.children?.[0] ?? null;
  }
  if (isSplittableBlockType(unitBlock.type)) {
    return unitBlock;
  }
  return null;
}

export function canBlockSplit(block: BlockNode): boolean {
  const mode = block.props?.pageSplit;
  if (mode === false) return false;
  if (mode === true) return hasBlockText(block);
  if (!DEFAULT_SPLITTABLE_TYPES.has(block.type)) return false;
  return hasBlockText(block);
}

export function blockSplittablePartCount(
  block: BlockNode,
  sections: Record<string, string>,
): number {
  return splitSplittableParts(resolveBlockContent(block, sections)).length;
}

export function splitBlockContentAtPartCount(
  content: string,
  partCount: number,
): [string, string] {
  const parts = splitSplittableParts(content);
  const clamped = Math.max(1, Math.min(partCount, parts.length - 1));
  const joiner = content.includes("\n\n") ? "\n\n" : content.includes("\n") ? "\n" : " ";
  return [parts.slice(0, clamped).join(joiner), parts.slice(clamped).join(joiner)];
}
