"use client";

import type { CSSProperties } from "react";
import type { CanvasDropTarget } from "#/lib/canvas-drop";
import type { BlockNode, ChromeZoneId, DocChrome, DocDocument, DocLayoutMode, DocPageFormat, DocPageSetup } from "#/lib/types";
import { resolvePageSetup, pageSetupToStyle } from "#/lib/page-setup";
import DocRenderer from "./DocRenderer";
import PaginatedDocLayout from "./PaginatedDocLayout";
import "./docs-print.css";

interface DocLayoutProps {
  title: string;
  layoutMode?: DocLayoutMode;
  pageFormat?: DocPageFormat;
  pageSetup?: DocPageSetup;
  chrome?: DocChrome;
  themeStyle?: CSSProperties;
  blocks: BlockNode[];
  body?: string;
  flowDocument?: DocDocument;
  onBodyChange?: (body: string) => void;
  autoFocusBody?: boolean;
  documentBlocks?: BlockNode[];
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
  onInsertBlock?: (targetId: string, block: BlockNode, position: "before" | "after" | "inside") => void;
  dragBlockId?: string | null;
  dropTarget?: CanvasDropTarget | null;
  onPageCountChange?: (count: number) => void;
  onPagesChange?: (pages: BlockNode[][]) => void;
  onPageDrop?: (blockId: string, pageIndex: number, position: "start" | "end") => void;
  onPageInsert?: (pageIndex: number, block: BlockNode) => void;
  packedPages?: BlockNode[][];
  selectedChromeZone?: ChromeZoneId | null;
  onChromeZoneSelect?: (zone: ChromeZoneId) => void;
}

export default function DocLayout({
  title,
  layoutMode = "paginated",
  pageFormat,
  pageSetup,
  chrome,
  themeStyle,
  blocks,
  body,
  flowDocument,
  onBodyChange,
  autoFocusBody,
  documentBlocks,
  sections,
  docSlug,
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
  onPageCountChange,
  onPagesChange,
  onPageDrop,
  onPageInsert,
  packedPages,
  selectedChromeZone,
  onChromeZoneSelect,
}: DocLayoutProps) {
  const mode = layoutMode ?? "paginated";
  const resolvedSetup = resolvePageSetup(pageSetup, pageFormat);
  const setupStyle = pageSetupToStyle(resolvedSetup);
  const combinedStyle = { ...setupStyle, ...themeStyle };

  const rendererProps = {
    documentBlocks: documentBlocks ?? blocks,
    sections,
    docSlug,
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
    onPagesChange,
    onPageDrop,
    onPageInsert,
    packedPages,
  };

  if (mode === "web") {
    return (
      <div className="doc-shell layout-web" data-doc-title={title} style={setupStyle}>
        <div className="doc-page doc-layout-web" style={combinedStyle}>
          <DocRenderer blocks={blocks} {...rendererProps} />
        </div>
      </div>
    );
  }

  return (
    <PaginatedDocLayout
      title={title}
      chrome={chrome}
      resolvedSetup={resolvedSetup}
      setupStyle={setupStyle}
      combinedStyle={combinedStyle}
      blocks={blocks}
      body={body}
      flowDocument={flowDocument}
      onBodyChange={onBodyChange}
      autoFocusBody={autoFocusBody}
      onPageCountChange={onPageCountChange}
      selectedChromeZone={selectedChromeZone}
      onChromeZoneSelect={onChromeZoneSelect}
      {...rendererProps}
    />
  );
}
