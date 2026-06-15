import { createBlock } from "./serialize";
import type { BlockNode } from "./types";

export interface LayoutPreset {
  id: string;
  label: string;
  description: string;
  /** CSS class for thumbnail preview */
  thumbnailClass: string;
  create: () => BlockNode;
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "text-sidebar",
    label: "Text + sidebar",
    description: "Main content with a side rail",
    thumbnailClass: "preset-thumb-split",
    create: () => createBlock("split"),
  },
  {
    id: "two-columns",
    label: "2 columns",
    description: "Equal two-column grid",
    thumbnailClass: "preset-thumb-2col",
    create: () => createBlock("grid", { props: { cols: 2 } }),
  },
  {
    id: "three-cards",
    label: "3 cards",
    description: "Three card columns",
    thumbnailClass: "preset-thumb-3col",
    create: () =>
      createBlock("grid", {
        props: { cols: 3 },
        children: [
          { id: "", type: "card", props: { variant: "t-yellow" }, content: "### Card 1\nContent." },
          { id: "", type: "card", props: { variant: "t-yellow" }, content: "### Card 2\nContent." },
          { id: "", type: "card", props: { variant: "t-yellow" }, content: "### Card 3\nContent." },
        ],
      }),
  },
  {
    id: "stack",
    label: "Stack",
    description: "Vertical stack of blocks",
    thumbnailClass: "preset-thumb-stack",
    create: () => createBlock("box", { props: { direction: "column", gap: 4 } }),
  },
  {
    id: "two-column-flow",
    label: "2-column text",
    description: "Newspaper-style text columns",
    thumbnailClass: "preset-thumb-flow",
    create: () => createBlock("flow"),
  },
  {
    id: "hero",
    label: "Hero",
    description: "Full-width highlight block",
    thumbnailClass: "preset-thumb-hero",
    create: () => createBlock("hero"),
  },
  {
    id: "cover",
    label: "Cover page",
    description: "Document cover with TOC",
    thumbnailClass: "preset-thumb-cover",
    create: () => createBlock("cover"),
  },
  {
    id: "section",
    label: "Section",
    description: "New page section",
    thumbnailClass: "preset-thumb-section",
    create: () => createBlock("section"),
  },
  {
    id: "kpi-band",
    label: "KPI band",
    description: "Row of KPI metrics",
    thumbnailClass: "preset-thumb-kpi",
    create: () => createBlock("kpiband"),
  },
  {
    id: "levels",
    label: "Levels",
    description: "Tiered level comparison",
    thumbnailClass: "preset-thumb-levels",
    create: () => createBlock("levels"),
  },
];

export function getLayoutPreset(id: string): LayoutPreset | undefined {
  return LAYOUT_PRESETS.find((p) => p.id === id);
}

export function detectLayoutPreset(block: BlockNode): string | null {
  if (block.type === "split") return "text-sidebar";
  if (block.type === "flow") return "two-column-flow";
  if (block.type === "hero") return "hero";
  if (block.type === "cover") return "cover";
  if (block.type === "section") return "section";
  if (block.type === "box") return "stack";
  if (block.type === "kpiband") return "kpi-band";
  if (block.type === "levels") return "levels";
  if (block.type === "grid") {
    const cols = (block.props?.cols as number) ?? 2;
    const childCount = block.children?.length ?? 0;
    if (cols === 3 || childCount >= 3) return "three-cards";
    return "two-columns";
  }
  return null;
}

/** Collect leaf content blocks from a container tree */
function collectContentBlocks(nodes: BlockNode[]): BlockNode[] {
  const result: BlockNode[] = [];
  for (const node of nodes) {
    if (node.children?.length) {
      result.push(...collectContentBlocks(node.children));
    } else if (node.content != null || node.contentRef != null) {
      result.push(node);
    }
  }
  return result;
}

/** Replace container structure while preserving child content where possible */
export function migrateContainerToPreset(
  block: BlockNode,
  presetId: string,
): BlockNode {
  const preset = getLayoutPreset(presetId);
  if (!preset) return block;

  const contentBlocks = collectContentBlocks(block.children ?? []);
  const fresh = preset.create();

  if (fresh.type === "split" && fresh.children) {
    const main = fresh.children.find((c) => c.type === "main");
    const rail = fresh.children.find((c) => c.type === "rail");
    if (main && contentBlocks[0]) {
      main.content = contentBlocks[0].content;
      main.contentRef = contentBlocks[0].contentRef;
    }
    if (rail && contentBlocks[1]) {
      rail.content = contentBlocks[1].content;
      rail.contentRef = contentBlocks[1].contentRef;
    } else if (rail && contentBlocks[0] && !main) {
      rail.content = contentBlocks[0].content;
    }
    return { ...fresh, id: block.id, props: { ...fresh.props, ...block.props } };
  }

  if (fresh.type === "grid" && fresh.children) {
    const cells = fresh.children;
    for (let i = 0; i < cells.length; i++) {
      const src = contentBlocks[i];
      if (src) {
        cells[i] = { ...cells[i], content: src.content, contentRef: src.contentRef };
      }
    }
    return { ...fresh, id: block.id, props: { ...fresh.props, ...block.props } };
  }

  if (fresh.type === "box" && contentBlocks.length) {
    return {
      ...fresh,
      id: block.id,
      props: { ...fresh.props, ...block.props },
      children: contentBlocks.map((c) => ({ ...c, id: c.id })),
    };
  }

  return { ...fresh, id: block.id };
}
