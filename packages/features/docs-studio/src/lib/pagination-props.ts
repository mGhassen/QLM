import type { BlockNode } from "./types";

/** Props that affect content flow / split / page assignment — not user canvas placement. */
const PAGINATION_PROP_KEYS = [
  "height",
  "minHeight",
  "width",
  "minWidth",
  "maxWidth",
  "pageSplit",
  "fontSize",
  "lineHeight",
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
] as const;

export function blockPaginationKey(block: BlockNode): string {
  const props = block.props ?? {};
  const parts = PAGINATION_PROP_KEYS.map((key) => {
    const value = props[key];
    return value == null ? "" : String(value);
  });
  parts.push(block.content ?? "", block.contentRef ?? "");
  return parts.join("\0");
}

export function itemsNeedRepack(
  prev: { block: BlockNode }[],
  next: { block: BlockNode }[],
): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < next.length; i++) {
    if (prev[i]?.block.id !== next[i]?.block.id) return true;
    if (blockPaginationKey(prev[i].block) !== blockPaginationKey(next[i].block)) return true;
  }
  return false;
}
