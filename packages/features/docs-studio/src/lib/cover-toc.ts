export interface TocEntry {
  num: string;
  label: string;
  href: string;
}

const TOC_LINE_RE = /^\*\*(\d+)\*\*\s+(.+?)\s*→\s*(#\S+)\s*$/;
const TOC_MD_LINK_RE = /^(\d+)\.\s+\[([^\]]+)\]\(([^)]+)\)\s*$/;

export function parseCoverToc(content: string): TocEntry[] {
  const entries: TocEntry[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    let match = trimmed.match(TOC_LINE_RE);
    if (match) {
      entries.push({ num: match[1], label: match[2].trim(), href: match[3] });
      continue;
    }

    match = trimmed.match(TOC_MD_LINK_RE);
    if (match) {
      entries.push({ num: match[1], label: match[2].trim(), href: match[3] });
    }
  }

  return entries;
}

export function serializeCoverToc(entries: TocEntry[]): string {
  return entries.map((e) => `**${e.num}** ${e.label} → ${e.href}`).join('\n');
}

export function isCoverTocContent(content: string): boolean {
  return parseCoverToc(content).length > 0;
}
