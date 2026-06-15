import { describe, expect, it } from 'vitest';

import { importHtml } from './html-import';
import { resolveImportAssetPaths } from './resolve-asset-paths';
import { slugify } from './slugify';
import { IMPORT_ASSET_PREFIX } from './types';

function findBlocksByType(
  blocks: Array<{ type: string; children?: unknown[] }>,
  type: string,
) {
  const found: Array<{
    type: string;
    content?: string;
    props?: Record<string, unknown>;
  }> = [];
  for (const block of blocks) {
    if (block.type === type)
      found.push(
        block as {
          type: string;
          content?: string;
          props?: Record<string, unknown>;
        },
      );
    if (block.children) {
      found.push(
        ...findBlocksByType(
          block.children as Array<{ type: string; children?: unknown[] }>,
          type,
        ),
      );
    }
  }
  return found;
}

describe('slugify', () => {
  it('normalizes titles into URL-safe slugs', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
    expect(slugify('  État des lieux  ')).toBe('etat-des-lieux');
  });
});

describe('importHtml', () => {
  it('maps headings, paragraphs, lists, tables, quotes, and images', () => {
    const html = `<!DOCTYPE html>
<html>
<head><title>Sample Report</title></head>
<body>
  <h1>Main Title</h1>
  <p>Intro paragraph with <strong>bold</strong>.</p>
  <h2>Section Two</h2>
  <ul><li>First item</li><li>Second item</li></ul>
  <blockquote>A quoted line</blockquote>
  <table>
    <tr><th>A</th><th>B</th></tr>
    <tr><td>1</td><td>2</td></tr>
  </table>
  <img alt="Chart" src="data:image/png;base64,iVBORw0KGgo=" />
  <script>alert('x')</script>
</body>
</html>`;

    const result = importHtml(html, 'sample.html');
    expect(result.title).toBe('Sample Report');
    expect(result.assets).toHaveLength(1);

    const openers = findBlocksByType(result.document.blocks, 'opener');
    const subheadings = findBlocksByType(result.document.blocks, 'subheading');
    const paragraphs = findBlocksByType(result.document.blocks, 'paragraph');
    const quotes = findBlocksByType(result.document.blocks, 'quote');
    const tables = findBlocksByType(result.document.blocks, 'table');
    const figures = findBlocksByType(result.document.blocks, 'figure');

    expect(openers[0]?.content).toBe('Main Title');
    expect(subheadings[0]?.content).toBe('Section Two');
    expect(
      paragraphs.some((block) => block.content?.includes('Intro paragraph')),
    ).toBe(true);
    expect(
      paragraphs.some((block) => block.content?.includes('- First item')),
    ).toBe(true);
    expect(quotes[0]?.content).toBe('A quoted line');
    expect(tables[0]?.content).toContain('A | B');
    expect(figures[0]?.content).toContain(`${IMPORT_ASSET_PREFIX}figure-1.png`);
  });

  it('falls back to filename when title and h1 are missing', () => {
    const result = importHtml(
      '<html><body><p>Only text</p></body></html>',
      'my-report.html',
    );
    expect(result.title).toBe('my report');
  });

  it('creates a starter page for empty bodies', () => {
    const result = importHtml('<html><body></body></html>', 'empty.html');
    expect(result.document.blocks.length).toBeGreaterThan(0);
  });
});

describe('resolveImportAssetPaths', () => {
  it('rewrites import asset placeholders to public doc paths', () => {
    const blocks = resolveImportAssetPaths(
      [
        {
          id: 'figure-1',
          type: 'figure',
          content: `src: ${IMPORT_ASSET_PREFIX}figure-1.png\ncaption: Chart`,
        },
      ],
      'sample-doc',
    );

    expect(blocks[0]?.content).toContain('src: /docs/sample-doc/figure-1.png');
  });
});
