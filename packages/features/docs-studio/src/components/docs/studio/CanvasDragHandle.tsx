"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { canvasDragId } from "#/lib/canvas-drop";

interface CanvasDragHandleProps {
  blockId: string;
}

export default function CanvasDragHandle({ blockId }: CanvasDragHandleProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: canvasDragId(blockId),
    data: { blockId, source: "canvas" },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`studio-canvas-drag-handle${isDragging ? " dragging" : ""}`}
      title="Drag to move block"
      aria-label="Drag to move block"
      {...attributes}
      {...listeners}
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical size={12} />
    </button>
  );
}
