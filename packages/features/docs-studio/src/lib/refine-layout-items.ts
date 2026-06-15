import { canBlockSplit, splitBlockContentAtPartCount } from "./block-split";
import { resolveBlockContent } from "./content";
import { splitSplittableParts } from "./content-segments";
import type { LayoutItem } from "./layout-items";
import { replaceItemAt } from "./layout-items";
import { bodyHeightForPageBucket, type PageBodyBudgetContext } from "./page-body-budget";
import { createPageFragment, fragmentItemKey, uniqueLayoutItemKey } from "./page-fragment";
import { itemPackNeed, sectionBottomReserve, sectionTopOverhead } from "./section-pack-overhead";

export interface PackOverflow {
  item: LayoutItem;
  index: number;
  remaining: number;
  itemHeight: number;
}

export function canSubdivideItem(item: LayoutItem, sections: Record<string, string>): boolean {
  if (item.isCover || item.isBreak) return false;
  if (!canBlockSplit(item.block)) return false;
  const content = resolveBlockContent(item.block, sections, item.fragment);
  return splitSplittableParts(content).length > 1;
}

export function findPackOverflow(
  items: LayoutItem[],
  heights: Map<string, number>,
  ctx: PageBodyBudgetContext,
): PackOverflow | null {
  let pageNum = 1;
  let used = 0;
  const bucket: LayoutItem[] = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];

    if (item.isBreak) {
      if (bucket.length > 0) {
        pageNum += 1;
        used = 0;
        bucket.length = 0;
      }
      continue;
    }

    if (item.isCover) {
      if (bucket.length > 0) pageNum += 1;
      used = 0;
      bucket.length = 0;
      continue;
    }

    if (item.forceBreakBefore && bucket.length > 0) {
      pageNum += 1;
      used = 0;
      bucket.length = 0;
    }

    const h = heights.get(item.key) ?? 0;
    const bodyHeightPx = bodyHeightForPageBucket(ctx, pageNum, bucket);

    if (h >= bodyHeightPx) {
      return { item, index, remaining: bodyHeightPx, itemHeight: h };
    }

    if (bucket.length > 0 && used + itemPackNeed(item, bucket, h) > bodyHeightPx) {
      const remaining = bodyHeightPx - used - sectionBottomReserve(bucket);
      if (remaining > 0) {
        return { item, index, remaining, itemHeight: h };
      }
      pageNum += 1;
      used = 0;
      bucket.length = 0;
    }

    const topPad = sectionTopOverhead(item, bucket);
    bucket.push(item);
    used += topPad + h;
  }

  return null;
}

export function subdivideItemForHeight(
  item: LayoutItem,
  sections: Record<string, string>,
  targetHeight: number,
  itemHeight: number,
  measurePartHeight?: (partCount: number) => number,
  reservedKeys?: ReadonlySet<string>,
): LayoutItem[] {
  const content = resolveBlockContent(item.block, sections, item.fragment);
  const parts = splitSplittableParts(content).length;
  if (parts <= 1) return [item];

  let partCount: number;

  if (measurePartHeight) {
    let lo = 1;
    let hi = parts - 1;
    let best = 1;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const h = measurePartHeight(mid);
      if (h <= targetHeight) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    partCount = best;
  } else {
    const ratio = Math.min(0.95, Math.max(0.05, targetHeight / itemHeight));
    partCount = Math.max(1, Math.min(parts - 1, Math.ceil(parts * ratio)));
  }

  const [first, rest] = splitBlockContentAtPartCount(content, partCount);
  if (!rest.trim()) return [item];

  const blockId = item.block.id;
  const baseIndex = item.fragment?.index ?? 0;
  const newTotal = item.fragment ? item.fragment.total + 1 : 2;

  const keys = new Set(reservedKeys);
  keys.delete(item.key);
  const secondKey = uniqueLayoutItemKey(fragmentItemKey(blockId, baseIndex + 1), keys);

  return [
    {
      ...item,
      key: item.key,
      fragment: createPageFragment(blockId, baseIndex, newTotal, first),
    },
    {
      ...item,
      key: secondKey,
      fragment: createPageFragment(blockId, baseIndex + 1, newTotal, rest),
    },
  ];
}

export function refineItemsOnce(
  items: LayoutItem[],
  heights: Map<string, number>,
  ctx: PageBodyBudgetContext,
  sections: Record<string, string>,
  measurePartHeight?: (item: LayoutItem, partCount: number) => number,
): LayoutItem[] | null {
  const overflow = findPackOverflow(items, heights, ctx);
  if (!overflow || !canSubdivideItem(overflow.item, sections)) return null;

  const split = subdivideItemForHeight(
    overflow.item,
    sections,
    overflow.remaining,
    overflow.itemHeight,
    measurePartHeight
      ? (partCount) => measurePartHeight(overflow.item, partCount)
      : undefined,
    new Set(items.map((entry) => entry.key)),
  );
  if (split.length <= 1) return null;

  return replaceItemAt(items, overflow.index, split);
}
