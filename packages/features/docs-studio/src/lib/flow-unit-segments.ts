import { resolveBlockContent } from './content';
import { splitSplittableParts } from './content-segments';
import type { FlowUnit } from './flow-units';
import { getSplittableChild } from './splittable';
import type { BlockNode } from './types';

export function segmentChild(
  child: BlockNode,
  segmentIndex: number,
  segmentTotal: number,
  segmentText: string,
): BlockNode {
  return {
    ...child,
    props: {
      ...child.props,
      contentSegment: segmentIndex,
      contentSegmentTotal: segmentTotal,
      segmentContent: segmentText,
    },
  };
}

export function unitWithChild(unit: FlowUnit, child: BlockNode): FlowUnit {
  const block = unit.blocks[0];
  if (block.type === 'section') {
    return {
      ...unit,
      blocks: [{ ...block, children: [child] }],
    };
  }
  return { ...unit, blocks: [child] };
}

export function makeSegmentUnit(
  unit: FlowUnit,
  child: BlockNode,
  segmentText: string,
  segmentIndex: number,
  key: string,
  segmentTotal = 0,
): FlowUnit {
  return {
    ...unitWithChild(
      unit,
      segmentChild(child, segmentIndex, segmentTotal, segmentText),
    ),
    key,
  };
}

export function splitContentAtPartCount(
  content: string,
  partCount: number,
): [string, string] {
  const parts = splitSplittableParts(content);
  const clamped = Math.max(1, Math.min(partCount, parts.length - 1));
  const joiner = content.includes('\n\n')
    ? '\n\n'
    : content.includes('\n')
      ? '\n'
      : ' ';
  return [
    parts.slice(0, clamped).join(joiner),
    parts.slice(clamped).join(joiner),
  ];
}

export function splittablePartCount(
  unit: FlowUnit,
  sections: Record<string, string>,
): number {
  const child = getSplittableChild(unit.blocks[0]);
  if (!child) return 0;
  const content = resolveBlockContent(child, sections);
  return splitSplittableParts(content).length;
}

export function replaceUnitAt(
  units: FlowUnit[],
  index: number,
  replacements: FlowUnit[],
): FlowUnit[] {
  return [...units.slice(0, index), ...replacements, ...units.slice(index + 1)];
}
