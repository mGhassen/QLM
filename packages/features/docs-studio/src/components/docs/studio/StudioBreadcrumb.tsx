"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@guepard/ui/utils";
import { BLOCK_LABELS } from "#/lib/block-fields";
import { findBlockById } from "#/lib/serialize";
import { getAncestorIds } from "#/lib/canvas-drop";
import type { BlockNode } from "#/lib/types";

interface StudioBreadcrumbProps {
  blocks: BlockNode[];
  selectedId: string | null;
  textEdit?: boolean;
  onSelect: (id: string) => void;
}

export default function StudioBreadcrumb({ blocks, selectedId, textEdit, onSelect }: StudioBreadcrumbProps) {
  if (!selectedId) return null;

  const chain = [...getAncestorIds(blocks, selectedId), selectedId]
    .map((id) => findBlockById(blocks, id))
    .filter(Boolean) as BlockNode[];

  if (chain.length === 0) return null;

  return (
    <div
      data-studio-chrome
      className="studio-breadcrumb border-sidebar-border text-sidebar-foreground/65 flex shrink-0 items-center gap-1 overflow-x-auto border-b px-3 py-1.5 text-[11px]"
    >
      {chain.map((block, i) => (
        <span key={block.id} className="flex shrink-0 items-center gap-1">
          {i > 0 && <ChevronRight size={10} className="text-sidebar-foreground/40" />}
          <button
            type="button"
            onClick={() => onSelect(block.id)}
            className={cn(
              "hover:text-sidebar-foreground transition-colors",
              i === chain.length - 1 && !textEdit && "text-sidebar-foreground font-medium",
            )}
          >
            {BLOCK_LABELS[block.type] ?? block.type}
          </button>
        </span>
      ))}
      {textEdit && (
        <span className="flex shrink-0 items-center gap-1">
          <ChevronRight size={10} className="text-sidebar-foreground/40" />
          <span className="text-sidebar-foreground font-medium">Text</span>
        </span>
      )}
    </div>
  );
}
