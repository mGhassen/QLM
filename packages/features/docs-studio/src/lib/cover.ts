import { ensureCoverPageFirst } from "./migrate-page-model";
import { isCoverPageBlock } from "./section-variant";
import type { BlockNode } from "./types";

export function findRootCoverIndex(blocks: BlockNode[]): number {
  const pageIdx = blocks.findIndex((b) => b.type === "page" && isCoverPageBlock(b));
  if (pageIdx !== -1) return pageIdx;
  return blocks.findIndex((b) => b.type === "cover");
}

export function isRootCoverBlock(blocks: BlockNode[], id: string): boolean {
  const idx = findRootCoverIndex(blocks);
  if (idx === -1) return false;
  const block = blocks[idx];
  if (block.id === id) return true;
  if (block.type === "page") {
    return (block.children ?? []).some((child) => child.id === id);
  }
  return false;
}

export function ensureCoverFirst(blocks: BlockNode[]): BlockNode[] {
  if (blocks.some((b) => b.type === "page")) {
    return ensureCoverPageFirst(blocks);
  }
  const coverIdx = blocks.findIndex((b) => b.type === "cover");
  if (coverIdx <= 0) return blocks;
  const result = [...blocks];
  const [cover] = result.splice(coverIdx, 1);
  result.unshift(cover);
  return result;
}

export function canMoveRootBlock(
  blocks: BlockNode[],
  id: string,
  direction: "up" | "down",
): boolean {
  const idx = blocks.findIndex((b) => b.id === id);
  if (idx === -1) return true;

  const block = blocks[idx];
  const isCoverRoot =
    block.type === "cover" || (block.type === "page" && isCoverPageBlock(block));

  if (isCoverRoot) {
    if (direction === "up" && idx === 0) return false;
    if (direction === "down" && idx === 0) return false;
  }

  if (direction === "up" && idx > 0) {
    const prev = blocks[idx - 1];
    if (prev.type === "cover" || (prev.type === "page" && isCoverPageBlock(prev))) {
      return false;
    }
  }

  return true;
}
