import { collectPageBlockIds } from './page-blocks';
import { parseBodyToSegments, type BodySegment } from './body-segments';
import { createBlock } from './serialize';
import type { BlockNode } from './types';

function segmentToMarkdown(seg: BodySegment): string {
  if (seg.kind === 'break') {
    const variant = (seg.block.props?.variant as string) ?? 'page';
    return `{% break variant="${variant}" /%}`;
  }
  if (seg.kind === 'design') {
    const block = createBlock(seg.block.type, {
      content: seg.markdown,
      props: seg.block.props,
    });
    const props = block.props ?? {};
    const attrStr = Object.entries(props)
      .filter(([k]) => k !== 'id')
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    return `{% ${block.type}${attrStr ? ` ${attrStr}` : ''} %}\n${block.content ?? seg.markdown}\n{% /${block.type} %}`;
  }
  return seg.markdown;
}

export function blockToBodyMarkdown(block: BlockNode): string {
  if (block.type === 'break') {
    const variant = (block.props?.variant as string) ?? 'page';
    return `{% break variant="${variant}" /%}`;
  }
  const created = createBlock(block.type, {
    content: block.content,
    props: block.props,
    children: block.children,
  });
  if (
    created.type === 'paragraph' ||
    created.type === 'subheading' ||
    created.type === 'quote'
  ) {
    return created.content ?? '';
  }
  const props = created.props ?? {};
  const attrStr = Object.entries(props)
    .filter(([k]) => k !== 'id')
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  return `{% ${created.type}${attrStr ? ` ${attrStr}` : ''} %}\n${created.content ?? ''}\n{% /${created.type} %}`;
}

export function insertAfterPageInBody(
  body: string,
  pages: BlockNode[][],
  pageIndex: number,
  insertion: string,
): string {
  const trimmed = insertion.trim();
  if (!trimmed) return body;

  const segments = parseBodyToSegments(body);
  if (segments.length === 0) return trimmed;

  const pageBlocks = pages[pageIndex] ?? [];
  const idsOnPage = collectPageBlockIds(pageBlocks);

  if (idsOnPage.length === 0) {
    return body.trim() ? `${body.trim()}\n\n${trimmed}` : trimmed;
  }

  const lastId = idsOnPage[idsOnPage.length - 1];
  let insertAfterIdx = -1;
  for (let i = 0; i < segments.length; i++) {
    const segId = segments[i].block.id;
    if (
      segId === lastId ||
      lastId.startsWith(segId) ||
      segId.startsWith(lastId)
    ) {
      insertAfterIdx = i;
    }
  }

  if (insertAfterIdx === -1) {
    return body.trim() ? `${body.trim()}\n\n${trimmed}` : trimmed;
  }

  const parts = segments.map(segmentToMarkdown);
  parts.splice(insertAfterIdx + 1, 0, trimmed);
  return parts.filter((part) => part.trim()).join('\n\n');
}
