export interface MarkdocNode {
  type: "text" | "paragraph" | "heading" | "list" | "listItem" | "strong" | "em" | "link" | "tag" | "html";
  content?: string;
  level?: number;
  ordered?: boolean;
  href?: string;
  tag?: string;
  attrs?: Record<string, string>;
  children?: MarkdocNode[];
}

const TAG_RE = /\{%\s*(\/?)(\w+)([^%]*?)%\}/g;
const ATTR_RE = /(\w+)=["']([^"']*)["']/g;

function parseAttrs(str: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let m: RegExpExecArray | null;
  const re = new RegExp(ATTR_RE.source, "g");
  while ((m = re.exec(str)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

import { inlineMarkdown } from "./inline-markdown";

function parseBlocks(md: string): MarkdocNode[] {
  const nodes: MarkdocNode[] = [];
  const lines = md.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      nodes.push({ type: "heading", level: 3, content: line.slice(4) });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      nodes.push({ type: "heading", level: 2, content: line.slice(3) });
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      nodes.push({ type: "heading", level: 1, content: line.slice(2) });
      i++;
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: MarkdocNode[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push({ type: "listItem", content: lines[i].replace(/^[-*]\s/, "") });
        i++;
      }
      nodes.push({ type: "list", ordered: false, children: items });
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: MarkdocNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push({ type: "listItem", content: lines[i].replace(/^\d+\.\s/, "") });
        i++;
      }
      nodes.push({ type: "list", ordered: true, children: items });
      continue;
    }

    const paraLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !/^[-*]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    nodes.push({ type: "paragraph", content: paraLines.join(" ") });
  }

  return nodes;
}

export function parseMarkdoc(md: string): MarkdocNode[] {
  const parts: MarkdocNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(TAG_RE.source, "g");

  while ((match = re.exec(md)) !== null) {
    if (match.index > lastIndex) {
      const text = md.slice(lastIndex, match.index);
      if (text.trim()) parts.push(...parseBlocks(text));
    }

    const closing = match[1] === "/";
    const tag = match[2];
    const attrs = parseAttrs(match[3]);

    if (!closing) {
      parts.push({ type: "tag", tag, attrs, children: [] });
    }
    lastIndex = re.lastIndex;
  }

  if (lastIndex < md.length) {
    const text = md.slice(lastIndex);
    if (text.trim()) parts.push(...parseBlocks(text));
  }

  if (parts.length === 0 && md.trim()) return parseBlocks(md);
  return parts;
}

export function renderMarkdocToHtml(md: string): string {
  const trimmed = md.trim();
  if (/^<(p|h[1-6]|ul|ol|div|blockquote)\b/i.test(trimmed)) {
    return trimmed;
  }
  const nodes = parseMarkdoc(md);
  return nodes.map(renderNode).join("");
}

function renderNode(node: MarkdocNode): string {
  switch (node.type) {
    case "paragraph":
      return `<p>${inlineMarkdown(node.content ?? "")}</p>`;
    case "heading": {
      const lvl = node.level ?? 2;
      return `<h${lvl}>${inlineMarkdown(node.content ?? "")}</h${lvl}>`;
    }
    case "list": {
      const tag = node.ordered ? "ol" : "ul";
      const items = (node.children ?? [])
        .map((c) => `<li><p>${inlineMarkdown(c.content ?? "")}</p></li>`)
        .join("");
      return `<${tag}>${items}</${tag}>`;
    }
    case "text":
      return inlineMarkdown(node.content ?? "");
    case "tag":
      return "";
    default:
      return node.content ? `<p>${inlineMarkdown(node.content)}</p>` : "";
  }
}

export function extractKpis(md: string): { value: string; label: string }[] {
  const kpis: { value: string; label: string }[] = [];
  const re = /\{%\s*kpi\s+value=["']([^"']*)["']\s+label=["']([^"']*)["']\s*%\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    kpis.push({ value: m[1], label: m[2] });
  }
  if (kpis.length === 0) {
    const rowRe = /^###\s+(.+)\n(.+)$/gm;
    while ((m = rowRe.exec(md)) !== null) {
      kpis.push({ value: m[1].trim(), label: m[2].trim() });
    }
  }
  return kpis;
}

export function extractCards(md: string): { title: string; body: string }[] {
  const cards: { title: string; body: string }[] = [];
  const blocks = md.split(/\n---\n/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length >= 2) {
      const title = lines[0].replace(/^#+\s*/, "").replace(/^\d+\s+/, "");
      cards.push({ title, body: lines.slice(1).join("\n") });
    } else if (lines.length === 1 && lines[0].includes("|")) {
      const [title, body] = lines[0].split("|").map((s) => s.trim());
      if (title && body) cards.push({ title, body });
    }
  }
  return cards;
}

export function extractTableData(md: string): { headers: string[]; rows: string[][] } | null {
  const lines = md.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return null;

  const headers = lines[0].split("|").map((s) => s.trim()).filter(Boolean);
  const rows = lines.slice(1).map((l) => l.split("|").map((s) => s.trim()).filter(Boolean));
  return { headers, rows };
}
