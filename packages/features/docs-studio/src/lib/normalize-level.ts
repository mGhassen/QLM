import { resolveBlockContent } from "./content";
import { generateId } from "./serialize";
import type { BlockNode } from "./types";
import { setLevelColumnCount, syncLevelsLayout } from "./levels-layout";

function splitLevelColumns(content: string): string[] {
  const cols = content.split("\n---\n").map((c) => c.trim());
  return cols.length > 0 ? cols : [""];
}

function normalizeLevelBlock(block: BlockNode, sections: Record<string, string>): BlockNode {
  const cols = block.children?.filter((c) => c.type === "lvlcol") ?? [];
  if (cols.length > 0) {
    return { ...block, children: cols };
  }

  const content = resolveBlockContent(block, sections);
  if (!content) {
    return {
      ...block,
      content: undefined,
      contentRef: undefined,
      children: [
        { id: generateId("lvlcol"), type: "lvlcol", content: "" },
        { id: generateId("lvlcol"), type: "lvlcol", content: "" },
      ],
    };
  }

  return {
    ...block,
    content: undefined,
    contentRef: undefined,
    children: splitLevelColumns(content).map((col) => ({
      id: generateId("lvlcol"),
      type: "lvlcol" as const,
      content: col,
    })),
  };
}

function normalizeLevelsBlock(block: BlockNode, sections: Record<string, string>): BlockNode {
  const children = block.children
    ? normalizeDocBlocks(block.children, sections)
    : undefined;
  return syncLevelsLayout({ ...block, children });
}

export function normalizeDocBlocks(
  blocks: BlockNode[],
  sections: Record<string, string>,
): BlockNode[] {
  return blocks.map((block) => {
    if (block.type === "levels") return normalizeLevelsBlock(block, sections);
    if (block.type === "level") return normalizeLevelBlock(block, sections);
    if (!block.children) return block;
    return { ...block, children: normalizeDocBlocks(block.children, sections) };
  });
}

export { levelsColumnCount, setLevelColumnCount, setLevelsColumnCount } from "./levels-layout";
