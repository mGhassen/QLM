"use client";

import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronRight,
  ChevronDown,
  Trash2,
  IndentDecrease,
  IndentIncrease,
  Type,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAncestorIds } from "#/lib/canvas-drop";
import { BLOCK_LABELS } from "#/lib/block-fields";
import { isCoverPageBlock, isCoverSection } from "#/lib/section-variant";
import { blockHasEditableText, parseTreeSelection, toTextNodeId } from "#/lib/block-text";
import { scrollTreeItemIntoView } from "#/lib/page-blocks";
import { cn } from "@qlm/ui/utils";
import type { BlockNode } from "#/lib/types";

interface BlockTreeProps {
  blocks: BlockNode[];
  selectedId: string | null;
  selectedIds?: string[];
  hoveredId?: string | null;
  onSelect: (id: string, additive?: boolean) => void;
  onDelete?: (id: string) => void;
  onIndent?: (blockId: string) => void;
  onOutdent?: (blockId: string) => void;
  canIndent?: (blockId: string) => boolean;
  canOutdent?: (blockId: string) => boolean;
}

function TextTreeItem({
  blockId,
  depth,
  selectedId,
  onSelect,
}: {
  blockId: string;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const textId = toTextNodeId(blockId);
  const selected = selectedId === textId;

  return (
    <div
      data-tree-id={textId}
      className={cn(
        "flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors",
        selected
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
      onClick={() => onSelect(textId)}
    >
      <span className="w-[18px] shrink-0" />
      <span style={{ paddingLeft: depth * 12 }} className="flex items-center gap-1.5 flex-1 min-w-0">
        <Type size={11} className="shrink-0 text-muted-foreground/40" />
        <span className="truncate">Text</span>
      </span>
    </div>
  );
}

function blockTreeLabel(block: BlockNode): string {
  if (block.type === "page") return isCoverPageBlock(block) ? "Cover page" : "Page";
  if (isCoverSection(block)) return "Cover section";
  return BLOCK_LABELS[block.type] ?? block.type;
}

function treeItemClass(blockId: string, selectedId: string | null, selectedIds: string[], hoveredId?: string | null) {
  if (selectedId === blockId) return "bg-sidebar-accent text-sidebar-accent-foreground font-medium";
  if (selectedIds.includes(blockId)) return "bg-primary/15 text-foreground";
  if (hoveredId === blockId) return "bg-sidebar-accent/70 text-sidebar-foreground";
  return "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground";
}

function SortableItem({
  block,
  depth,
  selectedId,
  selectedIds,
  hoveredId,
  onSelect,
  expanded,
  onToggle,
  hasChildren,
  hasText,
  onDelete,
  onIndent,
  onOutdent,
  canIndent,
  canOutdent,
}: {
  block: BlockNode;
  depth: number;
  selectedId: string | null;
  selectedIds: string[];
  hoveredId?: string | null;
  onSelect: (id: string, additive?: boolean) => void;
  expanded: boolean;
  onToggle: () => void;
  hasChildren: boolean;
  hasText: boolean;
  onDelete?: (id: string) => void;
  onIndent?: (blockId: string) => void;
  onOutdent?: (blockId: string) => void;
  canIndent?: (blockId: string) => boolean;
  canOutdent?: (blockId: string) => boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { blockId: block.id, source: "tree" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const highlighted = selectedId === block.id || hoveredId === block.id;
  const expandable = hasChildren || hasText;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-tree-id={block.id}
      className={cn(
        "group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors",
        treeItemClass(block.id, selectedId, selectedIds, hoveredId),
      )}
      onClick={(e) => onSelect(block.id, e.metaKey || e.ctrlKey || e.shiftKey)}
    >
      <button
        type="button"
        className="text-sidebar-foreground/35 hover:text-sidebar-foreground/70 touch-none p-0.5"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={12} />
      </button>
      <span style={{ paddingLeft: depth * 12 }} className="flex items-center gap-1 flex-1 min-w-0">
        {expandable ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(); }} className="p-0">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <span className="truncate">{blockTreeLabel(block)}</span>
        <span className="text-muted-foreground/30 truncate font-mono text-[10px]">{block.id}</span>
      </span>
      {highlighted && onOutdent && canOutdent?.(block.id) && (
        <button
          type="button"
          title="Move out (Alt+←)"
          className="shrink-0 p-1 rounded text-muted-foreground/30 hover:text-muted-foreground/70 hover:bg-accent"
          onClick={(e) => {
            e.stopPropagation();
            onOutdent(block.id);
          }}
        >
          <IndentDecrease size={12} />
        </button>
      )}
      {highlighted && onIndent && canIndent?.(block.id) && (
        <button
          type="button"
          title="Move in (Alt+→)"
          className="shrink-0 p-1 rounded text-muted-foreground/30 hover:text-muted-foreground/70 hover:bg-accent"
          onClick={(e) => {
            e.stopPropagation();
            onIndent(block.id);
          }}
        >
          <IndentIncrease size={12} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          title="Delete block"
          className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(block.id);
          }}
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

function TreeLevel({
  blocks,
  depth,
  selectedId,
  selectedIds,
  hoveredId,
  onSelect,
  expanded,
  onToggle,
  onDelete,
  onIndent,
  onOutdent,
  canIndent,
  canOutdent,
}: {
  blocks: BlockNode[];
  depth: number;
  selectedId: string | null;
  selectedIds: string[];
  hoveredId?: string | null;
  onSelect: (id: string, additive?: boolean) => void;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  onIndent?: (blockId: string) => void;
  onOutdent?: (blockId: string) => void;
  canIndent?: (blockId: string) => boolean;
  canOutdent?: (blockId: string) => boolean;
}) {
  return (
    <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
      {blocks.map((block) => {
        const hasChildren = !!(block.children && block.children.length > 0);
        const hasText = blockHasEditableText(block);
        const isExpanded = expanded[block.id] !== false;

        return (
          <div key={block.id}>
            <SortableItem
              block={block}
              depth={depth}
              selectedId={selectedId}
              selectedIds={selectedIds}
              hoveredId={hoveredId}
              onSelect={onSelect}
              expanded={isExpanded}
              onToggle={() => onToggle(block.id)}
              hasChildren={hasChildren}
              hasText={hasText}
              onDelete={onDelete}
              onIndent={onIndent}
              onOutdent={onOutdent}
              canIndent={canIndent}
              canOutdent={canOutdent}
            />
            {isExpanded && hasText && (
              <TextTreeItem
                blockId={block.id}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            )}
            {hasChildren && isExpanded && (
              <TreeLevel
                blocks={block.children!}
                depth={depth + 1}
                selectedId={selectedId}
                selectedIds={selectedIds}
                hoveredId={hoveredId}
                onSelect={onSelect}
                expanded={expanded}
                onToggle={onToggle}
                onDelete={onDelete}
                onIndent={onIndent}
                onOutdent={onOutdent}
                canIndent={canIndent}
                canOutdent={canOutdent}
              />
            )}
          </div>
        );
      })}
    </SortableContext>
  );
}

export default function BlockTree({
  blocks,
  selectedId,
  selectedIds = [],
  hoveredId,
  onSelect,
  onDelete,
  onIndent,
  onOutdent,
  canIndent,
  canOutdent,
}: BlockTreeProps) {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const skipTreeScroll = useRef(false);

  const handleSelect = useCallback(
    (id: string, additive?: boolean) => {
      skipTreeScroll.current = true;
      onSelect(id, additive);
    },
    [onSelect],
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!selectedId) return;

    const { blockId } = parseTreeSelection(selectedId);
    const ancestors = getAncestorIds(blocks, blockId);

    setExpanded((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of ancestors) {
        if (prev[id] === false) {
          next[id] = true;
          changed = true;
        }
      }
      if (selectedId.startsWith("text:") && prev[blockId] === false) {
        next[blockId] = true;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [selectedId, blocks]);

  useEffect(() => {
    if (!selectedId) return;
    if (skipTreeScroll.current) {
      skipTreeScroll.current = false;
      return;
    }
    const id = selectedId;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => scrollTreeItemIntoView(id));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [selectedId, expanded, mounted]);

  if (!mounted) {
    return (
      <BlockTreeStatic
        blocks={blocks}
        selectedId={selectedId}
        selectedIds={selectedIds}
        hoveredId={hoveredId}
        onSelect={handleSelect}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div className="p-2">
      <TreeLevel
        blocks={blocks}
        depth={0}
        selectedId={selectedId}
        selectedIds={selectedIds}
        hoveredId={hoveredId}
        onSelect={handleSelect}
        expanded={expanded}
        onToggle={(id) => setExpanded((e) => ({ ...e, [id]: e[id] === false }))}
        onDelete={onDelete}
        onIndent={onIndent}
        onOutdent={onOutdent}
        canIndent={canIndent}
        canOutdent={canOutdent}
      />
    </div>
  );
}

function BlockTreeStatic({
  blocks,
  selectedId,
  selectedIds,
  hoveredId,
  onSelect,
  onDelete,
  depth = 0,
}: {
  blocks: BlockNode[];
  selectedId: string | null;
  selectedIds: string[];
  hoveredId?: string | null;
  onSelect: (id: string, additive?: boolean) => void;
  onDelete?: (id: string) => void;
  depth?: number;
}) {
  return (
    <>
      {blocks.map((block) => {
        const hasText = blockHasEditableText(block);
        return (
          <div key={block.id}>
            <div
              data-tree-id={block.id}
              className={cn(
                "group flex w-full cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors",
                treeItemClass(block.id, selectedId, selectedIds, hoveredId),
              )}
              style={{ paddingLeft: 8 + depth * 12 }}
              onClick={(e) => onSelect(block.id, e.metaKey || e.ctrlKey || e.shiftKey)}
            >
              <span className="w-3 shrink-0" />
              <span className="capitalize truncate flex-1 min-w-0">{block.type}</span>
              <span className="text-muted-foreground/30 truncate font-mono text-[10px]">{block.id}</span>
              {onDelete && (
                <button
                  type="button"
                  title="Delete block"
                  className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(block.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            {hasText && (
              <TextTreeItem
                blockId={block.id}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            )}
            {block.children && block.children.length > 0 && (
              <BlockTreeStatic
                blocks={block.children}
                selectedId={selectedId}
                selectedIds={selectedIds}
                hoveredId={hoveredId}
                onSelect={onSelect}
                onDelete={onDelete}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export { sortableKeyboardCoordinates };
