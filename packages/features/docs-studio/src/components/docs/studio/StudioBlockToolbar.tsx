'use client';

import { ArrowDown, ArrowUp, BoxSelect, Copy, Trash2 } from 'lucide-react';
import { BLOCK_LABELS } from '#/lib/block-fields';
import { titleWithShortcut } from '#/lib/studio-shortcuts';
import type { BlockNode, BlockType } from '#/lib/types';
import CanvasDragHandle from './CanvasDragHandle';
import InlineInsertMenu from './InlineInsertMenu';
import StudioBlockInfo from './StudioBlockInfo';

interface StudioBlockToolbarProps {
  blockId: string;
  type: BlockType;
  showSpacing?: boolean;
  onToggleSpacing?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onInsertAfter?: (block: BlockNode) => void;
  onHover?: (id: string | null) => void;
}

export default function StudioBlockToolbar({
  blockId,
  type,
  showSpacing,
  onToggleSpacing,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onInsertAfter,
  onHover,
}: StudioBlockToolbarProps) {
  return (
    <div
      className="studio-block-toolbar"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => onHover?.(blockId)}
      onMouseLeave={() => onHover?.(null)}
    >
      <CanvasDragHandle blockId={blockId} />
      <span className="studio-block-label">{BLOCK_LABELS[type] ?? type}</span>
      <StudioBlockInfo blockId={blockId} type={type} />
      {onToggleSpacing && (
        <button
          type="button"
          title={
            showSpacing ? 'Hide spacing controls' : 'Show spacing controls'
          }
          className={showSpacing ? 'active' : undefined}
          onClick={onToggleSpacing}
        >
          <BoxSelect size={12} />
        </button>
      )}
      {onInsertAfter && (
        <InlineInsertMenu variant="toolbar" onInsert={onInsertAfter} />
      )}
      {onMoveUp && (
        <button
          type="button"
          title={titleWithShortcut('Move up', 'Alt+↑')}
          onClick={onMoveUp}
        >
          <ArrowUp size={12} />
        </button>
      )}
      {onMoveDown && (
        <button
          type="button"
          title={titleWithShortcut('Move down', 'Alt+↓')}
          onClick={onMoveDown}
        >
          <ArrowDown size={12} />
        </button>
      )}
      {onDuplicate && (
        <button
          type="button"
          title={titleWithShortcut('Duplicate', 'Mod+D')}
          onClick={onDuplicate}
        >
          <Copy size={12} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          title={titleWithShortcut('Delete', 'Delete')}
          className="danger"
          onClick={onDelete}
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}
