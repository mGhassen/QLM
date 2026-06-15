import { generateId } from './serialize';
import { isCoverPageBlock, isCoverSection } from './section-variant';
import type { BlockNode } from './types';

function hasPageBlocks(blocks: BlockNode[]): boolean {
  return blocks.some((b) => b.type === 'page');
}

function coverBlockToPage(cover: BlockNode): BlockNode {
  return {
    id: generateId('page'),
    type: 'page',
    children: [
      {
        id: cover.id || generateId('section'),
        type: 'section',
        props: {
          ...(cover.props ?? {}),
          id: (cover.props?.id as string) ?? 'cover',
          variant: 'cover',
        },
        children: cover.children ?? [],
      },
    ],
  };
}

function wrapLegacyContent(blocks: BlockNode[]): BlockNode[] {
  const result: BlockNode[] = [];
  let pendingSections: BlockNode[] = [];

  const flushPage = () => {
    if (pendingSections.length === 0) return;
    result.push({
      id: generateId('page'),
      type: 'page',
      children: pendingSections,
    });
    pendingSections = [];
  };

  for (const block of blocks) {
    if (block.type === 'cover') {
      flushPage();
      result.push(coverBlockToPage(block));
      continue;
    }

    if (block.type === 'section') {
      pendingSections.push(block);
      continue;
    }

    if (block.type === 'break') {
      if (pendingSections.length > 0) {
        const last = pendingSections[pendingSections.length - 1];
        pendingSections[pendingSections.length - 1] = {
          ...last,
          children: [...(last.children ?? []), block],
        };
      } else {
        flushPage();
        result.push({
          id: generateId('page'),
          type: 'page',
          children: [
            {
              id: generateId('section'),
              type: 'section',
              props: { id: generateId('section') },
              children: [block],
            },
          ],
        });
      }
      continue;
    }

    if (pendingSections.length === 0) {
      pendingSections.push({
        id: generateId('section'),
        type: 'section',
        props: { id: generateId('section') },
        children: [],
      });
    }
    const last = pendingSections[pendingSections.length - 1];
    pendingSections[pendingSections.length - 1] = {
      ...last,
      children: [...(last.children ?? []), block],
    };
  }

  flushPage();
  return result;
}

function migrateRootLegacy(blocks: BlockNode[]): BlockNode[] {
  const pages = blocks.filter((b) => b.type === 'page');
  const legacy = blocks.filter((b) => b.type !== 'page');
  if (legacy.length === 0) return blocks;
  const wrapped = wrapLegacyContent(legacy);
  return ensureCoverPageFirst([...pages, ...wrapped]);
}

export function ensurePageModel(blocks: BlockNode[]): BlockNode[] {
  if (blocks.length === 0) return blocks;

  if (hasPageBlocks(blocks)) {
    return migrateRootLegacy(blocks);
  }

  return ensureCoverPageFirst(wrapLegacyContent(blocks));
}

export function ensureCoverPageFirst(blocks: BlockNode[]): BlockNode[] {
  const coverIdx = blocks.findIndex(
    (b) => b.type === 'page' && isCoverPageBlock(b),
  );
  if (coverIdx <= 0) return blocks;
  const result = [...blocks];
  const [coverPage] = result.splice(coverIdx, 1);
  result.unshift(coverPage);
  return result;
}

export { isCoverSection };
