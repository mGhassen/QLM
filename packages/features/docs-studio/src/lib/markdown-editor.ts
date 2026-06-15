export function isHtmlContent(content: string): boolean {
  const trimmed = content.trim();
  return /^<(p|h[1-6]|ul|ol|div|blockquote|span)\b/i.test(trimmed);
}

export function markdownToHtml(md: string): string {
  if (!md.trim()) return '<p></p>';
  if (isHtmlContent(md)) return md.trim();

  const lines = md.split('\n');
  const parts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      parts.push(`<h3>${inlineMd(line.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      parts.push(`<h2>${inlineMd(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      parts.push(`<h1>${inlineMd(line.slice(2))}</h1>`);
      i++;
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(
          `<li><p>${inlineMd(lines[i].replace(/^[-*]\s/, ''))}</p></li>`,
        );
        i++;
      }
      parts.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(
          `<li><p>${inlineMd(lines[i].replace(/^\d+\.\s/, ''))}</p></li>`,
        );
        i++;
      }
      parts.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !isBlockStart(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    parts.push(`<p>${inlineMd(para.join('<br>'))}</p>`);
  }

  return parts.join('') || '<p></p>';
}

function isBlockStart(line: string): boolean {
  return (
    line.startsWith('# ') ||
    line.startsWith('## ') ||
    line.startsWith('### ') ||
    /^[-*]\s/.test(line) ||
    /^\d+\.\s/.test(line)
  );
}

import { inlineMarkdown as inlineMd } from './inline-markdown';

/** Inline HTML for headings and single-line text blocks (color spans, bold, etc.). */
export function renderInlineContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return '';
  if (isHtmlContent(trimmed) || /<span/i.test(trimmed)) {
    return trimmed.replace(/^<p>([\s\S]*)<\/p>$/i, '$1');
  }
  return inlineMd(trimmed);
}

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return nodeToMd(doc.body).trim();
}

function nodeToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const children = Array.from(el.childNodes).map(nodeToMd).join('');

  switch (el.tagName) {
    case 'H1':
      return blockToMd(el, 'h1', children, '# ');
    case 'H2':
      return blockToMd(el, 'h2', children, '## ');
    case 'H3':
      return blockToMd(el, 'h3', children, '### ');
    case 'P':
      return blockToMd(el, 'p', children);
    case 'STRONG':
    case 'B':
      return `**${children}**`;
    case 'EM':
    case 'I':
      return `*${children}*`;
    case 'S':
    case 'DEL':
      return `~~${children}~~`;
    case 'U':
      return children;
    case 'A': {
      const href = el.getAttribute('href') ?? '';
      return `[${children}](${href})`;
    }
    case 'SPAN': {
      if (el.classList.contains('n')) return `**${children}**`;
      const color = el.style.color;
      if (color) return `<span style="color: ${color}">${children}</span>`;
      return children;
    }
    case 'UL':
    case 'OL': {
      const style = el.getAttribute('style');
      if (style) {
        const tag = el.tagName.toLowerCase();
        const items = Array.from(el.children)
          .map((li) => `<li>${(li as HTMLElement).innerHTML.trim()}</li>`)
          .join('');
        return `<${tag} style="${style}">${items}</${tag}>\n\n`;
      }
      if (el.tagName === 'UL') {
        return (
          Array.from(el.children)
            .map((li) => `- ${nodeToMd(li).trim()}`)
            .join('\n') + '\n\n'
        );
      }
      return (
        Array.from(el.children)
          .map((li, i) => `${i + 1}. ${nodeToMd(li).trim()}`)
          .join('\n') + '\n\n'
      );
    }
    case 'LI':
      return children;
    case 'BR':
      return '\n';
    case 'DIV':
      return children + (children.endsWith('\n\n') ? '' : '\n');
    default:
      return children;
  }
}

function inlineHtml(text: string): string {
  return text.replace(/\n\n+/g, '\n').trim();
}

function blockToMd(
  el: HTMLElement,
  tag: string,
  children: string,
  mdPrefix?: string,
): string {
  const style = el.getAttribute('style');
  const text = inlineHtml(children);
  if (style) return `<${tag} style="${style}">${text}</${tag}>\n\n`;
  if (mdPrefix) return `${mdPrefix}${text}\n\n`;
  return `${text}\n\n`;
}
