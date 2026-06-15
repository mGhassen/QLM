import { findBlockById, flattenBlocks } from './serialize';
import { getParentId } from './block-order';
import type { BlockNode } from './types';

export function getFlatBlockIds(blocks: BlockNode[]): string[] {
  return flattenBlocks(blocks).map(({ block }) => block.id);
}

export function getAdjacentBlockId(
  blocks: BlockNode[],
  currentId: string,
  direction: 'prev' | 'next' | 'parent' | 'firstChild',
): string | null {
  if (direction === 'parent') {
    const parentId = getParentId(blocks, currentId);
    if (parentId === undefined || parentId === null) return null;
    return parentId;
  }

  if (direction === 'firstChild') {
    const block = findBlockById(blocks, currentId);
    return block?.children?.[0]?.id ?? null;
  }

  const ids = getFlatBlockIds(blocks);
  const idx = ids.indexOf(currentId);
  if (idx === -1) return null;

  if (direction === 'prev') return idx > 0 ? ids[idx - 1] : null;
  return idx < ids.length - 1 ? ids[idx + 1] : null;
}

export function isPointerOverCanvas(clientX: number, clientY: number): boolean {
  const el = document.elementFromPoint(clientX, clientY);
  return !!el?.closest('.studio-canvas');
}

export function focusBlockEditor(
  blockId: string,
  options?: { preventScroll?: boolean },
) {
  const root = document.querySelector(`[data-block-id="${blockId}"]`);
  if (!root) return;
  const target =
    (root.querySelector(
      ".ProseMirror[contenteditable='true']",
    ) as HTMLElement | null) ??
    (root.querySelector('.ProseMirror') as HTMLElement | null) ??
    (root.querySelector("[contenteditable='true']") as HTMLElement | null) ??
    (root.querySelector('.studio-inline-field') as HTMLElement | null);
  target?.focus({ preventScroll: options?.preventScroll ?? false });
}

export function selectAllInBlockEditor(blockId: string): boolean {
  const root = document.querySelector(`[data-block-id="${blockId}"]`);
  if (!root) return false;

  const textarea = root.querySelector(
    'textarea.studio-popover-input',
  ) as HTMLTextAreaElement | null;
  if (textarea) {
    textarea.focus();
    textarea.select();
    return true;
  }

  const editorWrap = root.querySelector(
    '[data-field-editor]',
  ) as HTMLElement | null;
  if (editorWrap) {
    editorWrap.dispatchEvent(
      new CustomEvent('studio-select-all', { bubbles: false }),
    );
    return true;
  }

  const contentEditable = root.querySelector(
    "[contenteditable='true']",
  ) as HTMLElement | null;
  if (contentEditable) {
    contentEditable.focus();
    const range = document.createRange();
    range.selectNodeContents(contentEditable);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    return true;
  }

  return false;
}
