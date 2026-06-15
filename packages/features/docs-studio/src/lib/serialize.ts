import { canNestChild, isDescendant } from "./block-schema";
import { ensureCoverFirst } from "./cover";
import { isCoverPageBlock } from "./section-variant";
import type { BlockNode, DocDocument } from "./types";

export function collectContentRefs(blocks: BlockNode[]): string[] {
  const refs: string[] = [];
  function walk(nodes: BlockNode[]) {
    for (const node of nodes) {
      if (node.contentRef) refs.push(node.contentRef);
      if (node.children) walk(node.children);
    }
  }
  walk(blocks);
  return refs;
}

export function findBlockById(blocks: BlockNode[], id: string): BlockNode | null {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.children) {
      const found = findBlockById(block.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function updateBlockInTree(
  blocks: BlockNode[],
  id: string,
  updater: (block: BlockNode) => BlockNode,
): BlockNode[] {
  return blocks.map((block) => {
    if (block.id === id) return updater(block);
    if (block.children) {
      return { ...block, children: updateBlockInTree(block.children, id, updater) };
    }
    return block;
  });
}

export function removeBlockFromTree(blocks: BlockNode[], id: string): BlockNode[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) => ({
      ...b,
      children: b.children ? removeBlockFromTree(b.children, id) : undefined,
    }));
}

export function reorderBlocks(blocks: BlockNode[], activeId: string, overId: string): BlockNode[] {
  const oldIndex = blocks.findIndex((b) => b.id === activeId);
  const newIndex = blocks.findIndex((b) => b.id === overId);
  if (oldIndex === -1 || newIndex === -1) return blocks;

  const result = [...blocks];
  const [removed] = result.splice(oldIndex, 1);
  result.splice(newIndex, 0, removed);
  return ensureCoverFirst(result);
}

export function moveBlockToParent(
  document: DocDocument,
  blockId: string,
  targetParentId: string,
  index?: number,
): DocDocument {
  if (blockId === targetParentId) return document;
  if (isDescendant(document.blocks, blockId, targetParentId)) return document;

  const target = findBlockById(document.blocks, targetParentId);
  const source = findBlockById(document.blocks, blockId);
  if (!target || !source || source.type === "cover" || !canNestChild(target.type, source.type)) {
    return document;
  }

  let movedBlock: BlockNode | null = null;

  function extract(nodes: BlockNode[]): BlockNode[] {
    return nodes.filter((b) => {
      if (b.id === blockId) {
        movedBlock = b;
        return false;
      }
      if (b.children) b.children = extract(b.children);
      return true;
    });
  }

  const blocks = extract(structuredClone(document.blocks));
  if (!movedBlock) return document;

  function insert(nodes: BlockNode[]): BlockNode[] {
    return nodes.map((b) => {
      if (b.id === targetParentId) {
        const children = [...(b.children ?? [])];
        const idx = index ?? children.length;
        children.splice(idx, 0, movedBlock!);
        return { ...b, children };
      }
      if (b.children) return { ...b, children: insert(b.children) };
      return b;
    });
  }

  return { ...document, blocks: insert(blocks) };
}

export function flattenBlocks(blocks: BlockNode[], depth = 0): { block: BlockNode; depth: number }[] {
  const result: { block: BlockNode; depth: number }[] = [];
  for (const block of blocks) {
    result.push({ block, depth });
    if (block.children) result.push(...flattenBlocks(block.children, depth + 1));
  }
  return result;
}

export function generateId(prefix = "block"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function duplicateBlock(blocks: BlockNode[], id: string): BlockNode[] {
  function cloneBlock(b: BlockNode): BlockNode {
    return {
      ...structuredClone(b),
      id: generateId(b.type),
      children: b.children?.map(cloneBlock),
    };
  }

  function insertAfter(nodes: BlockNode[]): BlockNode[] {
    const result: BlockNode[] = [];
    for (const node of nodes) {
      result.push(
        node.children
          ? { ...node, children: insertAfter(node.children) }
          : node,
      );
      if (node.id === id) {
        result.push(cloneBlock(node));
      }
    }
    return result;
  }

  return insertAfter(blocks);
}

function idForInsertedBlock(block: BlockNode): string {
  return block.id || generateId(block.type);
}

export function insertBlockRelative(
  blocks: BlockNode[],
  targetId: string,
  newBlock: BlockNode,
  position: "before" | "after" | "inside",
  insideIndex?: number,
): BlockNode[] {
  if (position === "inside") {
    return updateBlockInTree(blocks, targetId, (b) => {
      const children = [...(b.children ?? [])];
      const block = { ...newBlock, id: idForInsertedBlock(newBlock) };
      const idx = insideIndex ?? children.length;
      children.splice(idx, 0, block);
      return { ...b, children };
    });
  }

  function insertInList(nodes: BlockNode[]): BlockNode[] {
    const result: BlockNode[] = [];
    for (const node of nodes) {
      if (position === "before" && node.id === targetId) {
        result.push({ ...newBlock, id: idForInsertedBlock(newBlock) });
      }
      result.push(
        node.children ? { ...node, children: insertInList(node.children) } : node,
      );
      if (position === "after" && node.id === targetId) {
        result.push({ ...newBlock, id: idForInsertedBlock(newBlock) });
      }
    }
    return result;
  }

  return ensureCoverFirst(insertInList(blocks));
}

export function moveBlockInTree(
  blocks: BlockNode[],
  id: string,
  direction: "up" | "down",
): BlockNode[] {
  function moveInList(nodes: BlockNode[], atRoot: boolean): BlockNode[] {
    const idx = nodes.findIndex((b) => b.id === id);
    if (idx !== -1) {
      const block = nodes[idx];
      if (atRoot && (block.type === "cover" || (block.type === "page" && isCoverPageBlock(block)))) {
        return nodes;
      }
      if (
        atRoot &&
        direction === "up" &&
        idx > 0 &&
        (nodes[idx - 1].type === "cover" ||
          (nodes[idx - 1].type === "page" && isCoverPageBlock(nodes[idx - 1])))
      ) {
        return nodes;
      }

      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= nodes.length) return nodes;
      const result = [...nodes];
      [result[idx], result[newIdx]] = [result[newIdx], result[idx]];
      return atRoot ? ensureCoverFirst(result) : result;
    }
    return nodes.map((b) =>
      b.children ? { ...b, children: moveInList(b.children, false) } : b,
    );
  }
  return moveInList(blocks, true);
}

export const BLOCK_DEFAULTS: Record<string, Partial<BlockNode>> = {
  page: {
    type: "page",
    children: [
      {
        id: "",
        type: "section",
        props: { id: "section-1" },
        children: [{ id: "", type: "paragraph", content: "" }],
      },
    ],
  },
  cover: {
    type: "cover",
    props: { id: "cover", pageBreak: true },
    children: [
      { id: "", type: "brand", content: "QLM STRATEGIC RESEARCH" },
      {
        id: "",
        type: "coverBody",
        children: [
          { id: "", type: "paragraph", props: { className: "kicker" }, content: "Document subtitle" },
          { id: "", type: "subheading", props: { level: 1 }, content: "Document title" },
          {
            id: "",
            type: "coverSubt",
            content: "subtitleUp: Top line\nsubtitleOr: or\nsubtitleDown: Bottom line",
          },
          { id: "", type: "paragraph", props: { className: "cover-desc" }, content: "Short description of the document." },
          {
            id: "",
            type: "grid",
            props: { cols: 2 },
            children: [
              {
                id: "",
                type: "card",
                props: { variant: "t-ink", title: "À propos de ce rapport" },
                content: "Brief summary of what this document covers.",
              },
              {
                id: "",
                type: "coverToc",
                props: { title: "Au sommaire" },
                content: "**01** First section → #s1\n**02** Second section → #s2\n**03** Third section → #s3",
              },
            ],
          },
          { id: "", type: "paragraph", content: "**Your organization**" },
          { id: "", type: "paragraph", props: { className: "cover-foot-right" }, content: "2026" },
        ],
      },
    ],
  },
  brand: { type: "brand", content: "QLM STRATEGIC RESEARCH" },
  coverBody: { type: "coverBody" },
  section: { type: "section", props: { id: "section-1", pageBreak: true } },
  seclabel: { type: "seclabel", content: "Section 01" },
  opener: {
    type: "opener",
    props: { number: "1" },
    content: "Section title",
  },
  paragraph: { type: "paragraph", content: "New paragraph text." },
  subheading: { type: "subheading", props: { level: 2 }, content: "New heading" },
  quote: { type: "quote", content: "Quote text here." },
  figure: { type: "figure", content: "src: /docs/placeholder.png\ncaption: Caption" },
  card: { type: "card", props: { variant: "t-yellow" }, content: "### New card\nCard content here." },
  alert: { type: "alert", props: { variant: "insight", tag: "Note" }, content: "Alert content here." },
  hero: {
    type: "hero",
    props: { tag: "Highlight" },
    content: "## Highlight\n# Hero statement here.",
  },
  coverSubt: { type: "coverSubt", content: "subtitleUp: Line one\nsubtitleOr: ou\nsubtitleDown: Line two" },
  coverToc: {
    type: "coverToc",
    props: { title: "Au sommaire" },
    content: "**01** First section → #s1\n**02** Second section → #s2",
  },
  flow: { type: "flow", content: "Paragraph text here." },
  main: { type: "main", content: "Main column content." },
  rail: {
    type: "rail",
    props: { variant: "note" },
    content: "## Rail heading\nSide column content.",
  },
  table: {
    type: "table",
    props: { title: "Table title" },
    content: "Column A | Column B | Column C\nRow 1 | Value | Value\nRow 2 | Value | Value",
  },
  phase: {
    type: "phase",
    props: { title: "Phase title" },
    content: "Phase title\n- First action item\n- Second action item\n- Third action item",
  },
  pat: {
    type: "pat",
    props: { number: "1" },
    content: "**Point title.** Description of this numbered point.",
  },
  kpi: { type: "kpi", props: { value: "100%", label: "KPI label" } },
  kpiband: {
    type: "kpiband",
    children: [
      { id: "", type: "kpi", props: { value: "440%", label: "ROI sur 3 ans" } },
      { id: "", type: "kpi", props: { value: "4 mois", label: "seuil de rentabilité" } },
    ],
  },
  levels: {
    type: "levels",
    props: {
      headers: ["Column A", "Column B"],
      highlightLastHeader: true,
      colFlex: [1, 1],
      tabWidth: 38,
    },
    children: [
      {
        id: "",
        type: "level",
        props: { level: 1, name: "Level 1", highlightCol: true },
        children: [
          { id: "", type: "lvlcol", content: "Left column content." },
          { id: "", type: "lvlcol", content: "Right column content." },
        ],
      },
      {
        id: "",
        type: "level",
        props: { level: 2, name: "Level 2", highlightCol: true },
        children: [
          { id: "", type: "lvlcol", content: "Left column content." },
          { id: "", type: "lvlcol", content: "Right column content." },
        ],
      },
    ],
  },
  level: {
    type: "level",
    props: { level: 1, name: "Level", highlightCol: true },
    children: [
      { id: "", type: "lvlcol", content: "Column A" },
      { id: "", type: "lvlcol", content: "Column B" },
    ],
  },
  lvlcol: { type: "lvlcol", content: "Column content." },
  lcard: { type: "lcard", props: { tier: 1 }, content: "### Card title\nCard body content." },
  engines: { type: "engines", content: "- Engine one\n- Engine two\n- Engine three" },
  vm: {
    type: "vm",
    children: [
      { id: "", type: "vmcol", content: "### Column 1\nContent." },
      { id: "", type: "vmcol", content: "### Column 2\nContent." },
    ],
  },
  vmcol: { type: "vmcol", content: "Column content." },
  split: {
    type: "split",
    props: { reverse: false, mainFlex: 1.75, railFlex: 1 },
    children: [
      { id: "", type: "main", content: "Main column content." },
      { id: "", type: "rail", props: { variant: "note" }, content: "## Rail heading\nSide column content." },
    ],
  },
  grid: {
    type: "grid",
    props: { cols: 2 },
    children: [
      { id: "", type: "card", props: { variant: "t-yellow" }, content: "### Card 1\nContent." },
      { id: "", type: "card", props: { variant: "t-yellow" }, content: "### Card 2\nContent." },
    ],
  },
  box: {
    type: "box",
    props: { direction: "column", align: "stretch", justify: "start", gap: 4 },
    children: [
      { id: "", type: "paragraph", content: "First item in the flex box." },
      { id: "", type: "paragraph", content: "Second item in the flex box." },
    ],
  },
  break: { type: "break", props: { variant: "page" } },
};

export function splitOpenerBlocks(
  blocks: BlockNode[],
  sections: Record<string, string>,
): { blocks: BlockNode[]; sections: Record<string, string> } {
  const newSections = { ...sections };

  function parseOpenerContent(content: string, props?: Record<string, unknown>) {
    const label =
      (props?.label as string) ??
      content.split("\n").find((l) => l.startsWith("label: "))?.replace("label: ", "") ??
      "";
    const title =
      (props?.title as string) ??
      content.split("\n").find((l) => l.startsWith("title: "))?.replace("title: ", "") ??
      content.trim();
    return { label, title };
  }

  function walk(nodes: BlockNode[]): BlockNode[] {
    return nodes.flatMap((block) => {
      const children = block.children ? walk(block.children) : undefined;

      if (block.type !== "opener") {
        return children ? [{ ...block, children }] : [block];
      }

      const contentRef = block.contentRef ?? `sections/${block.id}.md`;
      const content = newSections[contentRef] ?? block.content ?? "";
      const { label, title } = parseOpenerContent(content, block.props);

      newSections[contentRef] = `${title}\n`;

      const result: BlockNode[] = [];
      if (label) {
        const seclabelId = block.id.replace(/^opener/, "seclabel");
        const seclabelRef = `sections/${seclabelId}.md`;
        newSections[seclabelRef] = `${label}\n`;
        result.push({ id: seclabelId, type: "seclabel", contentRef: seclabelRef });
      }

      const { label: _l, title: _t, ...restProps } = block.props ?? {};
      result.push({
        ...block,
        props: { ...restProps, number: block.props?.number },
        contentRef,
        children,
      });
      return result;
    });
  }

  return { blocks: walk(blocks), sections: newSections };
}

export function createBlock(
  type: string,
  overrides?: Partial<Pick<BlockNode, "content" | "props" | "children">>,
): BlockNode {
  const defaults = BLOCK_DEFAULTS[type];
  const id = generateId(type);
  const block: BlockNode = {
    id,
    type: type as BlockNode["type"],
    props: { ...(defaults?.props ?? {}), ...(overrides?.props ?? {}) },
    content: overrides?.content ?? defaults?.content,
  };
  const children = overrides?.children ?? defaults?.children;
  if (children) {
    block.children = children.map((c) => ({
      ...c,
      id: generateId(c.type),
      children: c.children?.map((cc) => ({ ...cc, id: generateId(cc.type) })),
    }));
  }
  return block;
}
