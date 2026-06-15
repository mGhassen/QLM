'use client';

import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useBlockRect } from '#/lib/block-rect';
import type { BlockNode } from '#/lib/types';
import type { StudioTransform } from '#/lib/studio-transform';
import StudioBlockToolbar from './StudioBlockToolbar';
import StudioSpacingHandles from './StudioSpacingHandles';
import StudioTransformHandles from './StudioTransformHandles';
import InlineInsertMenu from './InlineInsertMenu';

interface StudioBlockChromeProps {
  block: BlockNode;
  blockRef: RefObject<HTMLElement | null>;
  show: boolean;
  selected: boolean;
  editText?: boolean;
  onSpacingChange?: (patch: {
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    padding?: number;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
  }) => void;
  onResize?: (patch: StudioTransform) => void;
  onTransformStart?: () => void;
  onTransformEnd?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onInsertAfter?: (block: BlockNode) => void;
  onInsertBefore?: (block: BlockNode) => void;
  onHover?: (id: string | null) => void;
}

export default function StudioBlockChrome(props: StudioBlockChromeProps) {
  if (!props.show) return null;
  return <StudioBlockChromeActive {...props} />;
}

function StudioBlockChromeActive({
  block,
  blockRef,
  show,
  selected,
  editText = false,
  onSpacingChange,
  onResize,
  onTransformStart,
  onTransformEnd,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onInsertAfter,
  onInsertBefore,
  onHover,
}: StudioBlockChromeProps) {
  const [dock, setDock] = useState<HTMLElement | null>(null);
  const [showSpacing, setShowSpacing] = useState(false);
  const rect = useBlockRect(blockRef);
  const props = block.props ?? {};

  useLayoutEffect(() => {
    setDock(document.querySelector<HTMLElement>('.studio-block-chrome-dock'));
  }, []);

  useEffect(() => {
    if (selected) setShowSpacing(false);
  }, [block.id, selected]);

  if (!dock || !show || !rect) return null;

  return createPortal(
    <div
      className={`studio-block-chrome-frame${
        selected
          ? ' is-selected'
          : editText
            ? ' is-text-editing'
            : show
              ? ' is-hovered'
              : ''
      }`}
      style={{
        position: 'absolute',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: 'none',
      }}
      data-chrome-for={block.id}
    >
      <StudioBlockToolbar
        blockId={block.id}
        type={block.type}
        onHover={onHover}
        showSpacing={showSpacing}
        onToggleSpacing={
          selected && onSpacingChange
            ? () => setShowSpacing((v) => !v)
            : undefined
        }
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onInsertAfter={onInsertAfter}
      />

      {onInsertBefore && (
        <div className="studio-insert-edge-zone studio-insert-edge-zone-top">
          <InlineInsertMenu
            variant="floating"
            menuTitle="Insert before"
            buttonTitle="Insert block before"
            onInsert={onInsertBefore}
          />
        </div>
      )}

      {onInsertAfter && (
        <div className="studio-insert-edge-zone studio-insert-edge-zone-bottom">
          <InlineInsertMenu
            variant="floating"
            menuTitle="Insert after"
            buttonTitle="Insert block after"
            onInsert={onInsertAfter}
          />
        </div>
      )}

      {selected && onSpacingChange && showSpacing && (
        <StudioSpacingHandles
          marginTop={props.marginTop as number | undefined}
          marginBottom={props.marginBottom as number | undefined}
          marginLeft={props.marginLeft as number | undefined}
          marginRight={props.marginRight as number | undefined}
          padding={props.padding as number | undefined}
          paddingTop={props.paddingTop as number | undefined}
          paddingBottom={props.paddingBottom as number | undefined}
          paddingLeft={props.paddingLeft as number | undefined}
          paddingRight={props.paddingRight as number | undefined}
          onCommit={onSpacingChange}
        />
      )}

      {selected && onResize && (
        <StudioTransformHandles
          blockRef={blockRef}
          blockType={block.type}
          props={props}
          onTransformStart={onTransformStart}
          onTransformEnd={onTransformEnd}
          onCommit={onResize}
        />
      )}
    </div>,
    dock,
  );
}
