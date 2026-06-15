import {
  canAcceptChildren,
  canNestChildIn,
  isDescendant,
} from './block-schema';
import { findBlockById } from './serialize';
import type { BlockNode, BlockType } from './types';

export type DropPosition = 'before' | 'after' | 'inside';

export interface CanvasDropTarget {
  blockId: string;
  position: DropPosition;
  index?: number;
  rect: DOMRect;
  valid: boolean;
}

const EDGE_RATIO = 0.25;
const MAGNET_PX = 12;

function blockElementsAtPoint(clientX: number, clientY: number): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const result: HTMLElement[] = [];

  for (const el of document.elementsFromPoint(clientX, clientY)) {
    const blockEl = (el as HTMLElement).closest?.(
      '[data-block-id]',
    ) as HTMLElement | null;
    if (blockEl && !seen.has(blockEl)) {
      seen.add(blockEl);
      result.push(blockEl);
    }
  }

  return result;
}

function dropIndexForInside(parent: BlockNode, gridCellIndex?: number): number {
  if (gridCellIndex != null) return gridCellIndex;
  return parent.children?.length ?? 0;
}

function gridCellFromPoint(
  el: HTMLElement,
  clientX: number,
  clientY: number,
  cols: number,
  rows: number,
): number | undefined {
  const gridInner = el.querySelector('.studio-grid') as HTMLElement | null;
  const target = gridInner ?? el;
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return undefined;

  const col = Math.min(
    cols - 1,
    Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * cols)),
  );
  const row = Math.min(
    rows - 1,
    Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * rows)),
  );
  return row * cols + col;
}

function resolveDropPosition(
  clientY: number,
  rect: DOMRect,
  isContainer: boolean,
): DropPosition {
  const topBand = rect.top + rect.height * EDGE_RATIO;
  const bottomBand = rect.bottom - rect.height * EDGE_RATIO;
  const midY = rect.top + rect.height / 2;

  if (isContainer) {
    if (clientY <= topBand + MAGNET_PX) return 'before';
    if (clientY >= bottomBand - MAGNET_PX) return 'after';
    if (clientY > topBand && clientY < bottomBand) return 'inside';
    return clientY < midY ? 'before' : 'after';
  }

  if (clientY <= midY + MAGNET_PX / 2) return 'before';
  if (clientY >= midY - MAGNET_PX / 2) return 'after';
  return clientY < midY ? 'before' : 'after';
}

export function findCanvasDropTarget(
  clientX: number,
  clientY: number,
  dragBlockId: string,
  blocks: BlockNode[],
  options?: { paletteType?: string; reorderOnly?: boolean },
): CanvasDropTarget | null {
  const paletteType = options?.paletteType;
  const reorderOnly = options?.reorderOnly ?? !paletteType;
  const dragged = paletteType
    ? ({ type: paletteType } as BlockNode)
    : findBlockById(blocks, dragBlockId);
  if (!dragged) return null;

  for (const el of blockElementsAtPoint(clientX, clientY)) {
    const blockId = el.getAttribute('data-block-id');
    if (!blockId) continue;
    if (
      !paletteType &&
      (blockId === dragBlockId || isDescendant(blocks, dragBlockId, blockId))
    )
      continue;

    const block = findBlockById(blocks, blockId);
    if (!block) continue;

    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) continue;

    const isContainer = canAcceptChildren(block.type);
    const canNest = dragged && canNestChildIn(block, dragged.type as BlockType);
    let position = resolveDropPosition(clientY, rect, isContainer);

    if (reorderOnly && position === 'inside') {
      position = clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    }

    if (position === 'inside') {
      let index = dropIndexForInside(block);
      if (block.type === 'grid') {
        const cols = (block.props?.cols as number) ?? 2;
        const rows = (block.props?.rows as number) ?? 1;
        const cell = gridCellFromPoint(el, clientX, clientY, cols, rows);
        if (cell != null) index = cell;
      }
      return {
        blockId,
        position: 'inside',
        index,
        rect,
        valid: !!canNest,
      };
    }

    return { blockId, position, rect, valid: true };
  }

  return null;
}

export function getAncestorIds(blocks: BlockNode[], id: string): string[] {
  const path: string[] = [];

  function walk(nodes: BlockNode[], ancestors: string[]): boolean {
    for (const node of nodes) {
      if (node.id === id) {
        path.push(...ancestors);
        return true;
      }
      if (node.children && walk(node.children, [...ancestors, node.id]))
        return true;
    }
    return false;
  }

  walk(blocks, []);
  return path;
}

export function parseStudioDragId(dragId: string | number): {
  blockId: string | null;
  source: 'tree' | 'canvas' | 'palette';
  paletteType?: string;
} {
  const id = String(dragId);
  if (id.startsWith('canvas:'))
    return { blockId: id.slice(7), source: 'canvas' };
  if (id.startsWith('palette:'))
    return { blockId: null, source: 'palette', paletteType: id.slice(8) };
  return { blockId: id, source: 'tree' };
}

export function canvasDragId(blockId: string) {
  return `canvas:${blockId}`;
}

export function paletteDragId(type: string) {
  return `palette:${type}`;
}
