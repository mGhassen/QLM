import { describe, expect, it, vi } from 'vitest';

import type { BlockNode } from '../types';
import { importPdf } from './pdf-import';

vi.mock('pdf-parse', () => ({
  default: vi.fn(async () => ({
    text: 'First paragraph line\n\nSecond paragraph line',
    info: { Title: 'PDF Title' },
  })),
}));

describe('importPdf', () => {
  it('creates paragraph blocks from extracted text', async () => {
    const result = await importPdf(Buffer.from('fake'), 'report.pdf');

    expect(result.title).toBe('PDF Title');
    expect(result.document.blocks.length).toBeGreaterThan(0);

    const paragraphs = result.document.blocks.flatMap((page: BlockNode) =>
      (page.children ?? []).flatMap(
        (section: BlockNode) => section.children ?? [],
      ),
    );

    expect(
      paragraphs.some((block: BlockNode) => block.type === 'paragraph'),
    ).toBe(true);
    expect(
      paragraphs.some((block: BlockNode) =>
        block.content?.includes('First paragraph line'),
      ),
    ).toBe(true);
  });
});
