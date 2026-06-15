import {
  canMoveBlock,
  moveBlockRelativeTo,
  moveInDocumentOrder,
} from './block-order';
import { ensureCoverFirst } from './cover';
import { createBlock, findBlockById, insertBlockRelative } from './serialize';
import { createCoverPageBlock, createStarterPage } from './studio-document';
import { isCoverPageBlock } from './section-variant';
import type { BlockNode } from './types';

export function pageInsertAnchor(pageBlocks: BlockNode[]): string | null {
  if (pageBlocks.length === 0) return null;

  for (let i = pageBlocks.length - 1; i >= 0; i--) {
    const block = pageBlocks[i];
    if (block.type === 'page') return block.id;
    if (block.type === 'section' || block.type === 'cover') {
      const children = block.children ?? [];
      for (let j = children.length - 1; j >= 0; j--) {
        if (children[j].type !== 'break') return children[j].id;
      }
      return block.id;
    }
    if (block.type !== 'break') return block.id;
  }

  return pageBlocks[pageBlocks.length - 1]?.id ?? null;
}

function focusIdForPage(page: BlockNode): string {
  const section = page.children?.find((c) => c.type === 'section');
  if (!section) return page.id;
  return section.children?.[0]?.id ?? section.id;
}

export function insertPageAfter(
  blocks: BlockNode[],
  afterPageId: string | null,
): {
  blocks: BlockNode[];
  focusId: string;
} {
  const newPage = createStarterPage();
  if (!afterPageId) {
    return {
      blocks: ensureCoverFirst([...blocks, newPage]),
      focusId: focusIdForPage(newPage),
    };
  }

  const newBlocks = insertBlockRelative(blocks, afterPageId, newPage, 'after');
  return {
    blocks: ensureCoverFirst(newBlocks),
    focusId: focusIdForPage(newPage),
  };
}

export function insertSectionInPage(
  blocks: BlockNode[],
  pageId: string,
): {
  blocks: BlockNode[];
  focusId: string;
} {
  const section = createBlock('section');
  const newBlocks = insertBlockRelative(blocks, pageId, section, 'inside');
  return {
    blocks: ensureCoverFirst(newBlocks),
    focusId: focusIdForSection(section),
  };
}

function createEmptySection(): BlockNode {
  return createBlock('section', {
    children: [createBlock('paragraph')],
  });
}

function focusIdForSection(section: BlockNode): string {
  return section.children?.[0]?.id ?? section.id;
}

function insertNewSectionAtPageEnd(
  blocks: BlockNode[],
  pageBlocks: BlockNode[],
  anchorId: string | null,
): { blocks: BlockNode[]; focusId: string } {
  const pageBlock = pageBlocks.find((b) => b.type === 'page');
  if (pageBlock) {
    const section = createEmptySection();
    const newBlocks = insertBlockRelative(
      blocks,
      pageBlock.id,
      section,
      'inside',
    );
    return {
      blocks: ensureCoverFirst(newBlocks),
      focusId: focusIdForSection(section),
    };
  }

  if (!anchorId) {
    const page = createStarterPage();
    return {
      blocks: ensureCoverFirst([...blocks, page]),
      focusId: focusIdForPage(page),
    };
  }

  const anchor = findBlockById(blocks, anchorId);
  const pageId = anchor ? findParentPageId(blocks, anchorId) : null;
  if (pageId) {
    const section = createEmptySection();
    const newBlocks = insertBlockRelative(blocks, pageId, section, 'inside');
    return {
      blocks: ensureCoverFirst(newBlocks),
      focusId: focusIdForSection(section),
    };
  }

  const section = createEmptySection();
  return {
    blocks: insertBlockRelative(blocks, anchorId, section, 'after'),
    focusId: focusIdForSection(section),
  };
}

export function findParentPageId(
  blocks: BlockNode[],
  childId: string,
  parentId: string | null = null,
): string | null {
  for (const block of blocks) {
    if (block.id === childId) return parentId;
    if (block.children) {
      const nextParent = block.type === 'page' ? block.id : parentId;
      const found = findParentPageId(block.children, childId, nextParent);
      if (found) return found;
    }
  }
  return null;
}

export function insertAtPageEnd(
  blocks: BlockNode[],
  pageBlocks: BlockNode[],
  newBlock: BlockNode,
): { blocks: BlockNode[]; focusId: string } {
  if (newBlock.type === 'page') {
    const anchor = pageInsertAnchor(pageBlocks);
    return insertPageAfter(blocks, anchor);
  }

  if (newBlock.type === 'section') {
    return insertNewSectionAtPageEnd(
      blocks,
      pageBlocks,
      pageInsertAnchor(pageBlocks),
    );
  }

  const anchor = pageInsertAnchor(pageBlocks);
  if (!anchor) {
    const page = createStarterPage();
    const withPage = ensureCoverFirst([...blocks, page]);
    const sectionId = page.children?.[0]?.id;
    if (!sectionId) return { blocks: withPage, focusId: page.id };
    const nested = insertBlockRelative(withPage, sectionId, newBlock, 'inside');
    return { blocks: nested, focusId: newBlock.id };
  }

  return {
    blocks: insertBlockRelative(blocks, anchor, newBlock, 'after'),
    focusId: newBlock.id,
  };
}

export function insertCoverPage(blocks: BlockNode[]): {
  blocks: BlockNode[];
  focusId: string;
} {
  const withoutCover = blocks.filter(
    (b) => !(b.type === 'page' && isCoverPageBlock(b)) && b.type !== 'cover',
  );
  const coverPage = createCoverPageBlock();
  return {
    blocks: ensureCoverFirst([coverPage, ...withoutCover]),
    focusId: coverPage.children?.[0]?.children?.[0]?.id ?? coverPage.id,
  };
}

export function collectPageBlockIds(pageBlocks: BlockNode[]): string[] {
  const ids: string[] = [];

  for (const block of pageBlocks) {
    if (block.type === 'break') continue;

    if (block.type === 'page') {
      for (const child of block.children ?? []) {
        if (child.type === 'section') {
          for (const grand of child.children ?? []) {
            if (grand.type !== 'break') ids.push(grand.id);
          }
        } else if (child.type !== 'break') {
          ids.push(child.id);
        }
      }
      continue;
    }

    if (block.type === 'section') {
      for (const child of block.children ?? []) {
        if (child.type !== 'break') ids.push(child.id);
      }
      continue;
    }

    ids.push(block.id);
  }

  return ids;
}

export function findBlockPageIndex(
  pages: BlockNode[][],
  blockId: string,
): number {
  return pages.findIndex((page) => collectPageBlockIds(page).includes(blockId));
}

export function moveBlockAcrossPages(
  blocks: BlockNode[],
  pages: BlockNode[][],
  blockId: string,
  direction: 'up' | 'down',
): BlockNode[] {
  const pageIndex = findBlockPageIndex(pages, blockId);
  if (pageIndex === -1) return moveInDocumentOrder(blocks, blockId, direction);

  const pageIds = collectPageBlockIds(pages[pageIndex]);
  const posOnPage = pageIds.indexOf(blockId);
  if (posOnPage === -1) return moveInDocumentOrder(blocks, blockId, direction);

  const isFirstOnPage = posOnPage === 0;
  const isLastOnPage = posOnPage === pageIds.length - 1;

  if (direction === 'up' && isFirstOnPage && pageIndex > 0) {
    const prevIds = collectPageBlockIds(pages[pageIndex - 1]);
    const anchor = prevIds[prevIds.length - 1];
    if (anchor && anchor !== blockId) {
      return moveBlockRelativeTo(blocks, blockId, anchor, 'after');
    }
  }

  if (direction === 'down' && isLastOnPage && pageIndex < pages.length - 1) {
    const nextIds = collectPageBlockIds(pages[pageIndex + 1]);
    const anchor = nextIds[0];
    if (anchor && anchor !== blockId) {
      return moveBlockRelativeTo(blocks, blockId, anchor, 'before');
    }
  }

  return moveInDocumentOrder(blocks, blockId, direction);
}

export function moveBlockToPage(
  blocks: BlockNode[],
  pages: BlockNode[][],
  blockId: string,
  targetPageIndex: number,
  position: 'start' | 'end',
): BlockNode[] {
  if (targetPageIndex < 0 || targetPageIndex >= pages.length) return blocks;

  const targetIds = collectPageBlockIds(pages[targetPageIndex]);
  if (targetIds.length === 0) return blocks;

  if (position === 'start') {
    const anchor = targetIds[0];
    if (anchor === blockId) return blocks;
    return moveBlockRelativeTo(blocks, blockId, anchor, 'before');
  }

  const anchor = targetIds[targetIds.length - 1];
  if (anchor === blockId) return blocks;
  return moveBlockRelativeTo(blocks, blockId, anchor, 'after');
}

export function canMoveBlockOnPages(
  blocks: BlockNode[],
  pages: BlockNode[][],
  id: string,
  direction: 'up' | 'down',
): boolean {
  const pageIndex = findBlockPageIndex(pages, id);
  if (pageIndex !== -1) {
    const pageIds = collectPageBlockIds(pages[pageIndex]);
    const posOnPage = pageIds.indexOf(id);
    if (posOnPage !== -1) {
      if (direction === 'up' && posOnPage === 0 && pageIndex > 0) return true;
      if (
        direction === 'down' &&
        posOnPage === pageIds.length - 1 &&
        pageIndex < pages.length - 1
      ) {
        return true;
      }
    }
  }

  return canMoveBlock(blocks, id, direction);
}

function scrollNearestInContainer(el: Element, container: Element) {
  const er = el.getBoundingClientRect();
  const cr = container.getBoundingClientRect();

  if (er.top >= cr.top && er.bottom <= cr.bottom) return;

  if (er.height > cr.height) {
    if (er.bottom > cr.top && er.top < cr.bottom) return;
    if (er.bottom <= cr.top) container.scrollTop += er.top - cr.top;
    else if (er.top >= cr.bottom) container.scrollTop += er.bottom - cr.bottom;
    return;
  }

  if (er.top < cr.top) container.scrollTop += er.top - cr.top;
  else if (er.bottom > cr.bottom) container.scrollTop += er.bottom - cr.bottom;
}

export function scrollBlockIntoView(blockId: string) {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(
      `[data-block-id="${blockId}"]`,
    );
    if (!el) return;
    const canvas = document.querySelector<HTMLElement>('.studio-canvas');
    if (canvas) scrollNearestInContainer(el, canvas);
    else el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  });
}

export function scrollTreeItemIntoView(treeId: string) {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(
      `[data-tree-id="${treeId}"]`,
    );
    if (!el) return;
    const panel = el.closest<HTMLElement>('[data-tree-scroll]');
    if (panel) scrollNearestInContainer(el, panel);
    else el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  });
}
