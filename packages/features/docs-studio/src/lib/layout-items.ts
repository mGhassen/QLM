import { breakVariantToSectionProps, type BreakVariant } from './breaks';
import { pageFragmentKey, type BlockPageFragment } from './page-fragment';
import { isCoverSection } from './section-variant';
import type { BlockNode } from './types';

export interface SectionContext {
  id: string;
  pageBreak?: boolean;
  continuation?: boolean;
}

/** One row in the pagination flow — references the real document block, optional virtual page slice. */
export interface LayoutItem {
  key: string;
  block: BlockNode;
  fragment?: BlockPageFragment;
  section?: SectionContext;
  sourcePageId?: string;
  forceBreakBefore?: boolean;
  isCover?: boolean;
  isBreak?: boolean;
}

export interface PackedPage {
  blocks: BlockNode[];
  fragments: Record<string, BlockPageFragment>;
  sourcePageId?: string;
  isContinuation?: boolean;
}

function layoutItemKey(blockId: string, fragmentIndex?: number): string {
  return fragmentIndex != null ? `${blockId}#${fragmentIndex}` : blockId;
}

function sectionContext(
  section: BlockNode,
  sliceIndex: number,
  breakVariant?: BreakVariant,
): SectionContext {
  const isFirst = sliceIndex === 0;
  const breakProps = breakVariantToSectionProps(breakVariant);

  return {
    id: section.id,
    pageBreak: isFirst
      ? (breakProps.pageBreak ??
        (section.props?.pageBreak as boolean | undefined))
      : false,
    continuation: isFirst
      ? breakProps.continuation
      : (breakProps.continuation ?? true),
  };
}

function sectionToItems(
  section: BlockNode,
  breakBefore: boolean,
  sourcePageId?: string,
): LayoutItem[] {
  if (isCoverSection(section)) {
    return [
      {
        key: section.id,
        block: section,
        sourcePageId,
        forceBreakBefore: breakBefore,
        isCover: true,
      },
    ];
  }

  const children = section.children ?? [];

  if (children.length === 0) {
    return [
      {
        key: section.id,
        block: section,
        sourcePageId,
        forceBreakBefore: breakBefore,
      },
    ];
  }

  const items: LayoutItem[] = [];
  let forceNext = breakBefore;
  let nextVariant: BreakVariant | undefined;
  let sliceIndex = 0;

  for (const child of children) {
    if (child.type === 'break') {
      items.push({
        key: `break:${child.id}`,
        block: child,
        isBreak: true,
        sourcePageId,
      });
      forceNext = true;
      nextVariant = (child.props?.variant as BreakVariant) ?? 'page';
      continue;
    }

    items.push({
      key: layoutItemKey(child.id),
      block: child,
      section: sectionContext(section, sliceIndex, nextVariant),
      sourcePageId,
      forceBreakBefore: forceNext,
    });
    forceNext = false;
    nextVariant = undefined;
    sliceIndex += 1;
  }

  return items;
}

function pageToItems(page: BlockNode, breakBefore: boolean): LayoutItem[] {
  const items: LayoutItem[] = [];
  let forceNext = breakBefore;
  const sourcePageId = page.id;

  for (const child of page.children ?? []) {
    if (child.type === 'break') {
      items.push({
        key: `break:${child.id}`,
        block: child,
        isBreak: true,
        sourcePageId,
      });
      forceNext = true;
      continue;
    }

    if (child.type === 'section') {
      const sectionItems = sectionToItems(child, forceNext, sourcePageId);
      items.push(...sectionItems);
      forceNext = false;
      continue;
    }

    items.push({
      key: child.id,
      block: child,
      sourcePageId,
      forceBreakBefore: forceNext,
    });
    forceNext = false;
  }

  return items;
}

export function blocksToLayoutItems(blocks: BlockNode[]): LayoutItem[] {
  const items: LayoutItem[] = [];
  let pendingVariant: BreakVariant | undefined;
  const hasPages = blocks.some((b) => b.type === 'page');

  for (const block of blocks) {
    if (block.type === 'break') {
      items.push({ key: `break:${block.id}`, block, isBreak: true });
      pendingVariant = (block.props?.variant as BreakVariant) ?? 'page';
      continue;
    }

    if (block.type === 'page') {
      const pageItems = pageToItems(block, true);
      if (pendingVariant && pageItems.length > 0 && !pageItems[0].isBreak) {
        pageItems[0].forceBreakBefore = true;
        const ctx = pageItems[0].section;
        if (ctx) {
          const breakProps = breakVariantToSectionProps(pendingVariant);
          pageItems[0].section = { ...ctx, ...breakProps };
        }
      }
      pendingVariant = undefined;
      items.push(...pageItems);
      continue;
    }

    if (block.type === 'cover') {
      pendingVariant = undefined;
      items.push({
        key: block.id,
        block,
        isCover: true,
        forceBreakBefore: true,
      });
      continue;
    }

    if (block.type === 'section') {
      const sectionItems = sectionToItems(
        block,
        hasPages ? false : !!block.props?.pageBreak,
      );
      if (
        pendingVariant &&
        sectionItems.length > 0 &&
        !sectionItems[0].isBreak
      ) {
        sectionItems[0].forceBreakBefore = true;
        const ctx = sectionItems[0].section;
        if (ctx) {
          const breakProps = breakVariantToSectionProps(pendingVariant);
          sectionItems[0].section = { ...ctx, ...breakProps };
        }
      }
      pendingVariant = undefined;
      items.push(...sectionItems);
      continue;
    }

    items.push({
      key: block.id,
      block,
      forceBreakBefore: items.length > 0 || !!pendingVariant,
    });
    pendingVariant = undefined;
  }

  return items;
}

export function assemblePackedPage(items: LayoutItem[]): PackedPage {
  const blocks: BlockNode[] = [];
  const fragments: Record<string, BlockPageFragment> = {};
  let currentSection: BlockNode | null = null;
  let currentSectionId: string | null = null;
  const sourcePageId = items.find((item) => item.sourcePageId)?.sourcePageId;

  const flushSection = () => {
    if (currentSection) {
      blocks.push(currentSection);
      currentSection = null;
      currentSectionId = null;
    }
  };

  const blockOccurrence = new Map<string, number>();

  for (const item of items) {
    if (item.fragment) {
      const blockId = item.block.id;
      const occ = blockOccurrence.get(blockId) ?? 0;
      blockOccurrence.set(blockId, occ + 1);
      fragments[pageFragmentKey(blockId, occ)] = item.fragment;
    }

    if (item.isBreak) {
      flushSection();
      blocks.push(item.block);
      continue;
    }

    if (item.isCover) {
      flushSection();
      blocks.push(item.block);
      continue;
    }

    if (item.section) {
      if (currentSectionId !== item.section.id) {
        flushSection();
        currentSectionId = item.section.id;
        currentSection = {
          id: item.section.id,
          type: 'section',
          props: {
            id: item.section.id,
            pageBreak: item.section.pageBreak,
            continuation: item.section.continuation,
          },
          children: [],
        };
      }
      currentSection!.children = [
        ...(currentSection!.children ?? []),
        item.block,
      ];
      continue;
    }

    flushSection();
    blocks.push(item.block);
  }

  flushSection();
  return { blocks, fragments, sourcePageId };
}

export function replaceItemAt(
  items: LayoutItem[],
  index: number,
  replacements: LayoutItem[],
): LayoutItem[] {
  return [...items.slice(0, index), ...replacements, ...items.slice(index + 1)];
}

export function layoutItemsEqual(a: LayoutItem[], b: LayoutItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].key !== b[i].key) return false;
    if (a[i].fragment?.content !== b[i].fragment?.content) return false;
  }
  return true;
}

export function layoutStructureKey(items: LayoutItem[]): string {
  return items.map((item) => item.key).join('\0');
}

export function syncItemBlocks(
  items: LayoutItem[],
  blocks: BlockNode[],
): LayoutItem[] {
  const blockById = new Map<string, BlockNode>();
  const walk = (nodes: BlockNode[]) => {
    for (const node of nodes) {
      blockById.set(node.id, node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(blocks);

  return items.map((item) => {
    const block = blockById.get(item.block.id);
    return block ? { ...item, block } : item;
  });
}

export function syncPackedPageBlocks(
  pages: PackedPage[],
  blocks: BlockNode[],
): PackedPage[] {
  const blockById = new Map<string, BlockNode>();
  const walk = (nodes: BlockNode[]) => {
    for (const node of nodes) {
      blockById.set(node.id, node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(blocks);

  const syncBlock = (node: BlockNode): BlockNode => {
    const fresh = blockById.get(node.id);
    if (!fresh) return node;
    if (node.children?.length) {
      const children = node.children.map(syncBlock);
      if (
        fresh === node &&
        children.every((child, i) => child === node.children![i])
      ) {
        return node;
      }
      return { ...fresh, children };
    }
    return fresh === node ? node : fresh;
  };

  let anyChanged = false;
  const nextPages = pages.map((page) => {
    let pageChanged = false;
    const nextBlocks = page.blocks.map((block) => {
      const synced = syncBlock(block);
      if (synced !== block) pageChanged = true;
      return synced;
    });
    if (pageChanged) anyChanged = true;
    return pageChanged ? { ...page, blocks: nextBlocks } : page;
  });
  return anyChanged ? nextPages : pages;
}

function packedPageBlocksKey(blocks: BlockNode[]): string {
  const walk = (nodes: BlockNode[]): string =>
    nodes
      .map((node) => {
        const childKey = node.children?.length
          ? `(${walk(node.children)})`
          : '';
        return `${node.id}${childKey}`;
      })
      .join(',');
  return walk(blocks);
}

export function packedPagesEqual(a: PackedPage[], b: PackedPage[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ap = a[i];
    const bp = b[i];
    if (ap.sourcePageId !== bp.sourcePageId) return false;
    if (ap.isContinuation !== bp.isContinuation) return false;
    if (packedPageBlocksKey(ap.blocks) !== packedPageBlocksKey(bp.blocks))
      return false;
    const aKeys = Object.keys(ap.fragments).sort();
    const bKeys = Object.keys(bp.fragments).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (let k = 0; k < aKeys.length; k++) {
      if (aKeys[k] !== bKeys[k]) return false;
      const af = ap.fragments[aKeys[k]];
      const bf = bp.fragments[bKeys[k]];
      if (
        af.content !== bf.content ||
        af.index !== bf.index ||
        af.total !== bf.total
      ) {
        return false;
      }
    }
  }
  return true;
}
