import { parseBodyToSegments } from "./body-segments";
import { DOC_VERSION_FLOW } from "./flow-doc";
import { ensureFlowDocument } from "./migrate-doc-v2";
import { ensurePageModel } from "./migrate-page-model";
import { normalizeDocBlocks } from "./normalize-level";
import { createBlock, generateId } from "./serialize";
import type { BlockNode, DocDocument } from "./types";

export function hasContentBlocks(blocks: BlockNode[]): boolean {
  return blocks.some((block) => block.type === "page" || (block.type !== "cover" && block.type !== "break"));
}

export function createStarterSection(): BlockNode {
  return {
    id: generateId("section"),
    type: "section",
    props: { id: generateId("section") },
    children: [{ id: generateId("paragraph"), type: "paragraph", content: "" }],
  };
}

export function createStarterPage(): BlockNode {
  return createBlock("page");
}

export function createCoverPageBlock(): BlockNode {
  const coverDefaults = createBlock("cover");
  return {
    id: generateId("page"),
    type: "page",
    children: [
      {
        id: generateId("section"),
        type: "section",
        props: { id: "cover", variant: "cover" },
        children: coverDefaults.children ?? [],
      },
    ],
  };
}

function segmentsToPages(body: string): BlockNode[] {
  const segments = parseBodyToSegments(body);
  const pages: BlockNode[] = [];
  let sectionNum = 0;
  let currentChildren: BlockNode[] = [];

  const flushSection = () => {
    if (currentChildren.length === 0) return;
    sectionNum += 1;
    const section: BlockNode = {
      id: `section-${sectionNum}`,
      type: "section",
      props: { id: `section-${sectionNum}` },
      children: currentChildren,
    };
    pages.push({
      id: `page-${sectionNum}`,
      type: "page",
      children: [section],
    });
    currentChildren = [];
  };

  for (const seg of segments) {
    if (seg.kind === "break") {
      flushSection();
      const lastPage = pages[pages.length - 1];
      if (lastPage) {
        const lastSection = lastPage.children?.[lastPage.children.length - 1];
        if (lastSection?.type === "section") {
          lastPage.children = [
            ...(lastPage.children ?? []).slice(0, -1),
            { ...lastSection, children: [...(lastSection.children ?? []), seg.block] },
          ];
        }
      }
      continue;
    }
    currentChildren.push({ ...seg.block });
  }

  flushSection();
  return pages;
}

export function bodySegmentsToBlocks(body: string): BlockNode[] {
  return segmentsToPages(body);
}

export function prepareStudioDocument(
  document: DocDocument,
  sections: Record<string, string>,
): DocDocument {
  const normalizedBlocks = normalizeDocBlocks(document.blocks, sections);
  const normalized = { ...document, blocks: normalizedBlocks };
  const hasPages = normalized.blocks.some((b) => b.type === "page");
  const hasLegacyRoot = normalized.blocks.some(
    (b) => b.type === "section" || b.type === "cover",
  );

  if (hasLegacyRoot && !hasPages) {
    return {
      ...normalized,
      version: DOC_VERSION_FLOW,
      blocks: ensurePageModel(normalizedBlocks),
      body: undefined,
    };
  }

  const doc = ensureFlowDocument(normalized, sections);

  const bodyContent = (doc.body ?? "").trim();
  const hasLegacyContent = hasContentBlocks(doc.blocks);

  if (bodyContent && !hasLegacyContent) {
    return {
      ...doc,
      blocks: ensurePageModel(segmentsToPages(doc.body ?? "")),
      body: undefined,
    };
  }

  if (!hasLegacyContent && !hasPages) {
    return {
      ...doc,
      blocks: ensurePageModel([createStarterPage()]),
      body: undefined,
    };
  }

  return {
    ...doc,
    blocks: ensurePageModel(doc.blocks),
    body: undefined,
  };
}

export function isBlankStarterDocument(blocks: BlockNode[]): boolean {
  const pages = blocks.filter((b) => b.type === "page");
  if (pages.length !== 1) return false;
  const sections = pages[0].children?.filter((c) => c.type === "section") ?? [];
  if (sections.length !== 1) return false;
  const children = sections[0].children ?? [];
  if (children.length !== 1 || children[0].type !== "paragraph") return false;
  return !children[0].content?.trim();
}

export function findFirstParagraphId(blocks: BlockNode[]): string | null {
  for (const block of blocks) {
    if (block.type === "paragraph") return block.id;
    if (block.children) {
      const nested = findFirstParagraphId(block.children);
      if (nested) return nested;
    }
  }
  return null;
}
