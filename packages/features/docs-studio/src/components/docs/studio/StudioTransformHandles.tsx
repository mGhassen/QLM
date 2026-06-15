'use client';

import { useRef, useState, type RefObject } from 'react';
import { trackPointerDrag } from '#/lib/fluid-drag';
import { pauseDocLayout, resumeDocLayout } from '#/lib/layout-pause';
import {
  applyTransformStyle,
  computeTransform,
  layoutSize,
  resizeHandlesFor,
  restoreTransformFromProps,
  shouldCommitResize,
  snapTransform,
  type ResizeHandle,
  type StudioTransform,
} from '#/lib/studio-transform';
import type { BlockType } from '#/lib/types';

interface StudioTransformHandlesProps {
  blockRef: RefObject<HTMLElement | null>;
  blockType: BlockType;
  props: Record<string, unknown>;
  onTransformStart?: () => void;
  onTransformEnd?: () => void;
  onCommit: (patch: StudioTransform) => void;
}

export default function StudioTransformHandles({
  blockRef,
  blockType,
  props,
  onTransformStart,
  onTransformEnd,
  onCommit,
}: StudioTransformHandlesProps) {
  const lastPatch = useRef<StudioTransform | null>(null);
  const lastDelta = useRef({ dx: 0, dy: 0 });
  const activeHandle = useRef<ResizeHandle | null>(null);
  const [ratioLocked, setRatioLocked] = useState(false);
  const handles = resizeHandlesFor(blockType);

  function start(handle: ResizeHandle, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const el = blockRef.current;
    if (!el) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = layoutSize(props.width, el.offsetWidth);
    const startHeight = layoutSize(
      props.height ?? props.minHeight,
      el.offsetHeight,
    );
    const start = {
      width: startWidth,
      height: startHeight,
      translateX: (props.translateX as number) ?? 0,
      translateY: (props.translateY as number) ?? 0,
    };
    const aspectRatio =
      ratioLocked && startHeight > 0 ? startWidth / startHeight : null;

    activeHandle.current = handle;
    lastDelta.current = { dx: 0, dy: 0 };
    onTransformStart?.();
    pauseDocLayout();
    el.style.willChange = 'width, height, transform';

    trackPointerDrag(e, {
      cursor: handle === 'move' ? 'grabbing' : `${handle}-resize`,
      onMove(ev) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        lastDelta.current = { dx, dy };
        const patch = computeTransform(handle, dx, dy, start, {
          snap: false,
          aspectRatio,
        });
        lastPatch.current = patch;
        applyTransformStyle(el, patch);
      },
      onEnd() {
        el.style.willChange = '';
        const raw = lastPatch.current;
        const handleUsed = activeHandle.current;
        const delta = lastDelta.current;
        const committed =
          !!raw &&
          !!handleUsed &&
          shouldCommitResize(handleUsed, delta.dx, delta.dy);
        lastPatch.current = null;
        activeHandle.current = null;

        if (committed) {
          onCommit(snapTransform(raw));
        } else {
          restoreTransformFromProps(el, props);
        }

        resumeDocLayout();
        onTransformEnd?.();
      },
    });
  }

  return (
    <div className="studio-transform-box" onClick={(e) => e.stopPropagation()}>
      {handles.map((h) => (
        <div
          key={h}
          className={`studio-transform-handle ${h}`}
          onPointerDown={(e) => start(h, e)}
        />
      ))}
    </div>
  );
}
