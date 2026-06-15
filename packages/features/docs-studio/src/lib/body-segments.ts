import { breakVariantToSectionProps, type BreakVariant } from "./breaks";
import { parseMarkdoc, type MarkdocNode } from "./markdoc";
import type { LayoutItem, SectionContext } from "./layout-items";
import { blocksToLayoutItems } from "./layout-items";
import { isCoverPageBlock } from "./section-variant";
import type { BlockNode, BlockType, DocDocument } from "./types";
import { isFlowDoc } from "./flow-doc";

export interface BodySegment {
  key: string;
  kind: "prose" | "design" | "break";
  block: BlockNode;
  markdown: string;
}

const DESIGN_TAGS = new Set([
  "card",
  "hero",
  "alert",
  "figure",
  "table",
  "quote",
  "phase",
  "pat",
  "kpi",
  "kpiband",
  "levels",
  "engines",
  "vm",
  "flow",
]);

const BLOCK_TAG_RE = /\{%\s*(\/?)(\w+)([^%]*?)%\}/g;

function parseBlockTags(md: string): MarkdocNode[] {
  const parts: MarkdocNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(BLOCK_TAG_RE.source, "g");

  while ((match = re.exec(md)) !== null) {
    if (match.index > lastIndex) {
      const text = md.slice(lastIndex, match.index);
      if (text.trim()) parts.push(...parseMarkdoc(text));
    }

    const closing = match[1] === "/";
    const tag = match[2];

    if (!closing && DESIGN_TAGS.has(tag)) {
      const attrs = parseTagAttrs(match[3]);
      const closeRe = new RegExp(`\\{%\\s*/${tag}\\s*%\}`, "g");
      closeRe.lastIndex = re.lastIndex;
      const closeMatch = closeRe.exec(md);
      const inner = closeMatch ? md.slice(re.lastIndex, closeMatch.index).trim() : "";
      parts.push({ type: "tag", tag, attrs, content: inner });
      lastIndex = closeMatch ? closeRe.lastIndex : re.lastIndex;
      re.lastIndex = lastIndex;
      continue;
    }

    if (!closing) {
      parts.push({ type: "tag", tag, attrs: parseTagAttrs(match[3]) });
    }
    lastIndex = re.lastIndex;
  }

  if (lastIndex < md.length) {
    const text = md.slice(lastIndex);
    if (text.trim()) parts.push(...parseMarkdoc(text));
  }

  if (parts.length === 0 && md.trim()) return parseMarkdoc(md);
  return parts;
}

function parseTagAttrs(str: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)=["']([^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function nodeToMarkdown(node: MarkdocNode): string {
  switch (node.type) {
    case "heading": {
      const prefix = "#".repeat(node.level ?? 2);
      return `${prefix} ${node.content ?? ""}`;
    }
    case "paragraph":
      return node.content ?? "";
    case "list": {
      const items = node.children ?? [];
      return items
        .map((item, i) =>
          node.ordered ? `${i + 1}. ${item.content ?? ""}` : `- ${item.content ?? ""}`,
        )
        .join("\n");
    }
    default:
      return node.content ?? "";
  }
}

function proseBlockType(node: MarkdocNode): BlockType {
  if (node.type === "heading") {
    const level = node.level ?? 2;
    return "subheading";
  }
  if (node.type === "list") return "paragraph";
  return "paragraph";
}

function proseBlockProps(node: MarkdocNode): Record<string, unknown> | undefined {
  if (node.type === "heading") {
    return { level: node.level ?? 2 };
  }
  return undefined;
}

function designBlockFromTag(node: MarkdocNode, index: number): BlockNode {
  const tag = node.tag ?? "card";
  const content = node.content ?? "";
  const props: Record<string, unknown> = { ...(node.attrs ?? {}) };

  if (tag === "subheading" && props.level) {
    return {
      id: `body-seg-${index}`,
      type: "subheading",
      props,
      content,
    };
  }

  return {
    id: `body-seg-${index}`,
    type: tag as BlockType,
    props: Object.keys(props).length ? props : undefined,
    content,
  };
}

let segmentCounter = 0;

function nextSegmentId(prefix: string): string {
  segmentCounter += 1;
  return `${prefix}-${segmentCounter}`;
}

export function parseBodyToSegments(body: string): BodySegment[] {
  segmentCounter = 0;
  const trimmed = body.trim();
  if (!trimmed) {
    const id = nextSegmentId("body-empty");
    return [
      {
        key: id,
        kind: "prose",
        block: { id, type: "paragraph", content: "" },
        markdown: "",
      },
    ];
  }

  const nodes = parseBlockTags(body);
  const segments: BodySegment[] = [];

  for (const node of nodes) {
    if (node.type === "tag") {
      const tag = node.tag ?? "";
      if (tag === "break") {
        const id = nextSegmentId("body-break");
        segments.push({
          key: id,
          kind: "break",
          block: {
            id,
            type: "break",
            props: { variant: node.attrs?.variant ?? "page" },
          },
          markdown: "",
        });
        continue;
      }
      if (DESIGN_TAGS.has(tag)) {
        const id = nextSegmentId("body-design");
        const block = designBlockFromTag(node, segments.length);
        block.id = id;
        segments.push({
          key: id,
          kind: "design",
          block,
          markdown: node.content ?? "",
        });
        continue;
      }
    }

    const md = nodeToMarkdown(node);
    const id = nextSegmentId("body-prose");
    segments.push({
      key: id,
      kind: "prose",
      block: {
        id,
        type: proseBlockType(node),
        props: proseBlockProps(node),
        content: md,
      },
      markdown: md,
    });
  }

  return segments;
}

function isSectionTitleSegment(seg: BodySegment): boolean {
  return (
    seg.kind === "prose" &&
    seg.block.type === "subheading" &&
    (seg.block.props?.level as number) === 1
  );
}

function flowSectionContext(
  sectionId: string,
  sliceIndex: number,
  defaultPageBreak: boolean,
  breakVariant?: BreakVariant,
): SectionContext {
  const isFirst = sliceIndex === 0;
  const breakProps = breakVariantToSectionProps(breakVariant);
  return {
    id: sectionId,
    pageBreak: isFirst ? (breakProps.pageBreak ?? defaultPageBreak) : false,
    continuation: isFirst ? breakProps.continuation : (breakProps.continuation ?? true),
  };
}

function makeFlowSectionBlocks(
  sectionNum: number,
  openerTitle = "",
): { sectionId: string; seclabel: BlockNode; opener: BlockNode } {
  const sectionId = `flow-section-${sectionNum}`;
  return {
    sectionId,
    seclabel: {
      id: `${sectionId}-seclabel`,
      type: "seclabel",
      content: `Section ${String(sectionNum).padStart(2, "0")}`,
    },
    opener: {
      id: `${sectionId}-opener`,
      type: "opener",
      props: { number: String(sectionNum) },
      content: openerTitle,
    },
  };
}

export function segmentsToLayoutItems(segments: BodySegment[]): LayoutItem[] {
  const items: LayoutItem[] = [];
  let sectionNum = 0;
  let pendingVariant: BreakVariant | undefined;
  let forceNext = false;
  let sectionId: string | null = null;
  let sliceIndex = 0;

  const openSection = (openerTitle = "") => {
    sectionNum += 1;
    sectionId = `flow-section-${sectionNum}`;
    sliceIndex = 0;
    const defaultPageBreak = sectionNum === 1;
    const { seclabel, opener } = makeFlowSectionBlocks(sectionNum, openerTitle);

    items.push({
      key: seclabel.id,
      block: seclabel,
      section: flowSectionContext(sectionId, sliceIndex++, defaultPageBreak, pendingVariant),
      forceBreakBefore: forceNext,
    });
    forceNext = false;
    pendingVariant = undefined;

    items.push({
      key: opener.id,
      block: opener,
      section: flowSectionContext(sectionId, sliceIndex++, defaultPageBreak),
    });
  };

  const workingSegments =
    segments.length > 0
      ? segments
      : [
          {
            key: "body-empty-1",
            kind: "prose" as const,
            block: { id: "body-empty-1", type: "paragraph" as const, content: "" },
            markdown: "",
          },
        ];

  for (const seg of workingSegments) {
    if (seg.kind === "break") {
      items.push({ key: `break:${seg.block.id}`, block: seg.block, isBreak: true });
      pendingVariant = (seg.block.props?.variant as BreakVariant) ?? "page";
      forceNext = true;
      sectionId = null;
      continue;
    }

    if (!sectionId) {
      if (isSectionTitleSegment(seg)) {
        openSection(seg.markdown);
        continue;
      }
      openSection();
    }

    if (!sectionId) continue;
    const activeSectionId = sectionId;

    items.push({
      key: seg.key,
      block: seg.block,
      section: flowSectionContext(activeSectionId, sliceIndex++, sectionNum === 1),
      forceBreakBefore: forceNext,
    });
    forceNext = false;
  }

  return items;
}

export function flowSectionHeaderBlocks(blocks: BlockNode[]): BlockNode[] {
  const headers: BlockNode[] = [];
  for (const block of blocks) {
    if (block.type !== "section") continue;
    for (const child of block.children ?? []) {
      if (child.type === "seclabel" || child.type === "opener") {
        headers.push(child);
      } else {
        return headers;
      }
    }
    return headers;
  }
  return headers;
}

export function flowWritingPageHasSectionBreak(blocks: BlockNode[]): boolean {
  const section = blocks.find((block) => block.type === "section");
  if (!section) return blocks.length === 0;
  return !!(section.props?.pageBreak && !section.props?.continuation);
}

export function flowDocumentToLayoutItems(document: DocDocument): LayoutItem[] {
  const items: LayoutItem[] = [];

  for (const block of document.blocks) {
    if (block.type === "cover") {
      items.push({ key: block.id, block, isCover: true, forceBreakBefore: true });
    }
  }

  if (isFlowDoc(document)) {
    items.push(...segmentsToLayoutItems(parseBodyToSegments(document.body ?? "")));
    const contentPages = document.blocks.filter(
      (b) => b.type === "page" && !isCoverPageBlock(b),
    );
    if (contentPages.length > 0) {
      items.push(...blocksToLayoutItems(contentPages));
    }
  } else {
    const contentBlocks = document.blocks.filter(
      (b) => b.type !== "cover" && !(b.type === "page" && isCoverPageBlock(b)),
    );
    items.push(...blocksToLayoutItems(contentBlocks));
  }

  return items;
}

export function extractBodyHeadings(body: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  for (const seg of parseBodyToSegments(body)) {
    if (seg.block.type === "subheading") {
      headings.push({
        level: (seg.block.props?.level as number) ?? 2,
        text: seg.markdown,
      });
    }
  }
  return headings;
}
