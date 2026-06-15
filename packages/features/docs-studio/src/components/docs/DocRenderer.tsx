"use client";

import { blockRegistry } from "#/lib/blockRegistry";
import { resolveBlockContent } from "#/lib/content";
import type { CanvasDropTarget } from "#/lib/canvas-drop";
import { fragmentDataAttrs, takePageFragment, type BlockPageFragment } from "#/lib/page-fragment";
import type { BlockNode } from "#/lib/types";
import type { ReactNode } from "react";
import StudioBlockWrapper from "./studio/StudioBlockWrapper";
import { blockAppearanceProps, hasBlockAppearance } from "#/lib/block-appearance";
import { canBlockResize } from "#/lib/studio-transform";
import { canMoveBlock } from "#/lib/block-order";
import { canMoveBlockOnPages } from "#/lib/page-blocks";

interface DocRendererProps {
  blocks: BlockNode[];
  documentBlocks?: BlockNode[];
  packedPages?: BlockNode[][];
  sections: Record<string, string>;
  docSlug?: string;
  studioMode?: boolean;
  selectedId?: string | null;
  selectedIds?: string[];
  textEditBlockId?: string | null;
  hoveredId?: string | null;
  onSelectBlock?: (id: string, additive?: boolean) => void;
  onSelectText?: (blockId: string) => void;
  onHoverBlock?: (id: string | null) => void;
  onContentChange?: (blockId: string, content: string) => void;
  onPropsChange?: (blockId: string, props: Record<string, unknown>) => void;
  onDeleteBlock?: (id: string) => void;
  onDuplicateBlock?: (id: string) => void;
  onMoveBlock?: (id: string, direction: "up" | "down") => void;
  onInsertBlock?: (
    targetId: string,
    block: BlockNode,
    position: "before" | "after" | "inside",
    insideIndex?: number,
  ) => void;
  dragBlockId?: string | null;
  dropTarget?: CanvasDropTarget | null;
  /** Virtual page slices — keyed by block id, never mutates document blocks. */
  pageFragments?: Record<string, BlockPageFragment>;
}

function hasContent(block: BlockNode): boolean {
  return block.contentRef !== undefined || block.content !== undefined;
}

function blockRenderKey(block: BlockNode, fragment?: BlockPageFragment, occurrence = 0): string {
  const fragPart = fragment ? `#${fragment.index}` : "";
  const occPart = occurrence > 0 ? `@${occurrence}` : "";
  return `${block.id}${fragPart}${occPart}`;
}

function withStudio<T extends Record<string, unknown>>(
  result: T,
  block: BlockNode,
  content: string,
  studioMode?: boolean,
  onContentChange?: (id: string, content: string) => void,
  onSelectText?: (blockId: string) => void,
  onPropsChange?: (id: string, props: Record<string, unknown>) => void,
  onInsertBlock?: (
    targetId: string,
    block: BlockNode,
    position: "before" | "after" | "inside",
    insideIndex?: number,
  ) => void,
): T {
  const base = hasContent(block) ? { ...result, content } : result;
  if (!studioMode) return base;

  const studio: Record<string, unknown> = { editable: true, blockId: block.id };
  studio.onActivate = () => onSelectText?.(block.id);
  if (hasContent(block) && onContentChange) {
    studio.onChange = (c: string) => onContentChange(block.id, c);
  }
  if (onPropsChange) {
    studio.onPropChange = (key: string, value: unknown) =>
      onPropsChange(block.id, { ...block.props, [key]: value });
  }
  if (onInsertBlock) {
    studio.onInsertAfter = (newBlock: BlockNode) => onInsertBlock(block.id, newBlock, "after");
  }
  return { ...base, ...studio } as T;
}

function blockProps(
  block: BlockNode,
  sections: Record<string, string>,
  docSlug?: string,
  studioMode?: boolean,
  selectedId?: string | null,
  onContentChange?: (id: string, content: string) => void,
  onPropsChange?: (id: string, props: Record<string, unknown>) => void,
  onSelectText?: (blockId: string) => void,
  onInsertBlock?: (
    targetId: string,
    block: BlockNode,
    position: "before" | "after" | "inside",
    insideIndex?: number,
  ) => void,
  fragment?: BlockPageFragment,
) {
  const content = resolveBlockContent(block, sections, fragment);
  const props: Record<string, unknown> = { ...(block.props ?? {}), content };

  if (studioMode) {
    if (block.type === "split" && onPropsChange) {
      props.studioMode = true;
      props.onResize = (mainFlex: number, railFlex: number) =>
        onPropsChange(block.id, { ...block.props, mainFlex, railFlex });
    }
    if (block.type === "grid") {
      props.studioMode = true;
      props.selected = selectedId === block.id;
      if (onPropsChange) {
        props.onResize = (colWidths: number[]) =>
          onPropsChange(block.id, { ...block.props, colWidths });
      }
      if (onInsertBlock) {
        props.onInsertAtCell = (cellIndex: number) => {
          onInsertBlock(block.id, { id: "", type: "paragraph", content: "" }, "inside", cellIndex);
        };
      }
    }
    if (block.type === "card" && block.props?.paddingScale) {
      props.paddingScale = block.props.paddingScale;
    }
    if (block.props?.padding) {
      props.paddingScale = (block.props.padding as number) / 4;
    }
  }

  if (block.type === "coverBody") {
    return {};
  }

  if (block.type === "break") {
    return {
      variant: (block.props?.variant as "page" | "section" | "continue") ?? "page",
      studioMode,
    };
  }

  if (block.type === "cover") {
    return {
      id: (block.props?.id as string) ?? block.id,
      pageBreak: block.props?.pageBreak as boolean,
      continuation: block.props?.continuation as boolean,
      padding: block.props?.padding as number,
    };
  }

  if (block.type === "brand") {
    return withStudio({ ...block.props }, block, content, studioMode, onContentChange, onSelectText, onPropsChange, onInsertBlock);
  }

  if (block.type === "coverSubt") {
    return withStudio(
      {
        subtitleUpColor: props.subtitleUpColor as string | undefined,
        subtitleOrColor: props.subtitleOrColor as string | undefined,
        subtitleDownColor: props.subtitleDownColor as string | undefined,
      },
      block,
      content,
      studioMode,
      onContentChange,
      onSelectText,
      onPropsChange,
      onInsertBlock,
    );
  }

  if (block.type === "coverToc") {
    return withStudio(
      {
        title: (block.props?.title as string) ?? "Au sommaire",
      },
      block,
      content,
      studioMode,
      onContentChange,
      onSelectText,
      onPropsChange,
      onInsertBlock,
    );
  }

  if (block.type === "section") {
    return {
      id: (block.props?.id as string) ?? block.id,
      variant: block.props?.variant as string | undefined,
      pageBreak: block.props?.pageBreak as boolean,
      continuation: block.props?.continuation as boolean,
      padding: block.props?.padding as number,
    };
  }

  if (block.type === "page") {
    return { studioMode };
  }

  if (block.type === "seclabel") {
    return withStudio(
      { text: (block.props?.text as string) ?? content.trim() },
      block,
      content,
      studioMode,
      onContentChange,
      onSelectText,
      onPropsChange,
      onInsertBlock,
    );
  }

  if (block.type === "opener") {
    return withStudio(
      {
        title:
          (block.props?.title as string) ??
          content.split("\n").find((l) => l.startsWith("title: "))?.replace("title: ", "") ??
          content.trim(),
        number: block.props?.number as string,
      },
      block,
      content,
      studioMode,
      onContentChange,
      onSelectText,
      onPropsChange,
      onInsertBlock,
    );
  }

  if (block.type === "levels") {
    const firstLevel = block.children?.find((child) => child.type === "level");
    return {
      headers: block.props?.headers as string[] | undefined,
      highlightLastHeader: block.props?.highlightLastHeader as boolean | undefined,
      tabWidth:
        (block.props?.tabWidth as number | undefined) ??
        (firstLevel?.props?.tabWidth as number | undefined),
      colFlex:
        (block.props?.colFlex as number[] | undefined) ??
        (firstLevel?.props?.colFlex as number[] | undefined),
      studioMode: studioMode && onPropsChange ? true : undefined,
      selected: studioMode && selectedId === block.id,
      onResize:
        studioMode && onPropsChange
          ? (colFlex: number[]) => onPropsChange(block.id, { ...block.props, colFlex })
          : undefined,
    };
  }

  if (block.type === "level") {
    return withStudio(
      {
        level: block.props?.level ?? 1,
        name: block.props?.name as string | undefined,
        highlightCol: block.props?.highlightCol as boolean | undefined,
      },
      block,
      content,
      studioMode,
      onContentChange,
      onSelectText,
      onPropsChange,
      onInsertBlock,
    );
  }

  if (block.type === "lvlcol") {
    return withStudio({}, block, content, studioMode, onContentChange, onSelectText, onPropsChange, onInsertBlock);
  }

  if (block.type === "grid") {
    return {
      cols: (block.props?.cols as 2 | 3 | 4) ?? 2,
      rows: (block.props?.rows as 1 | 2 | 3 | 4) ?? 1,
      gap: block.props?.gap as number,
      colGap: block.props?.colGap as number,
      rowGap: block.props?.rowGap as number,
      colWidths: block.props?.colWidths as number[] | undefined,
      rowHeights: block.props?.rowHeights as number[] | undefined,
      align: block.props?.align as string | undefined,
      justify: block.props?.justify as string | undefined,
      className: block.props?.className as string | undefined,
      studioMode: studioMode && onPropsChange ? true : undefined,
      selected: studioMode && selectedId === block.id,
      onResize: studioMode && onPropsChange
        ? (colWidths: number[]) => onPropsChange(block.id, { ...block.props, colWidths })
        : undefined,
    };
  }

  if (block.type === "box") {
    return {
      direction: block.props?.direction as "row" | "column" | undefined,
      align: block.props?.align as string | undefined,
      justify: block.props?.justify as string | undefined,
      gap: block.props?.gap as number | undefined,
      wrap: block.props?.wrap as boolean | undefined,
      studioMode: studioMode || undefined,
      selected: studioMode && selectedId === block.id,
      empty: studioMode && !(block.children && block.children.length > 0),
    };
  }

  if (block.type === "subheading") {
    return withStudio(
      {
        ...block.props,
        level: block.props?.level ?? 2,
        text: content,
        content,
      },
      block,
      content,
      studioMode,
      onContentChange,
      onSelectText,
      onPropsChange,
      onInsertBlock,
    );
  }

  if (block.type === "figure") {
    const lines = content.split("\n");
    return withStudio(
      {
        src: (block.props?.src as string) ?? lines.find((l) => l.startsWith("src: "))?.replace("src: ", ""),
        caption:
          (block.props?.caption as string) ??
          lines.find((l) => l.startsWith("caption: "))?.replace("caption: ", ""),
        wide: block.props?.wide,
        docSlug: studioMode ? docSlug : undefined,
      },
      block,
      content,
      studioMode,
      onContentChange,
      onSelectText,
      onPropsChange,
      onInsertBlock,
    );
  }

  if (block.type === "table") {
    return withStudio(
      {
        title: block.props?.title as string,
        variant: block.props?.variant as string,
      },
      block,
      content,
      studioMode,
      onContentChange,
      onSelectText,
      onPropsChange,
      onInsertBlock,
    );
  }

  if (block.type === "rail" && block.props?.variant === "img") {
    const src = content.match(/src:\s*(.+)/)?.[1]?.trim() ?? (block.props?.src as string);
    return withStudio(
      { variant: "img", src, docSlug: studioMode ? docSlug : undefined },
      block,
      content,
      studioMode,
      onContentChange,
      onSelectText,
      onPropsChange,
      onInsertBlock,
    );
  }

  return withStudio(props, block, content, studioMode, onContentChange, onSelectText, onPropsChange, onInsertBlock);
}

function renderBlock(
  block: BlockNode,
  sections: Record<string, string>,
  docSlug: string | undefined,
  moveContextBlocks: BlockNode[],
  packedPages: BlockNode[][] | undefined,
  studioMode?: boolean,
  selectedId?: string | null,
  selectedIds?: string[],
  textEditBlockId?: string | null,
  hoveredId?: string | null,
  onSelectBlock?: (id: string, additive?: boolean) => void,
  onSelectText?: (blockId: string) => void,
  onHoverBlock?: (id: string | null) => void,
  onContentChange?: (id: string, content: string) => void,
  onPropsChange?: (id: string, props: Record<string, unknown>) => void,
  onDeleteBlock?: (id: string) => void,
  onDuplicateBlock?: (id: string) => void,
  onMoveBlock?: (id: string, direction: "up" | "down") => void,
  onInsertBlock?: (
    targetId: string,
    block: BlockNode,
    position: "before" | "after" | "inside",
    insideIndex?: number,
  ) => void,
  dragBlockId?: string | null,
  dropTarget?: CanvasDropTarget | null,
  pageFragments?: Record<string, BlockPageFragment>,
  fragmentOccurrence?: Map<string, number>,
): ReactNode {
  const Component = blockRegistry[block.type];
  if (!Component) return null;

  const { fragment, occurrence } = takePageFragment(
    block.id,
    pageFragments,
    fragmentOccurrence ?? new Map(),
  );

  const props = blockProps(
    block,
    sections,
    docSlug,
    studioMode,
    selectedId,
    onContentChange,
    onPropsChange,
    onSelectText,
    onInsertBlock,
    fragment,
  );
  if (studioMode && textEditBlockId === block.id) {
    (props as Record<string, unknown>).editing = true;
  }
  const childOccurrence = new Map<string, number>();
  const children = block.children?.map((child) =>
    renderBlock(
      child,
      sections,
      docSlug,
      moveContextBlocks,
      packedPages,
      studioMode,
      selectedId,
      selectedIds,
      textEditBlockId,
      hoveredId,
      onSelectBlock,
      onSelectText,
      onHoverBlock,
      onContentChange,
      onPropsChange,
      onDeleteBlock,
      onDuplicateBlock,
      onMoveBlock,
      onInsertBlock,
      dragBlockId,
      dropTarget,
      pageFragments,
      childOccurrence,
    ),
  );

  const renderKey = blockRenderKey(block, fragment, occurrence);
  const isPrimary = selectedId === block.id;
  const isMultiSelected = !!selectedIds?.includes(block.id) && !isPrimary;

  const node = (
    <Component key={renderKey} {...props}>
      {children}
    </Component>
  );

  const appearance = blockAppearanceProps(block.type, block.props);
  const hasStyle = hasBlockAppearance(appearance);

  if (!studioMode) {
    if (!hasStyle && !fragment) return node;
    return (
      <div
        key={renderKey}
        className={appearance.className || undefined}
        style={appearance.style}
        {...appearance.dataAttrs}
        {...fragmentDataAttrs(fragment)}
      >
        {node}
      </div>
    );
  }

  return (
    <StudioBlockWrapper
      key={renderKey}
      block={block}
      selected={isPrimary}
      multiSelected={isMultiSelected}
      editText={textEditBlockId === block.id}
      hovered={hoveredId === block.id}
      onSelectBlock={onSelectBlock}
      onSelectText={onSelectText}
      onHover={onHoverBlock}
      onResize={
        onPropsChange && canBlockResize(block.type, block.props ?? {})
          ? (patch) => onPropsChange(block.id, { ...block.props, ...patch })
          : undefined
      }
      onSpacingChange={
        onPropsChange
          ? (patch) => onPropsChange(block.id, { ...block.props, ...patch })
          : undefined
      }
      onDelete={onDeleteBlock ? () => onDeleteBlock(block.id) : undefined}
      onDuplicate={onDuplicateBlock ? () => onDuplicateBlock(block.id) : undefined}
      onMoveUp={
        onMoveBlock &&
        (packedPages
          ? canMoveBlockOnPages(moveContextBlocks, packedPages, block.id, "up")
          : canMoveBlock(moveContextBlocks, block.id, "up"))
          ? () => onMoveBlock(block.id, "up")
          : undefined
      }
      onMoveDown={
        onMoveBlock &&
        (packedPages
          ? canMoveBlockOnPages(moveContextBlocks, packedPages, block.id, "down")
          : canMoveBlock(moveContextBlocks, block.id, "down"))
          ? () => onMoveBlock(block.id, "down")
          : undefined
      }
      onInsertAfter={
        onInsertBlock
          ? (newBlock) => onInsertBlock(block.id, newBlock, "after")
          : undefined
      }
      onInsertBefore={
        onInsertBlock
          ? (newBlock) => onInsertBlock(block.id, newBlock, "before")
          : undefined
      }
      dragBlockId={dragBlockId}
      dropTargetBlockId={dropTarget?.blockId ?? null}
      dropTargetPosition={dropTarget?.position ?? null}
      dropTargetValid={dropTarget?.valid ?? true}
    >
      {node}
    </StudioBlockWrapper>
  );
}

export default function DocRenderer({
  blocks,
  documentBlocks,
  packedPages,
  sections,
  docSlug,
  studioMode,
  selectedId,
  selectedIds = [],
  textEditBlockId,
  hoveredId,
  onSelectBlock,
  onSelectText,
  onHoverBlock,
  onContentChange,
  onPropsChange,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  onInsertBlock,
  dragBlockId,
  dropTarget,
  pageFragments,
}: DocRendererProps) {
  const moveContextBlocks = documentBlocks ?? blocks;
  const topOccurrence = new Map<string, number>();

  return (
    <>
      {blocks.map((block) =>
        renderBlock(
          block,
          sections,
          docSlug,
          moveContextBlocks,
          packedPages,
          studioMode,
          selectedId,
          selectedIds,
          textEditBlockId,
          hoveredId,
          onSelectBlock,
          onSelectText,
          onHoverBlock,
          onContentChange,
          onPropsChange,
          onDeleteBlock,
          onDuplicateBlock,
          onMoveBlock,
          onInsertBlock,
          dragBlockId,
          dropTarget,
          pageFragments,
          topOccurrence,
        ),
      )}
    </>
  );
}
