import type { BlockPageFragment } from './page-fragment';
import type { LayoutItem } from './layout-items';
import { getSectionChildWidthPx } from './page-metrics';
import type { BlockNode } from './types';

export function blocksForItemMeasure(item: LayoutItem): BlockNode[] {
  if (!item.section) return [item.block];

  return [
    {
      id: item.section.id,
      type: 'section',
      props: {
        id: item.section.id,
        pageBreak: item.section.pageBreak,
        continuation: item.section.continuation,
      },
      children: [item.block],
    },
  ];
}

export function itemMeasureWidthPx(
  item: LayoutItem,
  pageContentWidthPx: number,
): number {
  return item.section
    ? getSectionChildWidthPx(pageContentWidthPx)
    : pageContentWidthPx;
}

export function fragmentsForItemMeasure(
  item: LayoutItem,
): Record<string, BlockPageFragment> | undefined {
  if (!item.fragment) return undefined;
  return { [item.block.id]: item.fragment };
}

export function fragmentsForPartMeasure(
  item: LayoutItem,
  partContent: string,
): Record<string, BlockPageFragment> {
  return {
    [item.block.id]: {
      blockId: item.block.id,
      index: 0,
      total: 2,
      content: partContent,
    },
  };
}
