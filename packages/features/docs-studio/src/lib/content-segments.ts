export function splitContentSegments(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [content];

  const parts = trimmed
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [content];
}

export function splitSplittableParts(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [content];

  const paragraphs = trimmed
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (paragraphs.length > 1) return paragraphs;

  const lines = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;

  const sentences = trimmed
    .split(/(?<=[.!?;:])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (sentences.length > 1) return sentences;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 8) {
    const chunk = Math.max(4, Math.ceil(words.length / 16));
    const parts: string[] = [];
    for (let i = 0; i < words.length; i += chunk) {
      parts.push(words.slice(i, i + chunk).join(' '));
    }
    return parts;
  }

  return [content];
}

export function joinContentSegments(segments: string[]): string {
  return segments.filter(Boolean).join('\n\n');
}
