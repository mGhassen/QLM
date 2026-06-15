import { joinContentSegments } from "./content-segments";
import { breakVariantToSectionProps, type BreakVariant } from "./breaks";
import type { BlockNode } from "./types";

export interface FlowUnit {
  key: string;
  blocks: BlockNode[];
  forceBreakBefore?: boolean;
  isCover?: boolean;
  isBreak?: boolean;
}

function sectionSlice(
  section: BlockNode,
  child: BlockNode,
  sliceIndex: number,
  breakVariant?: BreakVariant,
): BlockNode {
  const isFirst = sliceIndex === 0;
  const breakProps = breakVariantToSectionProps(breakVariant);

  return {
    ...section,
    id: isFirst ? section.id : `${section.id}__p${sliceIndex}`,
    props: {
      ...section.props,
      pageBreak: isFirst
        ? (breakProps.pageBreak ?? section.props?.pageBreak)
        : (breakProps.pageBreak ?? false),
      continuation: isFirst
        ? breakProps.continuation
        : (breakProps.continuation ?? true),
    },
    children: [child],
  };
}

function sectionToUnits(section: BlockNode, breakBefore: boolean): FlowUnit[] {
  const children = section.children ?? [];
  if (children.length === 0) {
    return [{ key: section.id, blocks: [section], forceBreakBefore: breakBefore }];
  }

  const units: FlowUnit[] = [];
  let forceNext = breakBefore;
  let nextVariant: BreakVariant | undefined;
  let sliceIndex = 0;

  for (const child of children) {
    if (child.type === "break") {
      units.push({ key: `break:${child.id}`, blocks: [child], isBreak: true });
      forceNext = true;
      nextVariant = (child.props?.variant as BreakVariant) ?? "page";
      continue;
    }

    units.push({
      key: `${section.id}:${child.id}`,
      blocks: [sectionSlice(section, child, sliceIndex, nextVariant)],
      forceBreakBefore: forceNext,
    });
    forceNext = false;
    nextVariant = undefined;
    sliceIndex += 1;
  }

  return units;
}

export function blocksToFlowUnits(blocks: BlockNode[]): FlowUnit[] {
  const units: FlowUnit[] = [];
  let pendingVariant: BreakVariant | undefined;

  for (const block of blocks) {
    if (block.type === "break") {
      units.push({ key: `break:${block.id}`, blocks: [block], isBreak: true });
      pendingVariant = (block.props?.variant as BreakVariant) ?? "page";
      continue;
    }

    if (block.type === "cover") {
      pendingVariant = undefined;
      if (units.length > 0) {
        units[units.length - 1].forceBreakBefore = units[units.length - 1].forceBreakBefore ?? false;
      }
      units.push({ key: block.id, blocks: [block], isCover: true, forceBreakBefore: true });
      continue;
    }

    if (block.type === "section") {
      const sectionUnits = sectionToUnits(block, !!block.props?.pageBreak);
      if (pendingVariant && sectionUnits.length > 0 && !sectionUnits[0].isBreak) {
        sectionUnits[0].forceBreakBefore = true;
        const firstBlock = sectionUnits[0].blocks[0];
        if (firstBlock.type === "section") {
          sectionUnits[0].blocks = [
            {
              ...firstBlock,
              props: {
                ...firstBlock.props,
                ...breakVariantToSectionProps(pendingVariant),
              },
            },
          ];
        }
      }
      pendingVariant = undefined;
      units.push(...sectionUnits);
      continue;
    }

    units.push({
      key: block.id,
      blocks: [block],
      forceBreakBefore: units.length > 0 || !!pendingVariant,
    });
    pendingVariant = undefined;
  }

  return units;
}

function mergeSegmentChildren(left: BlockNode, right: BlockNode): BlockNode {
  const leftText = (left.props?.segmentContent as string) ?? "";
  const rightText = (right.props?.segmentContent as string) ?? "";
  const {
    contentSegment: _leftIndex,
    contentSegmentTotal: _leftTotal,
    segmentContent: _leftSegment,
    ...leftProps
  } = left.props ?? {};

  return {
    ...left,
    props: {
      ...leftProps,
      segmentContent: joinContentSegments([leftText, rightText]),
    },
  };
}

function appendSectionChild(prev: BlockNode, child: BlockNode): BlockNode {
  const children = [...(prev.children ?? [])];
  const last = children[children.length - 1];

  if (
    last &&
    last.id === child.id &&
    (last.props?.segmentContent || child.props?.segmentContent)
  ) {
    children[children.length - 1] = mergeSegmentChildren(last, child);
    return { ...prev, children };
  }

  return { ...prev, children: [...children, child] };
}

export function assemblePageBlocks(units: FlowUnit[]): BlockNode[] {
  const blocks: BlockNode[] = [];

  for (const unit of units) {
    const block = unit.blocks[0];

    if (block.type === "break") {
      blocks.push(block);
      continue;
    }

    if (block.type !== "section") {
      blocks.push(block);
      continue;
    }

    const baseId = block.id.replace(/__p\d+$/, "");
    const child = block.children?.[0];
    if (!child) continue;

    const prev = blocks[blocks.length - 1];

    if (prev?.type === "section" && prev.id === baseId) {
      blocks[blocks.length - 1] = appendSectionChild(prev, child);
      continue;
    }

    blocks.push({
      ...block,
      id: baseId,
      props: { ...block.props, continuation: block.props?.continuation ?? undefined },
    });
  }

  return blocks;
}
