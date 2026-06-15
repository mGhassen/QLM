import type { BreakVariant } from "./breaks";
import { BREAK_LABELS } from "./breaks";
import type { BlockNode, BlockType } from "./types";

export interface PaletteItem {
  type: BlockType;
  label: string;
  overrides?: Partial<Pick<BlockNode, "content" | "props" | "children">>;
}

export interface PaletteCategory {
  id: string;
  label: string;
  items: PaletteItem[];
}

const TEXT_ITEMS: PaletteItem[] = [
  { type: "paragraph", label: "Paragraph" },
  { type: "subheading", label: "Heading" },
  {
    type: "paragraph",
    label: "Bullet list",
    overrides: { content: "- First item\n- Second item\n- Third item" },
  },
  {
    type: "paragraph",
    label: "Numbered list",
    overrides: { content: "1. First step\n2. Second step\n3. Third step" },
  },
  { type: "quote", label: "Quote" },
];

const DESIGN_ITEMS: PaletteItem[] = [
  { type: "hero", label: "Hero" },
  { type: "card", label: "Card" },
  { type: "alert", label: "Alert" },
  { type: "figure", label: "Figure" },
  { type: "table", label: "Table" },
  { type: "phase", label: "Agenda phase" },
  { type: "pat", label: "Numbered point" },
];

const STRUCTURE_ITEMS: PaletteItem[] = [
  { type: "cover", label: "Cover page" },
  { type: "flow", label: "Two-column text" },
];

const ADVANCED_STRUCTURE_ITEMS: PaletteItem[] = [
  { type: "section", label: "Section" },
  { type: "seclabel", label: "Section label" },
  { type: "opener", label: "Section title" },
];

const ADVANCED_BREAK_ITEMS: PaletteItem[] = (["page", "section", "continue"] as BreakVariant[]).map(
  (variant) => ({
    type: "break" as BlockType,
    label: BREAK_LABELS[variant],
    overrides: { props: { variant } },
  }),
);

/** Slash menu in the document body editor — design + structure inserts only. */
export const BODY_SLASH_CATEGORIES: PaletteCategory[] = [
  { id: "design", label: "Design", items: DESIGN_ITEMS },
  { id: "structure", label: "Structure", items: STRUCTURE_ITEMS },
  {
    id: "data",
    label: "Data",
    items: [
      { type: "kpi", label: "KPI" },
      { type: "kpiband", label: "KPI band" },
      { type: "levels", label: "Levels" },
      { type: "engines", label: "Engines" },
      { type: "vm", label: "Value matrix" },
    ],
  },
];

export const SLASH_INSERT_CATEGORIES: PaletteCategory[] = [
  { id: "text", label: "Text", items: TEXT_ITEMS },
  { id: "design", label: "Design", items: DESIGN_ITEMS },
  { id: "structure", label: "Structure", items: STRUCTURE_ITEMS },
];

/** Primary insert panel — design-focused; text lives in the body editor. */
export const PALETTE_CATEGORIES: PaletteCategory[] = [
  { id: "design", label: "Design", items: DESIGN_ITEMS },
  { id: "structure", label: "Structure", items: STRUCTURE_ITEMS },
  {
    id: "data",
    label: "Data",
    items: [
      { type: "kpi", label: "KPI" },
      { type: "kpiband", label: "KPI band" },
      { type: "levels", label: "Levels" },
      { type: "engines", label: "Engines" },
      { type: "vm", label: "Value matrix" },
    ],
  },
  { id: "advanced", label: "Advanced", items: [...ADVANCED_STRUCTURE_ITEMS, ...ADVANCED_BREAK_ITEMS] },
];

export const INLINE_INSERT_ITEMS: PaletteItem[] = SLASH_INSERT_CATEGORIES.flatMap((c) => c.items);

export const PAGE_END_INSERT_ITEMS: PaletteItem[] = [
  { type: "page", label: "New page" },
  { type: "section", label: "New section" },
  ...ADVANCED_BREAK_ITEMS,
  { type: "paragraph", label: "Paragraph" },
];

export const PAGE_GAP_INSERT_ITEMS: PaletteItem[] = [
  { type: "break", label: "Continue section", overrides: { props: { variant: "continue" } } },
  { type: "section", label: "New section" },
];

/** Legacy raw layout blocks — hidden from default UI, kept for advanced use */
export const RAW_LAYOUT_ITEMS: PaletteItem[] = [
  { type: "split", label: "Split" },
  { type: "grid", label: "Grid" },
  { type: "box", label: "Flex box" },
  { type: "main", label: "Main column" },
  { type: "rail", label: "Rail" },
];
