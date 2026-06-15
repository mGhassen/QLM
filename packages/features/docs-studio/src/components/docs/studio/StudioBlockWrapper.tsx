"use client";

import { useRef, type ReactNode } from "react";
import { blockAppearanceProps } from "#/lib/block-appearance";
import { canAcceptChildren } from "#/lib/block-schema";
import type { StudioTransform } from "#/lib/studio-transform";
import type { BlockNode } from "#/lib/types";
import StudioBlockChrome from "./StudioBlockChrome";

interface StudioBlockWrapperProps {
  block: BlockNode;
  selected: boolean;
  multiSelected?: boolean;
  editText?: boolean;
  hovered?: boolean;
  children: ReactNode;
  onSelectBlock?: (id: string, additive?: boolean) => void;
  onSelectText?: (blockId: string) => void;
  onHover?: (id: string | null) => void;
  onResize?: (patch: StudioTransform) => void;
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
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onInsertAfter?: (block: BlockNode) => void;
  onInsertBefore?: (block: BlockNode) => void;
  dragBlockId?: string | null;
  dropTargetBlockId?: string | null;
  dropTargetPosition?: "before" | "after" | "inside" | null;
  dropTargetValid?: boolean;
}

export default function StudioBlockWrapper({
  block,
  selected,
  multiSelected = false,
  editText = false,
  hovered = false,
  children,
  onSelectBlock,
  onSelectText,
  onHover,
  onResize,
  onSpacingChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onInsertAfter,
  onInsertBefore,
  dragBlockId,
  dropTargetBlockId,
  dropTargetPosition,
  dropTargetValid = true,
}: StudioBlockWrapperProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const props = block.props ?? {};
  const isContainer = canAcceptChildren(block.type);
  const appearance = blockAppearanceProps(block.type, props);
  const layoutStyle = appearance.style;
  const isDragging = dragBlockId === block.id;
  const isDropInside =
    !!dragBlockId &&
    dragBlockId !== block.id &&
    dropTargetBlockId === block.id &&
    dropTargetPosition === "inside";
  const shellClass = [
    "studio-block",
    appearance.className,
    isContainer ? "studio-container" : "",
    selected ? "studio-selected" : "",
    editText && !selected ? "studio-selected-inline" : "",
    multiSelected ? "studio-multi-selected" : "",
    hovered ? "studio-hovered" : "",
    isDragging ? "studio-dragging" : "",
    isDropInside && dropTargetValid ? "studio-drop-target" : "",
    isDropInside && !dropTargetValid ? "studio-drop-target-invalid" : "",
  ]
    .filter(Boolean)
    .join(" ");

  function isInteractiveTarget(target: EventTarget | null) {
    const el = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    return el?.closest(
      ".studio-block-chrome-dock, .studio-transform-handle, .studio-transform-move, .studio-transform-link, .studio-grid-col-handle, .studio-grid-empty-cell, .resize-handle, .studio-spacing-handle, .studio-spacing-edge-zone, .studio-spacing-drag, .studio-spacing-input, .studio-spacing-link, .studio-block-toolbar, .studio-canvas-drag-handle, .studio-insert-edge-zone, .studio-inline-insert, .studio-inline-insert-toolbar, .studio-insert-menu, .studio-block-info",
    );
  }

  function eventElement(target: EventTarget | null): HTMLElement | null {
    if (!target) return null;
    if (target instanceof Element) return target as HTMLElement;
    return (target as Node).parentElement;
  }

  function isTextTarget(target: EventTarget | null) {
    return !!eventElement(target)?.closest(
      ".studio-inline-field, .studio-inline-field-idle, .ProseMirror, [contenteditable='true'], [data-field-editor]",
    );
  }

  function handlePointerSelect(e: React.MouseEvent) {
    if (isInteractiveTarget(e.target)) return;
    const eventEl = eventElement(e.target);
    const clickedId = eventEl?.closest("[data-block-id]")?.getAttribute("data-block-id");
    if (!clickedId || clickedId !== block.id) return;
    const onText = isTextTarget(e.target);
    if (onText && editText) return;
    e.stopPropagation();
    if (onText) {
      e.preventDefault();
      if (selected) {
        onSelectText?.(clickedId);
      } else {
        onSelectBlock?.(clickedId, e.metaKey || e.ctrlKey || e.shiftKey);
      }
    } else {
      onSelectBlock?.(clickedId, e.metaKey || e.ctrlKey || e.shiftKey);
    }
  }

  return (
    <>
      <div
        ref={blockRef}
        className={shellClass}
        style={layoutStyle}
        data-block-type={block.type}
        {...appearance.dataAttrs}
        onMouseEnter={(e) => {
          e.stopPropagation();
          onHover?.(block.id);
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          onHover?.(null);
        }}
        onMouseDown={handlePointerSelect}
        data-block-id={block.id}
        {...(selected ? { "data-studio-selected": true } : {})}
        {...(editText && !selected ? { "data-studio-text-editing": true } : {})}
        {...(multiSelected ? { "data-studio-multi-selected": true } : {})}
        {...(hovered ? { "data-studio-hovered": true } : {})}
      >
        <div className="studio-block-content">{children}</div>

        {isDropInside && (
          <div className={`studio-drop-hint${dropTargetValid ? "" : " invalid"}`}>
            {dropTargetValid ? "Drop here to nest inside" : "Cannot nest here"}
          </div>
        )}
      </div>

      <StudioBlockChrome
        block={block}
        blockRef={blockRef}
        show={(selected || hovered || editText) && !isDragging}
        selected={selected}
        editText={editText && !selected}
        onHover={onHover}
        onSpacingChange={onSpacingChange}
        onResize={onResize}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onInsertAfter={onInsertAfter}
        onInsertBefore={onInsertBefore}
      />
    </>
  );
}
