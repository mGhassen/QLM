#!/usr/bin/env tsx

import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import type { BlockNode, DocDocument } from '@qlm/docs-studio/lib/types';

export const SLUG = 'ia-agentique';
const HTML_PATH = path.join(
  process.cwd(),
  'import',
  'QLM_Imperatif_Donnees_Agentiques.html',
);
const OUT_DIR = path.join(process.cwd(), 'content', 'docs', SLUG);
const IMG_DIR = path.join(process.cwd(), 'public', 'docs', SLUG);
const SECTIONS_DIR = path.join(OUT_DIR, 'sections');

let blockCounter = 0;
let imgCounter = 0;

function uid(prefix: string): string {
  blockCounter++;
  return `${prefix}-${blockCounter}`;
}

function textOf($: cheerio.CheerioAPI, el: cheerio.Element): string {
  return $(el).text().replace(/\s+/g, ' ').trim();
}

function innerHtmlToMd($: cheerio.CheerioAPI, el: cheerio.Element): string {
  const $el = $(el);
  let html = $el.html() ?? '';
  html = html
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#160;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return html;
}

function saveImage(dataUri: string): string {
  const match = dataUri.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return dataUri;
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  imgCounter++;
  const filename = `figure-${imgCounter}.${ext}`;
  fs.mkdirSync(IMG_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(IMG_DIR, filename),
    Buffer.from(match[2], 'base64'),
  );
  return `/docs/${SLUG}/${filename}`;
}

function writeSection(filename: string, content: string): string {
  const ref = `sections/${filename}`;
  fs.writeFileSync(path.join(SECTIONS_DIR, filename), content.trim() + '\n');
  return ref;
}

function parseOpener($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode[] {
  const $el = $(el);
  const label = $el
    .find('.seclabel')
    .text()
    .replace(/^\/\/\s*|\s*\/\/$/g, '')
    .trim();
  const number = $el.find('h1 .n').text().trim();
  const title =
    $el.find('h1').clone().children().remove().end().text().trim() ||
    $el.find('h1').text().replace(number, '').trim();
  const blocks: BlockNode[] = [];
  if (label) {
    const labelId = uid('seclabel');
    blocks.push({
      id: labelId,
      type: 'seclabel',
      contentRef: writeSection(`${labelId}.md`, label),
    });
  }
  const openerId = uid('opener');
  blocks.push({
    id: openerId,
    type: 'opener',
    props: { number: number || undefined },
    contentRef: writeSection(`${openerId}.md`, title),
  });
  return blocks;
}

function parseFlow($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const paragraphs: string[] = [];
  $(el)
    .find('p')
    .each((_, p) => {
      paragraphs.push(innerHtmlToMd($, p));
    });
  const id = uid('flow');
  const contentRef = writeSection(`${id}.md`, paragraphs.join('\n\n'));
  return { id, type: 'flow', contentRef };
}

function parseCard($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const $el = $(el);
  const title = $el.find('h4').text().trim();
  const body = innerHtmlToMd($, $el.find('p').first()[0] ?? el);
  const classes = ($el.attr('class') ?? '').split(' ');
  let variant = 't-yellow';
  if (classes.includes('req')) variant = 'req';
  else if (classes.includes('t-ink')) variant = 't-ink';
  const id = uid('card');
  const contentRef = writeSection(`${id}.md`, `### ${title}\n${body}`);
  return { id, type: 'card', props: { variant }, contentRef };
}

function parseAlert($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const $el = $(el);
  const tag = $el
    .find('.tag')
    .text()
    .replace(/^\/\/\s*|\s*\/\/$/g, '')
    .trim();
  const classes = ($el.attr('class') ?? '').split(' ');
  let variant = 'read';
  if (classes.includes('insight')) variant = 'insight';
  else if (classes.includes('warn')) variant = 'warn';
  else if (classes.includes('predict')) variant = 'predict';
  const big = $el.find('p.big').length > 0;
  const body = innerHtmlToMd(
    $,
    $el.find('p').not('.big').first()[0] ?? $el.find('p.big')[0] ?? el,
  );
  const id = uid('alert');
  const contentRef = writeSection(`${id}.md`, `## ${tag}\n${body}`);
  return { id, type: 'alert', props: { variant, tag, big }, contentRef };
}

function parseHero($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const $el = $(el);
  const tag = $el
    .find('.tag')
    .text()
    .replace(/^\/\/\s*|\s*\/\/$/g, '')
    .trim();
  const stmt = $el.find('.stmt').text().trim();
  const rest = $el
    .find('p')
    .not('.stmt')
    .map((_, p) => innerHtmlToMd($, p))
    .get()
    .join('\n');
  const id = uid('hero');
  const contentRef = writeSection(`${id}.md`, `## ${tag}\n# ${stmt}\n${rest}`);
  return { id, type: 'hero', props: { tag }, contentRef };
}

function parseRail($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const $el = $(el);
  const classes = ($el.attr('class') ?? '').split(' ');
  let variant: string = 'note';
  if (classes.includes('dark')) variant = 'dark';
  else if (classes.includes('quote')) variant = 'quote';
  else if (classes.includes('img')) variant = 'img';

  if (variant === 'img') {
    const srcAttr = $el.find('img').attr('src') ?? '';
    const src = srcAttr.startsWith('data:') ? saveImage(srcAttr) : srcAttr;
    const id = uid('rail');
    const contentRef = writeSection(`${id}.md`, `src: ${src}`);
    return { id, type: 'rail', props: { variant, src }, contentRef };
  }

  if (variant === 'dark' && $el.find('.big').length > 0) {
    const rh = $el
      .find('.rh')
      .text()
      .replace(/^\/\/\s*|\s*\/\/$/g, '')
      .trim();
    const rows: string[] = [`## ${rh}`];
    $el.find('.row').each((_, row) => {
      const value = $(row).find('.big').text().trim();
      const label = $(row).find('.lab').text().trim();
      rows.push(`### ${value}\n${label}`);
    });
    const id = uid('rail');
    const contentRef = writeSection(`${id}.md`, rows.join('\n'));
    return { id, type: 'rail', props: { variant }, contentRef };
  }

  const heading = $el
    .find('.rh')
    .text()
    .replace(/^\/\/\s*|\s*\/\/$/g, '')
    .trim();
  const body = $el
    .find('.q, p')
    .map((_, p) => innerHtmlToMd($, p))
    .get()
    .join('\n');
  const id = uid('rail');
  const contentRef = writeSection(
    `${id}.md`,
    heading ? `## ${heading}\n${body}` : body,
  );
  return { id, type: 'rail', props: { variant, heading }, contentRef };
}

function parseSplit($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const $el = $(el);
  const reverse = ($el.attr('class') ?? '').includes('rev');
  const children: BlockNode[] = [];

  const main = $el.find('.main').first();
  if (main.length) {
    const id = uid('main');
    const paragraphs = main
      .find('p')
      .map((_, p) => innerHtmlToMd($, p))
      .get()
      .join('\n\n');
    const contentRef = writeSection(`${id}.md`, paragraphs);
    children.push({ id, type: 'main', contentRef });
  }

  const rail = $el.find('aside.rail, .rail').first();
  if (rail.length) {
    children.push(parseRail($, rail[0]));
  }

  return {
    id: uid('split'),
    type: 'split',
    props: { reverse, mainFlex: 1.75, railFlex: 1 },
    children,
  };
}

function parseGrid($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const classes = ($(el).attr('class') ?? '').split(' ');
  let cols: 2 | 3 | 4 = 2;
  if (classes.includes('grid3')) cols = 3;
  else if (classes.includes('grid4')) cols = 4;

  const children: BlockNode[] = [];
  $(el)
    .children()
    .each((_, child) => {
      const cls = $(child).attr('class') ?? '';
      if (cls.includes('card')) children.push(parseCard($, child));
      else if (cls.includes('phase')) children.push(parsePhase($, child));
      else if (cls.includes('lcard')) children.push(parseLCard($, child));
      else if (cls.includes('pat')) children.push(parsePat($, child));
    });

  return { id: uid('grid'), type: 'grid', props: { cols }, children };
}

function parsePhase($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const $el = $(el);
  const title = $el.find('.ph').text().trim();
  const items: string[] = [];
  $el.find('li').each((_, li) => {
    items.push(`- ${innerHtmlToMd($, li)}`);
  });
  const id = uid('phase');
  const contentRef = writeSection(`${id}.md`, `${title}\n${items.join('\n')}`);
  return { id, type: 'phase', props: { title }, contentRef };
}

function parseLCard($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const $el = $(el);
  const classes = ($el.attr('class') ?? '').split(' ');
  const tier = parseInt(
    classes.find((c) => c.startsWith('t'))?.replace('t', '') ?? '1',
  ) as 1 | 2 | 3 | 4;
  const title = $el.find('h4').text().trim();
  const body = $el
    .find('p')
    .map((_, p) => innerHtmlToMd($, p))
    .get()
    .join('\n');
  const id = uid('lcard');
  const contentRef = writeSection(`${id}.md`, `### ${title}\n${body}`);
  return { id, type: 'lcard', props: { tier }, contentRef };
}

function parsePat($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const $el = $(el);
  const number = $el.find('.pn').text().trim();
  const body = innerHtmlToMd($, $el.find('p').first()[0] ?? el);
  const id = uid('pat');
  const contentRef = writeSection(`${id}.md`, body);
  return { id, type: 'pat', props: { number }, contentRef };
}

function parseTable($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const $el = $(el);
  const title = $el
    .find('.ttl')
    .text()
    .replace(/^\/\/\s*|\s*\/\/$/g, '')
    .trim();
  const classes = ($el.attr('class') ?? '')
    .split(' ')
    .filter((c) => c !== 'tbl')
    .join(' ');
  const headers: string[] = [];
  $el.find('thead th').each((_, th) => headers.push(textOf($, th)));
  const rows: string[] = [];
  $el.find('tbody tr').each((_, tr) => {
    const cells: string[] = [];
    $(tr)
      .find('td')
      .each((_, td) => cells.push(textOf($, td)));
    rows.push(cells.join(' | '));
  });
  const md = [headers.join(' | '), ...rows].join('\n');
  const id = uid('table');
  const contentRef = writeSection(`${id}.md`, md);
  return { id, type: 'table', props: { title, variant: classes }, contentRef };
}

function parseFigure($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const $el = $(el);
  const srcAttr = $el.find('img').attr('src') ?? '';
  const src = srcAttr.startsWith('data:') ? saveImage(srcAttr) : srcAttr;
  const caption = $el.find('.cap').text().trim();
  const wide = ($el.attr('class') ?? '').includes('wide');
  const id = uid('figure');
  const contentRef = writeSection(
    `${id}.md`,
    `src: ${src}\ncaption: ${caption}`,
  );
  return { id, type: 'figure', props: { src, caption, wide }, contentRef };
}

function parseSubheading(
  $: cheerio.CheerioAPI,
  el: cheerio.Element,
): BlockNode {
  const tag = 'tagName' in el && el.tagName ? el.tagName.toLowerCase() : 'h2';
  const level = tag === 'h3' ? 3 : 2;
  const text = textOf($, el);
  const id = uid('subheading');
  const contentRef = writeSection(`${id}.md`, text);
  return { id, type: 'subheading', props: { level }, contentRef };
}

function parseParagraph($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const body = innerHtmlToMd($, el);
  const id = uid('paragraph');
  const contentRef = writeSection(`${id}.md`, body);
  return { id, type: 'paragraph', props: { justify: true }, contentRef };
}

function parseLevels($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const children: BlockNode[] = [];
  const $root = $(el);
  const headers: string[] = [];
  $root.find('.lhead .c').each((_, col) => {
    headers.push($(col).text().trim());
  });
  const highlightLastHeader = $root.find('.lhead .c.hi').length > 0;

  $root.find('.lvl').each((_, lvl) => {
    const $lvl = $(lvl);
    const levelClass = ($lvl.attr('class') ?? '').match(/l(\d)/);
    const level = parseInt(levelClass?.[1] ?? '1');
    const name = $lvl.find('.nm').text().trim();
    const highlightCol = $lvl.find('.gapcol').length > 0;
    const colChildren: BlockNode[] = [];
    $lvl.find('.col').each((_, col) => {
      const colId = uid('lvlcol');
      const contentRef = writeSection(
        `${colId}.md`,
        innerHtmlToMd($, $(col).find('p').first()[0] ?? col),
      );
      colChildren.push({ id: colId, type: 'lvlcol', contentRef });
    });
    children.push({
      id: uid('level'),
      type: 'level',
      props: { level, name, highlightCol },
      children: colChildren,
    });
  });

  return {
    id: uid('levels'),
    type: 'levels',
    props:
      headers.length > 0
        ? { headers, highlightLastHeader, colFlex: headers.map(() => 1) }
        : undefined,
    children,
  };
}

function parseVm($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const children: BlockNode[] = [];
  $(el)
    .find('.vmcol')
    .each((_, col) => {
      const title = $(col).find('h4').text().trim();
      const body = $(col)
        .find('p')
        .map((_, p) => innerHtmlToMd($, p))
        .get()
        .join('\n');
      const id = uid('vmcol');
      const contentRef = writeSection(`${id}.md`, `### ${title}\n${body}`);
      children.push({ id, type: 'vmcol', contentRef });
    });
  return { id: uid('vm'), type: 'vm', children };
}

function parseElement(
  $: cheerio.CheerioAPI,
  el: cheerio.Element,
): BlockNode | BlockNode[] | null {
  const $el = $(el);
  const cls = $el.attr('class') ?? '';
  const tag = 'tagName' in el && el.tagName ? el.tagName.toLowerCase() : '';

  if (cls.includes('opener')) return parseOpener($, el);
  if (cls.includes('split')) return parseSplit($, el);
  if (cls.startsWith('grid')) return parseGrid($, el);
  if (cls.includes('flow')) return parseFlow($, el);
  if (cls.includes('alert')) return parseAlert($, el);
  if (cls.includes('hero')) return parseHero($, el);
  if (cls.includes('tbl')) return parseTable($, el);
  if (cls.includes('fig')) return parseFigure($, el);
  if (cls.includes('levels')) return parseLevels($, el);
  if (cls.includes('vm')) return parseVm($, el);
  if (cls.includes('engines')) {
    const id = uid('engines');
    const contentRef = writeSection(`${id}.md`, innerHtmlToMd($, el));
    return { id, type: 'engines', contentRef };
  }
  if (cls.includes('cquote') || cls.includes('pull')) {
    const id = uid('quote');
    const contentRef = writeSection(`${id}.md`, innerHtmlToMd($, el));
    return {
      id,
      type: 'quote',
      props: { variant: cls.includes('pull') ? 'pull' : 'cquote' },
      contentRef,
    };
  }
  if (tag === 'h2' && cls.includes('sub')) return parseSubheading($, el);
  if (tag === 'h3' && cls.includes('sub')) return parseSubheading($, el);
  if (tag === 'p') return parseParagraph($, el);
  if (cls.includes('card')) return parseCard($, el);
  if (cls.includes('rail')) return parseRail($, el);

  return null;
}

function parseSection($: cheerio.CheerioAPI, el: cheerio.Element): BlockNode {
  const $el = $(el);
  const id = $el.attr('id') ?? uid('section');
  const style = ($el.attr('style') ?? '').toLowerCase();
  const pageBreak = style.includes('page-break-before');
  const children: BlockNode[] = [];

  $el.children().each((_, child) => {
    const block = parseElement($, child);
    if (!block) return;
    if (Array.isArray(block)) children.push(...block);
    else children.push(block);
  });

  return {
    id,
    type: 'section',
    props: { id, pageBreak },
    children,
  };
}

function parseCover($: cheerio.CheerioAPI): BlockNode {
  const cover = $('.cover');
  const brand =
    cover.find('.brand').text().replace(/\s+/g, ' ').trim() ||
    'QLM STRATEGIC RESEARCH';
  const kicker = cover.find('.kicker').text().trim();
  const title = cover.find('h1').text().trim();
  const subtitleUp = cover.find('.subt-up').text().trim();
  const subtitleOr = cover.find('.subt-or').text().trim();
  const subtitleDown = cover.find('.subt-down').text().trim();
  const description = cover.find('.desc').text().trim();
  const about = cover.find('.cover-about p').text().trim();

  const tocContent = ['## Au sommaire', ''];
  cover.find('.cover-toc a').each((_, a) => {
    const num = $(a).find('.n').text().trim();
    const label = $(a).find('span').last().text().trim();
    const href = $(a).attr('href') ?? '';
    tocContent.push(`${num}. [${label}](${href})`);
  });

  const footLeft =
    cover
      .find('.foot > div')
      .first()
      .html()
      ?.replace(/<br\s*\/?>/gi, '<br>') ?? '';
  const footRight = cover.find('.foot > div').last().text().trim();

  const subt = [
    subtitleUp ? `subtitleUp: ${subtitleUp}` : '',
    subtitleOr ? `subtitleOr: ${subtitleOr}` : '',
    subtitleDown ? `subtitleDown: ${subtitleDown}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    id: 'cover',
    type: 'cover',
    children: [
      {
        id: 'cover-brand',
        type: 'brand',
        contentRef: writeSection('cover-brand.md', brand),
      },
      {
        id: 'cover-body',
        type: 'coverBody',
        children: [
          {
            id: 'cover-kicker',
            type: 'paragraph',
            props: { className: 'kicker' },
            contentRef: writeSection('cover-kicker.md', kicker),
          },
          {
            id: 'cover-title',
            type: 'subheading',
            props: { level: 1 },
            contentRef: writeSection('cover-title.md', title),
          },
          {
            id: 'cover-subt',
            type: 'coverSubt',
            contentRef: writeSection('cover-subt.md', subt),
          },
          {
            id: 'cover-desc',
            type: 'paragraph',
            props: { className: 'cover-desc' },
            contentRef: writeSection('cover-desc.md', description),
          },
          {
            id: 'cover-panel',
            type: 'grid',
            props: {
              cols: 2,
              className: 'cover-panel',
              colWidths: [1.15, 1],
              gap: 7,
            },
            children: [
              {
                id: 'cover-about',
                type: 'card',
                props: {
                  variant: 't-ink',
                  title: 'À propos de ce rapport',
                  className: 'cover-panel-block cover-about',
                },
                contentRef: writeSection('cover-about.md', about),
              },
              {
                id: 'cover-toc',
                type: 'flow',
                contentRef: writeSection('cover-toc.md', tocContent.join('\n')),
              },
            ],
          },
          {
            id: 'cover-foot-left',
            type: 'paragraph',
            contentRef: writeSection('cover-foot-left.md', footLeft),
          },
          {
            id: 'cover-foot-right',
            type: 'paragraph',
            props: { className: 'cover-foot-right' },
            contentRef: writeSection('cover-foot-right.md', footRight),
          },
        ],
      },
    ],
  };
}

export type MigrateHtmlOptions = {
  force?: boolean;
  source?: string;
};

export function migrateHtmlToDocs(options: MigrateHtmlOptions = {}): {
  slug: string;
  migrated: boolean;
} {
  const htmlPath = options.source ?? HTML_PATH;
  const docJsonPath = path.join(OUT_DIR, 'document.json');
  const hasContent = fs.existsSync(docJsonPath);

  if (!fs.existsSync(htmlPath)) {
    if (hasContent && !options.force) {
      return { slug: SLUG, migrated: false };
    }
    throw new Error(
      `HTML file not found: ${htmlPath}\nDrop it at: ${HTML_PATH}\nOr pass --source=/path/to/file.html`,
    );
  }

  if (options.force && fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true });
    fs.rmSync(IMG_DIR, { recursive: true, force: true });
    blockCounter = 0;
    imgCounter = 0;
  }

  fs.mkdirSync(SECTIONS_DIR, { recursive: true });
  fs.mkdirSync(IMG_DIR, { recursive: true });

  const html = fs.readFileSync(htmlPath, 'utf-8');
  const $ = cheerio.load(html);

  const blocks: BlockNode[] = [parseCover($)];

  $('section').each((_, section) => {
    blocks.push(parseSection($, section));
  });

  const document: DocDocument = {
    version: 1,
    layoutMode: 'paginated',
    pageFormat: 'a4',
    chrome: {
      headerLeft: 'IA agentique',
      headerRight: 'QLM Strategic Research',
      footerLeft: 'qlm.run',
      footerRight: 'Page {{page}}',
      showOnCover: false,
    },
    blocks,
  };

  const meta = {
    slug: SLUG,
    title: 'IA agentique — QLM Strategic Research',
    locale: 'fr',
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(OUT_DIR, 'document.json'),
    JSON.stringify(document, null, 2),
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'meta.json'),
    JSON.stringify(meta, null, 2),
  );

  console.log(`Parsed HTML → ${OUT_DIR}`);
  console.log(`  Blocks: ${blocks.length} top-level`);
  console.log(
    `  Sections: ${fs.readdirSync(SECTIONS_DIR).length} markdown files`,
  );
  console.log(`  Images: ${imgCounter}`);

  return { slug: SLUG, migrated: true };
}
