export interface CoverSubtitleData {
  subtitleUp?: string;
  subtitleOr?: string;
  subtitleDown?: string;
}

function lineValue(lines: string[], key: string): string | undefined {
  const line = lines.find((l) => l.startsWith(`${key}: `));
  return line?.slice(key.length + 2);
}

export function parseCoverSubtitle(content: string): CoverSubtitleData {
  const trimmed = content.trim();
  const lines = trimmed.split("\n");

  const subtitleUp = lineValue(lines, "subtitleUp");
  const subtitleOr = lineValue(lines, "subtitleOr");
  const subtitleDown = lineValue(lines, "subtitleDown");

  if (subtitleUp || subtitleOr || subtitleDown) {
    return { subtitleUp, subtitleOr, subtitleDown };
  }

  const md = trimmed.replace(/\n/g, " ");
  const match = md.match(/^\*\*(.+?)\*\*\s*\*(.+?)\*\s*(.+)$/);
  if (match) {
    return {
      subtitleUp: match[1].trim(),
      subtitleOr: match[2].trim(),
      subtitleDown: match[3].trim(),
    };
  }

  return { subtitleUp: trimmed || undefined };
}

export function serializeCoverSubtitle(data: CoverSubtitleData): string {
  const lines: string[] = [];
  if (data.subtitleUp?.trim()) lines.push(`subtitleUp: ${data.subtitleUp.trim()}`);
  if (data.subtitleOr?.trim()) lines.push(`subtitleOr: ${data.subtitleOr.trim()}`);
  if (data.subtitleDown?.trim()) lines.push(`subtitleDown: ${data.subtitleDown.trim()}`);
  return lines.join("\n");
}

export function patchCoverSubtitle(content: string, patch: Partial<CoverSubtitleData>): string {
  return serializeCoverSubtitle({ ...parseCoverSubtitle(content), ...patch });
}
