import pdf from "pdf-parse";

import { DOC_VERSION_FLOW } from "../flow-doc";
import { generateId } from "../serialize";
import type { BlockNode, DocDocument } from "../types";
import { titleFromFilename } from "./slugify";
import type { ImportResult } from "./types";

function splitPages(text: string): string[] {
  if (text.includes("\f")) {
    return text.split("\f").map((page) => page.trim()).filter(Boolean);
  }

  const chunks = text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (chunks.length === 0) return [""];
  return chunks;
}

function paragraphsToSection(paragraphs: string[], sectionNum: number): BlockNode {
  return {
    id: generateId("section"),
    type: "section",
    props: {
      id: `section-${sectionNum}`,
      ...(sectionNum > 1 ? { pageBreak: true } : {}),
    },
    children: paragraphs.map((text) => ({
      id: generateId("paragraph"),
      type: "paragraph" as const,
      content: text,
    })),
  };
}

function buildDocumentFromPages(pages: string[]): DocDocument {
  const docPages: BlockNode[] = [];
  let sectionNum = 0;

  for (const pageText of pages) {
    sectionNum += 1;
    const paragraphs = pageText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) continue;

    docPages.push({
      id: generateId("page"),
      type: "page",
      children: [paragraphsToSection(paragraphs, sectionNum)],
    });
  }

  if (docPages.length === 0) {
    docPages.push({
      id: generateId("page"),
      type: "page",
      children: [paragraphsToSection([""], 1)],
    });
  }

  return {
    version: DOC_VERSION_FLOW,
    layoutMode: "paginated",
    pageFormat: "a4",
    chrome: {
      headerEnabled: false,
      footerEnabled: false,
    },
    blocks: docPages,
  };
}

export async function importPdf(buffer: Buffer, filename?: string): Promise<ImportResult> {
  const parsed = await pdf(buffer);
  const text = parsed.text ?? "";
  const pages = splitPages(text);

  const metadataTitle = parsed.info?.Title?.trim();
  const firstLine = text
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean);
  const title =
    metadataTitle ||
    firstLine ||
    (filename ? titleFromFilename(filename) : "Imported document");

  return {
    title,
    document: buildDocumentFromPages(pages),
    sections: {},
    assets: [],
  };
}
