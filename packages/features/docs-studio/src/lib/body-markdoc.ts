import type { BlockNode } from './types';
import { createBlock } from './serialize';

const DESIGN_TAGS = new Set([
  'card',
  'hero',
  'alert',
  'figure',
  'table',
  'quote',
  'phase',
  'pat',
  'kpi',
  'kpiband',
  'levels',
  'engines',
  'vm',
  'flow',
]);

const BLOCK_TAG_RE = /\{%\s*(\/?)(\w+)([^%]*?)%\}/g;

function parseTagAttrs(str: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)=["']([^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

function markdownToEditorHtml(md: string): string {
  const trimmed = md.trim();
  if (!trimmed) return '<p></p>';

  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(BLOCK_TAG_RE.source, 'g');

  while ((match = re.exec(md)) !== null) {
    if (match.index > lastIndex) {
      parts.push(proseMarkdownToHtml(md.slice(lastIndex, match.index)));
    }

    const closing = match[1] === '/';
    const tag = match[2];

    if (!closing && DESIGN_TAGS.has(tag)) {
      const attrs = parseTagAttrs(match[3]);
      const closeRe = new RegExp(`\\{%\\s*/${tag}\\s*%\}`, 'g');
      closeRe.lastIndex = re.lastIndex;
      const closeMatch = closeRe.exec(md);
      const inner = closeMatch
        ? md.slice(re.lastIndex, closeMatch.index).trim()
        : '';
      const id = `design-${parts.length}`;
      parts.push(
        `<div data-design-block="true" data-block-type="${tag}" data-block-id="${id}" data-props-json="${escapeHtml(JSON.stringify(attrs))}" data-content="${escapeHtml(inner)}"></div>`,
      );
      lastIndex = closeMatch ? closeRe.lastIndex : re.lastIndex;
      re.lastIndex = lastIndex;
      continue;
    }

    lastIndex = re.lastIndex;
  }

  if (lastIndex < md.length) {
    parts.push(proseMarkdownToHtml(md.slice(lastIndex)));
  }

  return parts.join('') || '<p></p>';
}

function proseMarkdownToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const lines = trimmed.split('\n');
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      html.push(`<h3>${inlineMd(line.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      html.push(`<h2>${inlineMd(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      html.push(`<h1>${inlineMd(line.slice(2))}</h1>`);
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
      html.push(`<ul>${items.join('')}</ul>`);
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
      html.push(`<ol>${items.join('')}</ol>`);
      continue;
    }
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '') {
      para.push(lines[i]);
      i++;
    }
    html.push(`<p>${inlineMd(para.join(' '))}</p>`);
  }

  return html.join('');
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h([1-6])>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function editorHtmlToMarkdown(html: string): string {
  if (!html.trim()) return '';

  const parts: string[] = [];
  const div =
    typeof document !== 'undefined' ? document.createElement('div') : null;
  if (!div) return htmlToPlainText(html);

  div.innerHTML = html;
  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.getAttribute('data-design-block') === 'true') {
        const tag = el.getAttribute('data-block-type') ?? 'card';
        const props = el.getAttribute('data-props-json')
          ? JSON.parse(el.getAttribute('data-props-json')!)
          : {};
        const content = el.getAttribute('data-content') ?? '';
        const attrStr = Object.entries(props)
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ');
        parts.push(
          `{% ${tag}${attrStr ? ` ${attrStr}` : ''} %}\n${content}\n{% /${tag} %}`,
        );
        return;
      }
      const tag = el.tagName.toLowerCase();
      if (tag === 'h1') {
        parts.push(`# ${htmlToPlainText(el.innerHTML)}`);
        return;
      }
      if (tag === 'h2') {
        parts.push(`## ${htmlToPlainText(el.innerHTML)}`);
        return;
      }
      if (tag === 'h3') {
        parts.push(`### ${htmlToPlainText(el.innerHTML)}`);
        return;
      }
      if (tag === 'ul' || tag === 'ol') {
        const items = Array.from(el.querySelectorAll(':scope > li'));
        const lines = items.map((li, i) => {
          const text = htmlToPlainText(li.innerHTML);
          return tag === 'ol' ? `${i + 1}. ${text}` : `- ${text}`;
        });
        parts.push(lines.join('\n'));
        return;
      }
      if (tag === 'p') {
        const text = htmlToPlainText(el.innerHTML);
        if (text) parts.push(text);
        return;
      }
      if (tag === 'blockquote') {
        parts.push(
          htmlToPlainText(el.innerHTML)
            .split('\n')
            .map((l) => `> ${l}`)
            .join('\n'),
        );
        return;
      }
      Array.from(el.childNodes).forEach(walk);
      return;
    }
  };

  Array.from(div.childNodes).forEach(walk);
  return parts.join('\n\n').trim();
}

export function bodyToEditorHtml(body: string): string {
  return markdownToEditorHtml(body);
}

export function editorHtmlToBody(html: string): string {
  return editorHtmlToMarkdown(html);
}

export function blockNodeToDesignHtml(block: BlockNode): string {
  const props = block.props ?? {};
  const content = block.content ?? '';
  return `<div data-design-block="true" data-block-type="${block.type}" data-block-id="${block.id}" data-props-json="${escapeHtml(JSON.stringify(props))}" data-content="${escapeHtml(content)}"></div>`;
}

export function insertDesignBlockInBody(
  body: string,
  block: BlockNode,
): string {
  const tag = blockToMarkdocSnippet(block);
  return body.trim() ? `${body.trim()}\n\n${tag}` : tag;
}

function blockToMarkdocSnippet(block: BlockNode): string {
  const defaults = createBlock(block.type, {
    content: block.content,
    props: block.props,
  });
  const content = defaults.content ?? '';
  const props = defaults.props ?? {};
  const attrStr = Object.entries(props)
    .filter(([k]) => k !== 'id')
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  return `{% ${block.type}${attrStr ? ` ${attrStr}` : ''} %}\n${content}\n{% /${block.type} %}`;
}
