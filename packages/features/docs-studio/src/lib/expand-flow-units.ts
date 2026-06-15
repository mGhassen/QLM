import { resolveBlockContent } from './content';
import { splitContentSegments } from './content-segments';
import { makeSegmentUnit } from './flow-unit-segments';
import type { FlowUnit } from './flow-units';
import { getSplittableChild, isSplittableBlockType } from './splittable';

export function expandSplittableUnits(
  units: FlowUnit[],
  sections: Record<string, string>,
): FlowUnit[] {
  const expanded: FlowUnit[] = [];

  for (const unit of units) {
    if (unit.isCover || unit.isBreak) {
      expanded.push(unit);
      continue;
    }

    const child = getSplittableChild(unit.blocks[0]);
    if (!child || !isSplittableBlockType(child.type)) {
      expanded.push(unit);
      continue;
    }

    const content = resolveBlockContent(child, sections);
    const segments = splitContentSegments(content);
    if (segments.length <= 1) {
      expanded.push(unit);
      continue;
    }

    segments.forEach((segment, index) => {
      expanded.push(
        makeSegmentUnit(unit, child, segment, index, `${unit.key}:seg${index}`),
      );
    });
  }

  return expanded;
}
