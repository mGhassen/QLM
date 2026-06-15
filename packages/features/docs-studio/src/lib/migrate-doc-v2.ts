import { resolveBlockContent } from "./content";
import type { BlockNode, DocDocument } from "./types";
import { DOC_VERSION_FLOW, isFlowDoc } from "./flow-doc";

const PROSE_TYPES = new Set([
  "paragraph",
  "subheading",
  "quote",
  "flow",
  "main",
  "engines",
  "pull",
  "cquote",
  "raw",
  "seclabel",
  "opener",
]);

const DESIGN_TYPES = new Set([
  "card",
  "hero",
  "alert",
  "figure",
  "table",
  "phase",
  "pat",
  "kpi",
  "kpiband",
  "levels",
  "engines",
  "vm",
  "flow",
]);

function blockToMarkdown(block: BlockNode, sections: Record<string, string>): string {
  const content = resolveBlockContent(block, sections);
  if (block.type === "subheading") {
    const level = (block.props?.level as number) ?? 2;
    const prefix = "#".repeat(Math.min(level, 3));
    return `${prefix} ${content}`;
  }
  if (block.type === "quote") {
    return content
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }
  return content;
}

function attrsToString(props: Record<string, unknown> | undefined): string {
  if (!props) return "";
  return Object.entries(props)
    .filter(([k]) => k !== "id" && k !== "pageBreak" && k !== "continuation")
    .map(([k, v]) => `${k}="${String(v)}"`)
    .join(" ");
}

function blockToMarkdocTag(block: BlockNode, sections: Record<string, string>): string {
  const content = resolveBlockContent(block, sections);
  const attrs = attrsToString(block.props);
  const attrStr = attrs ? ` ${attrs}` : "";
  return `{% ${block.type}${attrStr} %}\n${content}\n{% /${block.type} %}`;
}

function flattenSectionChildren(
  section: BlockNode,
  sections: Record<string, string>,
): string[] {
  const parts: string[] = [];
  for (const child of section.children ?? []) {
    if (child.type === "break") {
      parts.push(`{% break variant="${(child.props?.variant as string) ?? "page"}" /%}`);
      continue;
    }
    if (PROSE_TYPES.has(child.type)) {
      parts.push(blockToMarkdown(child, sections));
    } else if (DESIGN_TYPES.has(child.type)) {
      parts.push(blockToMarkdocTag(child, sections));
    } else if (child.type === "section") {
      parts.push(...flattenSectionChildren(child, sections));
    }
  }
  return parts;
}

function flattenRootBlock(block: BlockNode, sections: Record<string, string>): string[] {
  if (block.type === "cover") return [];
  if (block.type === "section") return flattenSectionChildren(block, sections);
  if (block.type === "break") {
    return [`{% break variant="${(block.props?.variant as string) ?? "page"}" /%}`];
  }
  if (PROSE_TYPES.has(block.type)) return [blockToMarkdown(block, sections)];
  if (DESIGN_TYPES.has(block.type)) return [blockToMarkdocTag(block, sections)];
  return [];
}

export function migrateDocToV2(
  document: DocDocument,
  sections: Record<string, string>,
): DocDocument {
  if (document.version >= DOC_VERSION_FLOW && document.body !== undefined) {
    return document;
  }

  const bodyParts: string[] = [];
  for (const block of document.blocks) {
    bodyParts.push(...flattenRootBlock(block, sections));
  }

  return {
    ...document,
    version: DOC_VERSION_FLOW,
    body: bodyParts.join("\n\n"),
    blocks: document.blocks.filter((b) => b.type === "cover"),
  };
}

export function ensureFlowDocument(
  document: DocDocument,
  sections: Record<string, string>,
): DocDocument {
  if (isFlowDoc(document)) {
    return document.body !== undefined
      ? document
      : { ...document, body: "" };
  }
  return migrateDocToV2(document, sections);
}
