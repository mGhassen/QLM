import { generateId } from "./serialize";
import type { BlockNode } from "./types";

export const DEFAULT_LEVEL_TAB_WIDTH = 38;

export function levelsColumnCount(block: BlockNode): number {
  if (block.type !== "levels") return 0;
  const fromFlex = (block.props?.colFlex as number[] | undefined)?.length;
  if (fromFlex) return fromFlex;
  const rows = block.children?.filter((c) => c.type === "level") ?? [];
  if (rows.length === 0) return 2;
  return Math.max(...rows.map((r) => r.children?.filter((c) => c.type === "lvlcol").length ?? 0), 2);
}

export function levelGridTemplate(tabWidth: number, colFlex: number[]): string {
  return `${tabWidth}mm ${colFlex.map((f) => `${f}fr`).join(" ")}`;
}

export function setLevelColumnCount(block: BlockNode, count: number): BlockNode {
  if (block.type !== "level") return block;

  const clamped = Math.max(1, Math.min(4, count));
  const existing = block.children?.filter((c) => c.type === "lvlcol") ?? [];
  const nextChildren: BlockNode[] = [];
  for (let i = 0; i < clamped; i++) {
    nextChildren.push(
      existing[i] ?? { id: generateId("lvlcol"), type: "lvlcol", content: "" },
    );
  }

  return { ...block, children: nextChildren };
}

export function setLevelsColumnCount(block: BlockNode, count: number): BlockNode {
  if (block.type !== "levels") return block;

  const clamped = Math.max(1, Math.min(4, count));
  const colFlex = (block.props?.colFlex as number[] | undefined) ?? Array(clamped).fill(1);
  const nextFlex = colFlex.slice(0, clamped);
  while (nextFlex.length < clamped) nextFlex.push(1);

  const children = block.children?.map((child) =>
    child.type === "level" ? setLevelColumnCount(child, clamped) : child,
  );

  return {
    ...block,
    props: { ...block.props, colFlex: nextFlex },
    children,
  };
}

export function syncLevelsLayout(block: BlockNode): BlockNode {
  if (block.type !== "levels") return block;

  const rows = block.children?.filter((c) => c.type === "level") ?? [];
  const maxCols = Math.max(
    levelsColumnCount(block),
    ...rows.map((r) => r.children?.filter((c) => c.type === "lvlcol").length ?? 0),
    2,
  );

  const firstLevel = rows[0];
  const colFlex =
    (block.props?.colFlex as number[] | undefined) ??
    (firstLevel?.props?.colFlex as number[] | undefined) ??
    Array(maxCols).fill(1);
  const tabWidth =
    (block.props?.tabWidth as number) ??
    (firstLevel?.props?.tabWidth as number) ??
    DEFAULT_LEVEL_TAB_WIDTH;

  const nextFlex = colFlex.slice(0, maxCols);
  while (nextFlex.length < maxCols) nextFlex.push(1);

  const children = block.children?.map((child) => {
    if (child.type !== "level") return child;
    const synced = setLevelColumnCount(child, maxCols);
    if (!synced.props) return synced;
    const { colFlex: _cf, tabWidth: _tw, ...restProps } = synced.props;
    return { ...synced, props: Object.keys(restProps).length > 0 ? restProps : undefined };
  });

  return {
    ...block,
    props: { ...block.props, colFlex: nextFlex, tabWidth },
    children,
  };
}
