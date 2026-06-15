"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { canvasDragId } from "#/lib/canvas-drop";

interface BlockGutterHandleProps {
  blockId: string;
  visible: boolean;
}

export default function BlockGutterHandle({ blockId, visible }: BlockGutterHandleProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: canvasDragId(blockId),
    data: { blockId, source: "canvas" },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`studio-block-gutter${visible || isDragging ? " visible" : ""}${isDragging ? " dragging" : ""}`}
      title="Drag to reorder"
      aria-label="Drag to reorder block"
      {...attributes}
      {...listeners}
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical size={14} />
    </button>
  );
}
