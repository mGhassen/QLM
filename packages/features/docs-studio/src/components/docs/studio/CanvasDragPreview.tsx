'use client';

import { useLayoutEffect, useRef } from 'react';

interface CanvasDragPreviewProps {
  blockId: string;
}

export default function CanvasDragPreview({ blockId }: CanvasDragPreviewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = ref.current;
    const source = document.querySelector<HTMLElement>(
      `.studio-canvas [data-block-id="${CSS.escape(blockId)}"]`,
    );
    if (!host || !source) return;

    const rect = source.getBoundingClientRect();
    const clone = source.cloneNode(true) as HTMLElement;
    clone.classList.remove(
      'studio-dragging',
      'studio-selected',
      'studio-hovered',
      'studio-multi-selected',
      'studio-selected-inline',
    );
    clone.removeAttribute('data-studio-selected');
    clone.removeAttribute('data-studio-hovered');
    clone.removeAttribute('data-studio-multi-selected');
    clone.removeAttribute('data-studio-text-editing');
    clone.style.opacity = '1';
    clone.style.pointerEvents = 'none';

    host.replaceChildren(clone);
    if (rect.width > 0) host.style.width = `${rect.width}px`;
  }, [blockId]);

  return <div ref={ref} className="studio-drag-preview" />;
}
