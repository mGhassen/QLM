import type { BreakVariant } from "./breaks";
import type { BlockNode } from "./types";

export function isPageBreakBlock(block: BlockNode): boolean {
  if (block.type === "break") {
    const variant = (block.props?.variant as BreakVariant) ?? "page";
    return variant === "page" || variant === "section";
  }
  return block.type === "section" && !!block.props?.pageBreak;
}

export function splitBlocksIntoPages(blocks: BlockNode[]): BlockNode[][] {
  const pages: BlockNode[][] = [];
  let current: BlockNode[] = [];

  for (const block of blocks) {
    if (block.type === "cover") {
      if (current.length > 0) pages.push(current);
      pages.push([block]);
      current = [];
      continue;
    }

    if (block.type === "page") {
      if (current.length > 0) pages.push(current);
      current = [block];
      pages.push(current);
      current = [];
      continue;
    }

    if (block.type === "section" && !blocks.some((b) => b.type === "page")) {
      if (current.length > 0) pages.push(current);
      current = [block];
      continue;
    }

    if (block.type === "break") {
      const variant = (block.props?.variant as BreakVariant) ?? "page";
      if (current.length > 0 && variant !== "continue") {
        pages.push(current);
        current = [];
      }
      current.push(block);
      continue;
    }

    if (isPageBreakBlock(block) && current.length > 0) {
      pages.push(current);
      current = [];
    }

    current.push(block);
  }

  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}
