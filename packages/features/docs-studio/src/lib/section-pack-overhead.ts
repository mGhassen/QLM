import type { FlowUnit } from './flow-units';
import type { LayoutItem } from './layout-items';
import { mmToPx } from './page-metrics';

export const SECTION_BOTTOM_PAD_PX = mmToPx(6);
export const SECTION_BREAK_TOP_PX = mmToPx(22);

export function itemSectionId(item: LayoutItem): string | null {
  return item.section?.id ?? null;
}

export function sectionBottomReserve(bucket: LayoutItem[]): number {
  return bucket.some((item) => itemSectionId(item)) ? SECTION_BOTTOM_PAD_PX : 0;
}

export function sectionTopOverhead(
  item: LayoutItem,
  bucket: LayoutItem[],
): number {
  if (bucket.length > 0) return 0;
  if (!item.section) return 0;
  if (item.section.pageBreak && !item.section.continuation) {
    return SECTION_BREAK_TOP_PX;
  }
  return 0;
}

export function itemPackNeed(
  item: LayoutItem,
  bucket: LayoutItem[],
  height: number,
): number {
  return (
    sectionTopOverhead(item, bucket) + height + sectionBottomReserve(bucket)
  );
}

export function unitPackNeed(
  unit: FlowUnit,
  bucket: FlowUnit[],
  height: number,
): number {
  return itemPackNeed(
    unit as unknown as LayoutItem,
    bucket as unknown as LayoutItem[],
    height,
  );
}
