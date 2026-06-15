import type { BlockType } from "./types";

export type FlexDirection = "row" | "column";
export type FlexAlign = "start" | "center" | "end" | "stretch";
export type FlexJustify = "start" | "center" | "end" | "between" | "around";

export const CONTAINER_BLOCKS = new Set<BlockType>([
  "page",
  "cover",
  "coverBody",
  "section",
  "split",
  "main",
  "grid",
  "box",
  "levels",
  "level",
  "vm",
  "kpiband",
]);

const COVER_SECTION_CHILDREN: BlockType[] = [
  "brand",
  "coverBody",
  "grid",
  "paragraph",
  "subheading",
  "coverSubt",
  "card",
  "coverToc",
];

const STRUCTURAL_CHILDREN: Partial<Record<BlockType, BlockType[]>> = {
  page: ["section", "break"],
  split: ["main", "rail"],
  levels: ["level"],
  level: ["lvlcol"],
  vm: ["vmcol"],
  kpiband: ["kpi"],
  cover: ["brand", "coverBody", "grid", "paragraph", "subheading", "coverSubt", "card", "coverToc"],
  coverBody: [
    "paragraph",
    "subheading",
    "coverSubt",
    "grid",
    "card",
    "coverToc",
    "box",
    "flow",
  ],
};

export function canAcceptChildren(type: BlockType): boolean {
  return CONTAINER_BLOCKS.has(type);
}

export function canNestChild(parentType: BlockType, childType: BlockType): boolean {
  if (parentType === childType) return false;
  const allowed = STRUCTURAL_CHILDREN[parentType];
  if (allowed) return allowed.includes(childType);
  if (CONTAINER_BLOCKS.has(parentType)) return true;
  return false;
}

export function canNestChildIn(parent: import("./types").BlockNode, childType: BlockType): boolean {
  if (parent.type === "section" && parent.props?.variant === "cover") {
    return COVER_SECTION_CHILDREN.includes(childType);
  }
  return canNestChild(parent.type, childType);
}

export function isDescendant(blocks: import("./types").BlockNode[], ancestorId: string, id: string): boolean {
  const ancestor = findInTree(blocks, ancestorId);
  if (!ancestor?.children) return false;
  return containsId(ancestor.children, id);
}

function findInTree(
  nodes: import("./types").BlockNode[],
  id: string,
): import("./types").BlockNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function containsId(nodes: import("./types").BlockNode[], id: string): boolean {
  for (const node of nodes) {
    if (node.id === id) return true;
    if (node.children && containsId(node.children, id)) return true;
  }
  return false;
}

export const FLEX_ALIGN_MAP: Record<FlexAlign, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

export const FLEX_JUSTIFY_MAP: Record<FlexJustify, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
};
