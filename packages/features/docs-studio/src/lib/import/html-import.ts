import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';

import { DOC_VERSION_FLOW } from '../flow-doc';
import { generateId } from '../serialize';
import type { BlockNode, DocDocument } from '../types';
import { titleFromFilename } from './slugify';
import {
  IMPORT_ASSET_PREFIX,
  type ImportAsset,
  type ImportResult,
} from './types';

type CheerioRoot = cheerio.CheerioAPI;

type HtmlElement = Element;

function textOf($: CheerioRoot, el: HtmlElement): string {
  return $(el).text().replace(/\s+/g, ' ').trim();
}

function inlineHtmlToMarkdown($: CheerioRoot, el: HtmlElement): string {
  let html = $(el).html() ?? '';
  html = html
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#160;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
  return html;
}

function listToMarkdown(
  $: CheerioRoot,
  el: HtmlElement,
  ordered: boolean,
): string {
  const items: string[] = [];
  $(el)
    .children('li')
    .each((index, li) => {
      const prefix = ordered ? `${index + 1}.` : '-';
      items.push(`${prefix} ${inlineHtmlToMarkdown($, li)}`);
    });
  return items.join('\n');
}

function tableToContent($: CheerioRoot, table: HtmlElement): string {
  const rows: string[] = [];
  $(table)
    .find('tr')
    .each((_, row) => {
      const cells: string[] = [];
      $(row)
        .find('th, td')
        .each((__, cell) => {
          cells.push(textOf($, cell));
        });
      if (cells.length > 0) {
        rows.push(cells.join(' | '));
      }
    });
  return rows.join('\n');
}

function resolveRoot($: CheerioRoot): cheerio.Cheerio<HtmlElement> {
  const main = $('main').first();
  if (main.length > 0) return main;
  const article = $('article').first();
  if (article.length > 0) return article;
  return $('body');
}

class HtmlDocBuilder {
  pages: BlockNode[] = [];
  assets: ImportAsset[] = [];
  private imgCounter = 0;
  private sectionNum = 0;

  private ensureSection(pageBreak = false): BlockNode[] {
    let page = this.pages[this.pages.length - 1];
    if (!page || pageBreak) {
      page = { id: generateId('page'), type: 'page', children: [] };
      this.pages.push(page);
    }

    const sections = page.children ?? [];
    const lastSection = sections[sections.length - 1];
    if (!lastSection || pageBreak) {
      this.sectionNum += 1;
      const section: BlockNode = {
        id: generateId('section'),
        type: 'section',
        props: {
          id: `section-${this.sectionNum}`,
          ...(pageBreak ? { pageBreak: true } : {}),
        },
        children: [],
      };
      page.children = [...sections, section];
      return section.children!;
    }

    return lastSection.children ?? (lastSection.children = []);
  }

  private pushBlock(block: BlockNode, pageBreak = false) {
    const children = this.ensureSection(pageBreak);
    children.push(block);
  }

  addHeading(level: 1 | 2 | 3 | 4, text: string) {
    if (level === 1) {
      this.pages.push({
        id: generateId('page'),
        type: 'page',
        children: [
          {
            id: generateId('section'),
            type: 'section',
            props: { id: `section-${++this.sectionNum}` },
            children: [
              {
                id: generateId('opener'),
                type: 'opener',
                content: text,
              },
            ],
          },
        ],
      });
      return;
    }

    if (level === 2) {
      this.pushBlock(
        {
          id: generateId('subheading'),
          type: 'subheading',
          props: { level: 2 },
          content: text,
        },
        true,
      );
      return;
    }

    this.pushBlock({
      id: generateId('subheading'),
      type: 'subheading',
      props: { level },
      content: text,
    });
  }

  addParagraph(text: string) {
    if (!text.trim()) return;
    this.pushBlock({
      id: generateId('paragraph'),
      type: 'paragraph',
      content: text,
    });
  }

  addQuote(text: string) {
    this.pushBlock({
      id: generateId('quote'),
      type: 'quote',
      content: text,
    });
  }

  addTable(content: string) {
    this.pushBlock({
      id: generateId('table'),
      type: 'table',
      content,
    });
  }

  addFigure(src: string, alt = '') {
    this.pushBlock({
      id: generateId('figure'),
      type: 'figure',
      content: `src: ${src}\ncaption: ${alt}`,
    });
  }

  addBreak() {
    this.pushBlock({ id: generateId('break'), type: 'break' });
  }

  addImage($: CheerioRoot, el: HtmlElement) {
    const src = $(el).attr('src') ?? '';
    const alt = $(el).attr('alt') ?? '';
    if (!src) return;

    const dataUriMatch = src.match(/^data:image\/(\w+);base64,(.+)$/);
    if (dataUriMatch) {
      const ext = dataUriMatch[1] === 'jpeg' ? 'jpg' : dataUriMatch[1];
      this.imgCounter += 1;
      const filename = `figure-${this.imgCounter}.${ext}`;
      this.assets.push({
        filename,
        buffer: Buffer.from(dataUriMatch[2], 'base64'),
        contentType: `image/${dataUriMatch[1]}`,
      });
      this.addFigure(`${IMPORT_ASSET_PREFIX}${filename}`, alt);
      return;
    }

    if (/^https?:\/\//i.test(src)) {
      this.addFigure(src, alt);
    }
  }

  buildDocument(): DocDocument {
    if (this.pages.length === 0) {
      this.pushBlock({
        id: generateId('paragraph'),
        type: 'paragraph',
        content: '',
      });
    }

    return {
      version: DOC_VERSION_FLOW,
      layoutMode: 'paginated',
      pageFormat: 'a4',
      chrome: {
        headerEnabled: false,
        footerEnabled: false,
      },
      blocks: this.pages,
    };
  }
}

const BLOCK_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'p',
  'ul',
  'ol',
  'blockquote',
  'table',
  'img',
  'pre',
  'code',
  'hr',
]);

const CONTAINER_TAGS = new Set([
  'div',
  'section',
  'article',
  'main',
  'body',
  'header',
  'footer',
]);

function walkNode($: CheerioRoot, node: HtmlElement, builder: HtmlDocBuilder) {
  const tag = node.tagName?.toLowerCase();
  if (!tag) return;

  if (CONTAINER_TAGS.has(tag)) {
    $(node)
      .contents()
      .each((_, child) => {
        if (child.type === 'tag') {
          walkNode($, child, builder);
        } else if (child.type === 'text') {
          const text = (child.data ?? '').replace(/\s+/g, ' ').trim();
          if (text) builder.addParagraph(text);
        }
      });
    return;
  }

  if (!BLOCK_TAGS.has(tag)) return;

  switch (tag) {
    case 'h1':
      builder.addHeading(1, textOf($, node));
      break;
    case 'h2':
      builder.addHeading(2, textOf($, node));
      break;
    case 'h3':
      builder.addHeading(3, textOf($, node));
      break;
    case 'h4':
      builder.addHeading(4, textOf($, node));
      break;
    case 'p':
      builder.addParagraph(inlineHtmlToMarkdown($, node));
      break;
    case 'ul':
      builder.addParagraph(listToMarkdown($, node, false));
      break;
    case 'ol':
      builder.addParagraph(listToMarkdown($, node, true));
      break;
    case 'blockquote':
      builder.addQuote(inlineHtmlToMarkdown($, node));
      break;
    case 'table':
      builder.addTable(tableToContent($, node));
      break;
    case 'img':
      builder.addImage($, node);
      break;
    case 'pre':
      builder.addParagraph(`\`\`\`\n${$(node).text()}\n\`\`\``);
      break;
    case 'code':
      if ($(node).parents('pre').length === 0) {
        builder.addParagraph(`\`${$(node).text()}\``);
      }
      break;
    case 'hr':
      builder.addBreak();
      break;
    default:
      break;
  }
}

export function importHtml(html: string, filename?: string): ImportResult {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();

  const title =
    $('title').first().text().trim() ||
    $('h1').first().text().trim() ||
    (filename ? titleFromFilename(filename) : 'Imported document');

  const builder = new HtmlDocBuilder();
  const root = resolveRoot($);
  root.contents().each((_, node) => {
    if (node.type === 'tag') {
      walkNode($, node, builder);
    }
  });

  return {
    title,
    document: builder.buildDocument(),
    sections: {},
    assets: builder.assets,
  };
}
