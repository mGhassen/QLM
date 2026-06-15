import type { CanvasDropTarget } from './canvas-drop';
import { normalizeBlockPlacementInTree } from './block-placement';
import {
  canAcceptChildren,
  canNestChild,
  canNestChildIn,
} from './block-schema';
import { ensureCoverFirst, isRootCoverBlock } from './cover';
import { findBlockById, moveBlockInTree, moveBlockToParent } from './serialize';
import type { BlockNode } from './types';

export interface OrderEntry {
  id: string;
  parentId: string | null;
}

export function getParentId(
  nodes: BlockNode[],
  id: string,
  parent: string | null = null,
): string | null | undefined {
  for (const node of nodes) {
    if (node.id === id) return parent;
    if (node.children) {
      const found = getParentId(node.children, id, node.id);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export function collectDocumentOrder(blocks: BlockNode[]): OrderEntry[] {
  const order: OrderEntry[] = [];

  for (const block of blocks) {
    if (block.type === 'cover') continue;

    if (block.type === 'section') {
      for (const child of block.children ?? []) {
        order.push({ id: child.id, parentId: block.id });
      }
      continue;
    }

    order.push({ id: block.id, parentId: null });
  }

  return order;
}

export function isGloballyMovable(blocks: BlockNode[], id: string): boolean {
  if (isRootCoverBlock(blocks, id)) return false;

  const parentId = getParentId(blocks, id);
  if (parentId === undefined) return false;
  if (parentId === null) return true;

  const parent = findBlockById(blocks, parentId);
  return parent?.type === 'section';
}

function canMoveAsLocalSibling(
  blocks: BlockNode[],
  id: string,
  direction: 'up' | 'down',
): boolean {
  const parentId = getParentId(blocks, id);
  if (parentId === undefined) return false;

  const siblings =
    parentId === null
      ? blocks
      : (findBlockById(blocks, parentId)?.children ?? []);
  const idx = siblings.findIndex((b) => b.id === id);
  if (idx === -1) return false;

  const newIdx = direction === 'up' ? idx - 1 : idx + 1;
  return newIdx >= 0 && newIdx < siblings.length;
}

export function canMoveBlock(
  blocks: BlockNode[],
  id: string,
  direction: 'up' | 'down',
): boolean {
  if (isGloballyMovable(blocks, id)) {
    const order = collectDocumentOrder(blocks);
    const idx = order.findIndex((entry) => entry.id === id);
    if (idx === -1) return false;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    return newIdx >= 0 && newIdx < order.length;
  }

  return canMoveAsLocalSibling(blocks, id, direction);
}

export function moveBlockRelativeTo(
  blocks: BlockNode[],
  sourceId: string,
  targetId: string,
  position: 'before' | 'after',
): BlockNode[] {
  if (sourceId === targetId) return blocks;

  let moved: BlockNode | null = null;

  function extract(nodes: BlockNode[]): BlockNode[] {
    return nodes
      .filter((node) => {
        if (node.id === sourceId) {
          moved = node;
          return false;
        }
        return true;
      })
      .map((node) => ({
        ...node,
        children: node.children ? extract(node.children) : undefined,
      }));
  }

  let result = extract(structuredClone(blocks));
  if (!moved) return blocks;

  function insert(nodes: BlockNode[]): BlockNode[] {
    const out: BlockNode[] = [];
    for (const node of nodes) {
      if (position === 'before' && node.id === targetId) {
        out.push(moved!);
      }
      out.push(
        node.children ? { ...node, children: insert(node.children) } : node,
      );
      if (position === 'after' && node.id === targetId) {
        out.push(moved!);
      }
    }
    return out;
  }

  result = insert(result);
  return ensureCoverFirst(result);
}

export function moveBlockBefore(
  blocks: BlockNode[],
  sourceId: string,
  targetId: string,
): BlockNode[] {
  return moveBlockRelativeTo(blocks, sourceId, targetId, 'before');
}

export function reorderSiblingBlocks(
  blocks: BlockNode[],
  sourceId: string,
  targetId: string,
  position: 'before' | 'after',
): BlockNode[] {
  if (sourceId === targetId) return blocks;

  const sourceParent = getParentId(blocks, sourceId);
  const targetParent = getParentId(blocks, targetId);
  if (sourceParent === undefined || targetParent === undefined) return blocks;
  if (sourceParent !== targetParent) return blocks;

  return moveBlockRelativeTo(blocks, sourceId, targetId, position);
}

function getSiblings(blocks: BlockNode[], id: string): BlockNode[] | null {
  const parentId = getParentId(blocks, id);
  if (parentId === undefined) return null;
  return parentId === null
    ? blocks
    : (findBlockById(blocks, parentId)?.children ?? []);
}

export function canOutdentBlock(blocks: BlockNode[], id: string): boolean {
  if (isRootCoverBlock(blocks, id)) return false;

  const parentId = getParentId(blocks, id);
  if (parentId === undefined || parentId === null) return false;

  const block = findBlockById(blocks, id);
  if (!block) return false;

  const grandParentId = getParentId(blocks, parentId);
  if (grandParentId === undefined) return false;
  if (grandParentId === null) return true;

  const grandParent = findBlockById(blocks, grandParentId);
  return !!grandParent && canNestChild(grandParent.type, block.type);
}

export function canIndentBlock(blocks: BlockNode[], id: string): boolean {
  if (isRootCoverBlock(blocks, id)) return false;

  const siblings = getSiblings(blocks, id);
  if (!siblings) return false;

  const idx = siblings.findIndex((b) => b.id === id);
  if (idx <= 0) return false;

  const prev = siblings[idx - 1];
  const block = siblings[idx];
  return canAcceptChildren(prev.type) && canNestChild(prev.type, block.type);
}

export function applyPlacementNormalize(
  blocks: BlockNode[],
  blockId: string,
): BlockNode[] {
  const parentId = getParentId(blocks, blockId);
  const parent = parentId != null ? findBlockById(blocks, parentId) : null;
  return normalizeBlockPlacementInTree(blocks, blockId, parent ?? undefined);
}

export function previewBlocksForDrag(
  blocks: BlockNode[],
  sourceId: string,
  target: CanvasDropTarget | null,
): BlockNode[] {
  if (!target?.valid) return blocks;
  const preview = reparentBlockAtTarget(blocks, sourceId, target);
  return preview === blocks ? blocks : preview;
}

export function reparentBlockAtTarget(
  blocks: BlockNode[],
  sourceId: string,
  target: CanvasDropTarget,
): BlockNode[] {
  if (!target.valid) return blocks;

  if (target.position === 'inside') {
    const parentBlock = findBlockById(blocks, target.blockId);
    const sourceBlock = findBlockById(blocks, sourceId);
    if (
      !parentBlock ||
      !sourceBlock ||
      !canNestChildIn(parentBlock, sourceBlock.type)
    ) {
      return blocks;
    }

    const doc = moveBlockToParent(
      { version: 0, blocks },
      sourceId,
      target.blockId,
      target.index,
    );
    if (doc.blocks === blocks) return blocks;

    let result = normalizeBlockPlacementInTree(
      doc.blocks,
      sourceId,
      parentBlock,
      target.index,
    );
    return ensureCoverFirst(result);
  }

  const position = target.position === 'before' ? 'before' : 'after';
  const sourceParent = getParentId(blocks, sourceId);
  const targetParent = getParentId(blocks, target.blockId);

  let result =
    sourceParent === targetParent && sourceParent !== undefined
      ? reorderSiblingBlocks(blocks, sourceId, target.blockId, position)
      : moveBlockRelativeTo(blocks, sourceId, target.blockId, position);

  if (result === blocks) return blocks;

  result = applyPlacementNormalize(result, sourceId);
  return ensureCoverFirst(result);
}

export function outdentBlock(blocks: BlockNode[], id: string): BlockNode[] {
  if (!canOutdentBlock(blocks, id)) return blocks;

  const parentId = getParentId(blocks, id);
  if (parentId === undefined || parentId === null) return blocks;

  let result = moveBlockRelativeTo(blocks, id, parentId, 'after');
  result = applyPlacementNormalize(result, id);
  return ensureCoverFirst(result);
}

export function indentBlock(blocks: BlockNode[], id: string): BlockNode[] {
  if (!canIndentBlock(blocks, id)) return blocks;

  const siblings = getSiblings(blocks, id);
  if (!siblings) return blocks;

  const idx = siblings.findIndex((b) => b.id === id);
  if (idx <= 0) return blocks;

  const prev = siblings[idx - 1];
  const cellIndex = prev.children?.length ?? 0;
  let result = moveBlockToParent({ version: 0, blocks }, id, prev.id).blocks;
  result = normalizeBlockPlacementInTree(result, id, prev, cellIndex);
  return ensureCoverFirst(result);
}

export function moveInDocumentOrder(
  blocks: BlockNode[],
  id: string,
  direction: 'up' | 'down',
): BlockNode[] {
  if (!isGloballyMovable(blocks, id)) {
    return moveBlockInTree(blocks, id, direction);
  }

  const order = collectDocumentOrder(blocks);
  const idx = order.findIndex((entry) => entry.id === id);
  if (idx === -1) return blocks;

  const newIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= order.length) return blocks;

  const neighbor = order[newIdx];
  const position = direction === 'up' ? 'before' : 'after';
  return moveBlockRelativeTo(blocks, id, neighbor.id, position);
}
