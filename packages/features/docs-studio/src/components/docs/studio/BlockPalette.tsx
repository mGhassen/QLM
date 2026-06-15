"use client";

import { useDraggable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { cn } from "@guepard/ui/utils";
import { paletteDragId } from "#/lib/canvas-drop";
import { createBlock } from "#/lib/serialize";
import { PALETTE_CATEGORIES, type PaletteItem } from "#/lib/palette";
import type { BlockNode } from "#/lib/types";
import LayoutPresetPicker from "./LayoutPresetPicker";

interface BlockPaletteProps {
  onInsert: (block: BlockNode) => void;
}

function PaletteDraggableButton({
  item,
  onInsert,
}: {
  item: PaletteItem;
  onInsert: (block: BlockNode) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: paletteDragId(item.type),
    data: { paletteType: item.type, source: "palette" },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onInsert(createBlock(item.type, item.overrides))}
      className={cn(
        "border-border text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex touch-none items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
        isDragging && "opacity-40",
      )}
      title="Click to insert or drag onto canvas"
      {...attributes}
      {...listeners}
    >
      <Plus size={12} />
      {item.label}
    </button>
  );
}

export default function BlockPalette({ onInsert }: BlockPaletteProps) {
  return (
    <div className="space-y-4 p-2">
      <LayoutPresetPicker onSelect={onInsert} />
      {PALETTE_CATEGORIES.map((cat) => (
        <div key={cat.id}>
          <div className="text-sidebar-foreground/50 mb-1.5 px-1 text-[10px] font-medium tracking-[0.12em] uppercase">
            {cat.label}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cat.items.map((item) => (
              <PaletteDraggableButton key={`${cat.id}-${item.label}`} item={item} onInsert={onInsert} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
