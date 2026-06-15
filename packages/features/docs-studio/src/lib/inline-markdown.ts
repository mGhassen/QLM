const DESIGN_NUM_RE = /^\*\*(\d+)\*\*/;

export function designNumberToHtml(text: string): string {
  return text.replace(DESIGN_NUM_RE, '<span class="n">$1</span>');
}

export function inlineMarkdown(text: string): string {
  if (/<[a-z][^>]*>/i.test(text)) return text;

  const withNum = designNumberToHtml(text);

  return withNum
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/&#160;/g, "\u00a0");
}
