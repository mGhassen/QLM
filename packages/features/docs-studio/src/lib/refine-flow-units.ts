import { resolveBlockContent } from './content';
import { splitSplittableParts } from './content-segments';
import {
  makeSegmentUnit,
  replaceUnitAt,
  splittablePartCount,
  splitContentAtPartCount,
} from './flow-unit-segments';
import type { FlowUnit } from './flow-units';
import {
  sectionBottomReserve,
  sectionTopOverhead,
  unitPackNeed,
} from './section-pack-overhead';
import { getSplittableChild, isSplittableBlockType } from './splittable';

export interface PackOverflow {
  unit: FlowUnit;
  index: number;
  remaining: number;
  unitHeight: number;
}

export function canSubdivideUnit(
  unit: FlowUnit,
  sections: Record<string, string>,
): boolean {
  if (unit.isCover || unit.isBreak) return false;
  const child = getSplittableChild(unit.blocks[0]);
  if (!child || !isSplittableBlockType(child.type)) return false;
  return splittablePartCount(unit, sections) > 1;
}

export function findPackOverflow(
  units: FlowUnit[],
  heights: Map<string, number>,
  bodyHeightPx: number,
): PackOverflow | null {
  let used = 0;
  const bucket: FlowUnit[] = [];

  for (let index = 0; index < units.length; index++) {
    const unit = units[index];

    if (unit.isBreak) {
      if (bucket.length > 0) {
        used = 0;
        bucket.length = 0;
      }
      continue;
    }

    if (unit.isCover) {
      used = 0;
      bucket.length = 0;
      continue;
    }

    if (unit.forceBreakBefore && bucket.length > 0) {
      used = 0;
      bucket.length = 0;
    }

    const h = heights.get(unit.key) ?? 0;

    if (h >= bodyHeightPx) {
      return { unit, index, remaining: bodyHeightPx, unitHeight: h };
    }

    if (
      bucket.length > 0 &&
      used + unitPackNeed(unit, bucket, h) > bodyHeightPx
    ) {
      const remaining =
        bodyHeightPx -
        used -
        sectionBottomReserve(
          bucket as unknown as Parameters<typeof sectionBottomReserve>[0],
        );
      if (remaining > 0) {
        return { unit, index, remaining, unitHeight: h };
      }
      used = 0;
      bucket.length = 0;
    }

    const topPad = sectionTopOverhead(
      unit as unknown as Parameters<typeof sectionTopOverhead>[0],
      bucket as unknown as Parameters<typeof sectionTopOverhead>[1],
    );
    bucket.push(unit);
    used += topPad + h;
  }

  return null;
}

export function subdivideUnitForHeight(
  unit: FlowUnit,
  sections: Record<string, string>,
  targetHeight: number,
  unitHeight: number,
  measurePartHeight?: (partCount: number) => number,
): FlowUnit[] {
  const child = getSplittableChild(unit.blocks[0]);
  if (!child) return [unit];

  const content = resolveBlockContent(child, sections);
  const parts = splitSplittableParts(content);
  if (parts.length <= 1) return [unit];

  let partCount: number;

  if (measurePartHeight) {
    let lo = 1;
    let hi = parts.length - 1;
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
    const ratio = Math.min(0.95, Math.max(0.05, targetHeight / unitHeight));
    partCount = Math.max(
      1,
      Math.min(parts.length - 1, Math.ceil(parts.length * ratio)),
    );
  }

  const [first, rest] = splitContentAtPartCount(content, partCount);
  if (!rest.trim()) return [unit];

  return [
    makeSegmentUnit(unit, child, first, 0, `${unit.key}/0`, 2),
    makeSegmentUnit(unit, child, rest, 1, `${unit.key}/1`, 2),
  ];
}

export function refineUnitsOnce(
  units: FlowUnit[],
  heights: Map<string, number>,
  bodyHeightPx: number,
  sections: Record<string, string>,
  measurePartHeight?: (unit: FlowUnit, partCount: number) => number,
): FlowUnit[] | null {
  const overflow = findPackOverflow(units, heights, bodyHeightPx);
  if (!overflow || !canSubdivideUnit(overflow.unit, sections)) return null;

  const split = subdivideUnitForHeight(
    overflow.unit,
    sections,
    overflow.remaining,
    overflow.unitHeight,
    measurePartHeight
      ? (partCount) => measurePartHeight(overflow.unit, partCount)
      : undefined,
  );
  if (split.length <= 1) return null;

  return replaceUnitAt(units, overflow.index, split);
}
