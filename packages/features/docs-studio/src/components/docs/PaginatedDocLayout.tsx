"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { CSSProperties } from "react";
import type { BlockNode, ChromeZoneId, DocChrome } from "#/lib/types";
import type { ResolvedPageSetup } from "#/lib/page-setup";
import {
  blocksToLayoutItems,
  layoutItemsEqual,
  layoutStructureKey,
  packedPagesEqual,
  syncItemBlocks,
  syncPackedPageBlocks,
  type PackedPage,
} from "#/lib/layout-items";
import { packLayoutItems } from "#/lib/pack-pages";
import { resolveBlockContent } from "#/lib/content";
import { splitBlockContentAtPartCount } from "#/lib/block-split";
import {
  blocksForItemMeasure,
  fragmentsForItemMeasure,
  fragmentsForPartMeasure,
  itemMeasureWidthPx,
} from "#/lib/measure-layout-item";
import { measureUnitBlocksHeight } from "#/lib/measure-unit-height";
import { refineItemsOnce } from "#/lib/refine-layout-items";
import type { PageBodyBudgetContext } from "#/lib/page-body-budget";
import { getPageContentWidthPx } from "#/lib/page-metrics";
import { pageHasCover, resolveDocChrome } from "#/lib/chrome";
import { splitBlocksIntoPages } from "#/lib/pages";
import { itemPackContentHeight } from "#/lib/item-pack-height";
import { isDocLayoutPaused } from "#/lib/layout-pause";
import { itemsNeedRepack } from "#/lib/pagination-props";
import { flowDocumentToLayoutItems } from "#/lib/body-segments";
import { DOC_VERSION_FLOW } from "#/lib/flow-doc";
import type { DocDocument } from "#/lib/types";
import FlowDocViewport from "./studio/FlowDocViewport";
import DocRenderer from "./DocRenderer";
import DocPageChrome from "./DocPageChrome";
import StudioDocChrome from "./studio/StudioDocChrome";
import PageGapInsert from "./studio/PageGapInsert";
import StudioPageChrome from "./studio/StudioPageChrome";
import { createBlock } from "#/lib/serialize";

interface RendererProps {
  documentBlocks?: BlockNode[];
  packedPages?: BlockNode[][];
  sections: Record<string, string>;
  studioMode?: boolean;
  selectedId?: string | null;
  onSelectBlock?: (id: string) => void;
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
  onNestBlock?: (blockId: string, targetParentId: string) => void;
  dragBlockId?: string | null;
  onPageDrop?: (blockId: string, pageIndex: number, position: "start" | "end") => void;
  onPageInsert?: (pageIndex: number, block: BlockNode) => void;
  onPagesChange?: (pages: BlockNode[][]) => void;
}

interface PaginatedDocLayoutProps extends RendererProps {
  title: string;
  chrome?: DocChrome;
  resolvedSetup: ResolvedPageSetup;
  setupStyle: CSSProperties;
  combinedStyle: CSSProperties;
  blocks: BlockNode[];
  body?: string;
  flowDocument?: DocDocument;
  onBodyChange?: (body: string) => void;
  autoFocusBody?: boolean;
  onPageCountChange?: (count: number) => void;
  selectedChromeZone?: ChromeZoneId | null;
  onChromeZoneSelect?: (zone: ChromeZoneId) => void;
}

function pageChromeFlags(pageBlocks: BlockNode[], chrome: DocChrome | undefined, title: string, page: number, total: number) {
  const isCover = pageHasCover(pageBlocks);
  const resolved = resolveDocChrome(chrome, { title, page, total });
  const onCover = isCover && !resolved.showOnCover;
  return {
    isCover,
    showHeader: resolved.showHeader && !onCover,
    showFooter: resolved.showFooter && !onCover,
    resolved,
  };
}

export default function PaginatedDocLayout({
  title,
  chrome,
  resolvedSetup,
  setupStyle,
  combinedStyle,
  blocks,
  body,
  flowDocument,
  onBodyChange,
  autoFocusBody,
  onPageCountChange,
  selectedChromeZone,
  onChromeZoneSelect,
  ...rendererProps
}: PaginatedDocLayoutProps) {
  const flowMode = Boolean(onBodyChange);
  const flowBodyRead = useMemo(() => {
    if (flowMode || !flowDocument?.body?.trim()) return false;
    return !blocks.some((block) => block.type !== "cover" && block.type !== "break");
  }, [flowMode, flowDocument, blocks]);
  const useFlowLayout = flowMode || flowBodyRead;
  const docForItems = useMemo(
    () => flowDocument ?? { version: DOC_VERSION_FLOW, blocks, body: body ?? "" },
    [flowDocument, blocks, body],
  );
  const baseItems = useMemo(
    () => (useFlowLayout ? flowDocumentToLayoutItems(docForItems) : blocksToLayoutItems(blocks)),
    [useFlowLayout, docForItems, blocks],
  );
  const baseStructureKey = useMemo(() => layoutStructureKey(baseItems), [baseItems]);
  const [items, setItems] = useState(baseItems);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const structureKeyRef = useRef(baseStructureKey);
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PackedPage[]>(() =>
    splitBlocksIntoPages(blocks).map((pageBlocks) => ({ blocks: pageBlocks, fragments: {} })),
  );
  const [pageDropTarget, setPageDropTarget] = useState<{
    page: number;
    position: "start" | "end";
  } | null>(null);
  const onPagesChangeRef = useRef(rendererProps.onPagesChange);
  onPagesChangeRef.current = rendererProps.onPagesChange;
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const repaginateRef = useRef<() => void>(() => {});
  const resizeRafRef = useRef(0);

  const contentWidthPx = getPageContentWidthPx(resolvedSetup);
  const budgetCtx = useMemo<PageBodyBudgetContext>(
    () => ({ setup: resolvedSetup, chrome, title }),
    [resolvedSetup, chrome, title],
  );

  useLayoutEffect(() => {
    if (useFlowLayout) {
      itemsRef.current = baseItems;
      if (!layoutItemsEqual(items, baseItems)) {
        setItems(baseItems);
      }
      structureKeyRef.current = baseStructureKey;
      queueMicrotask(() => repaginateRef.current());
      return;
    }

    if (structureKeyRef.current !== baseStructureKey) {
      structureKeyRef.current = baseStructureKey;
      itemsRef.current = baseItems;
      setItems(baseItems);
      queueMicrotask(() => repaginateRef.current());
      return;
    }

    const synced = syncItemBlocks(itemsRef.current, blocks);
    const repack = itemsNeedRepack(itemsRef.current, synced);
    itemsRef.current = synced;

    const displaySyncNeeded = synced.some(
      (item, i) => item.block !== items[i]?.block,
    );
    if (!layoutItemsEqual(synced, items) || displaySyncNeeded) {
      setItems(synced);
    }

    setPages((prev) => {
      const syncedPages = syncPackedPageBlocks(prev, blocks);
      return syncedPages === prev ? prev : syncedPages;
    });

    if (repack) {
      queueMicrotask(() => repaginateRef.current());
    }
  }, [baseStructureKey, baseItems, blocks, items, useFlowLayout]);

  const repaginate = useCallback(() => {
    const root = measureRef.current;
    if (!root) return;

    const readHeights = () => {
      const heights = new Map<string, number>();
      for (const item of itemsRef.current) {
        const node = root.querySelector<HTMLElement>(`[data-layout-item="${CSS.escape(item.key)}"]`);
        const measured = node?.getBoundingClientRect().height ?? 0;
        if (measured > 0) {
          heights.set(item.key, itemPackContentHeight(item.block, measured));
        }
      }
      return heights;
    };

    const measurePartHeight = (item: (typeof items)[number], partCount: number) => {
      const content = resolveBlockContent(item.block, rendererProps.sections, item.fragment);
      const [first] = splitBlockContentAtPartCount(content, partCount);
      return measureUnitBlocksHeight(
        blocksForItemMeasure(item),
        rendererProps.sections,
        itemMeasureWidthPx(item, contentWidthPx),
        false,
        fragmentsForPartMeasure(item, first),
      );
    };

    const measureItemHeight = (item: (typeof items)[number]) =>
      measureUnitBlocksHeight(
        blocksForItemMeasure(item),
        rendererProps.sections,
        itemMeasureWidthPx(item, contentWidthPx),
        false,
        fragmentsForItemMeasure(item),
      );

    let workingItems = itemsRef.current;
    let heights = readHeights();
    if (heights.size < workingItems.length) {
      for (const item of workingItems) {
        if (heights.has(item.key)) continue;
        const measured = measureItemHeight(item);
        heights.set(item.key, itemPackContentHeight(item.block, measured));
      }
    }

    for (let i = 0; i < 24; i++) {
      const refined = refineItemsOnce(
        workingItems,
        heights,
        budgetCtx,
        rendererProps.sections,
        measurePartHeight,
      );
      if (!refined || layoutItemsEqual(refined, workingItems)) break;

      workingItems = refined;
      heights = new Map<string, number>();
      for (const item of workingItems) {
        const measured = measureItemHeight(item);
        heights.set(item.key, itemPackContentHeight(item.block, measured));
      }
    }

    if (!layoutItemsEqual(workingItems, itemsRef.current)) {
      itemsRef.current = workingItems;
      setItems(workingItems);
    }

    const packed = packLayoutItems(workingItems, heights, budgetCtx);
    if (!packedPagesEqual(packed, pagesRef.current)) {
      setPages(packed);
      onPageCountChange?.(packed.length);
      onPagesChangeRef.current?.(packed.map((page) => page.blocks));
    }
  }, [
    budgetCtx,
    contentWidthPx,
    onPageCountChange,
    rendererProps.sections,
  ]);

  repaginateRef.current = repaginate;

  const scheduleRepaginate = useCallback(() => {
    if (isDocLayoutPaused()) return;
    cancelAnimationFrame(resizeRafRef.current);
    resizeRafRef.current = requestAnimationFrame(() => {
      if (isDocLayoutPaused()) return;
      repaginateRef.current();
    });
  }, []);

  const itemKeys = useMemo(() => items.map((item) => item.key).join("\0"), [items]);

  useLayoutEffect(() => {
    onPagesChangeRef.current?.(pagesRef.current.map((page) => page.blocks));
    queueMicrotask(() => repaginateRef.current());
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!isDocLayoutPaused()) repaginateRef.current();
    }, 200);
    return () => window.clearTimeout(id);
  }, [rendererProps.sections]);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(
      ".doc-shell.layout-paginated .doc-page-sheet.has-header .doc-page-body",
    );
    if (!el) return;

    let ignore = true;
    const observer = new ResizeObserver(() => {
      if (ignore) return;
      scheduleRepaginate();
    });
    observer.observe(el);
    requestAnimationFrame(() => {
      ignore = false;
    });
    return () => {
      ignore = true;
      observer.disconnect();
    };
  }, [scheduleRepaginate, pages.length]);

  useEffect(() => {
    const root = measureRef.current;
    if (!root) return;

    let ignore = true;
    const observer = new ResizeObserver(() => {
      if (ignore) return;
      scheduleRepaginate();
    });
    root.querySelectorAll("[data-layout-item]").forEach((node) => observer.observe(node));
    observer.observe(root);
    requestAnimationFrame(() => {
      ignore = false;
    });
    return () => {
      ignore = true;
      observer.disconnect();
    };
  }, [scheduleRepaginate, itemKeys]);

  const total = pages.length;
  const { studioMode, dragBlockId, onPageDrop } = rendererProps;

  const ChromeComponent = studioMode ? StudioDocChrome : DocPageChrome;
  const chromeProps = studioMode
    ? { activeZone: selectedChromeZone, onZoneSelect: onChromeZoneSelect }
    : {};

  function handlePageDrop(e: DragEvent, pageIndex: number, position: "start" | "end") {
    e.preventDefault();
    setPageDropTarget(null);
    if (!dragBlockId || !onPageDrop) return;
    onPageDrop(dragBlockId, pageIndex, position);
  }

  function handleFlowBodyChange(nextBody: string) {
    onBodyChange?.(nextBody);
    queueMicrotask(() => repaginateRef.current());
  }

  if (useFlowLayout) {
    return (
      <>
        <div
          ref={measureRef}
          className="doc-measure-column doc-page"
          aria-hidden
          style={{
            ...combinedStyle,
            position: "fixed",
            left: -10000,
            top: 0,
            visibility: "hidden",
            pointerEvents: "none",
            width: contentWidthPx,
            zIndex: -1,
          }}
        >
          {items.map((item) => (
            <div key={item.key} data-layout-item={item.key}>
              <DocRenderer
                blocks={blocksForItemMeasure(item)}
                sections={rendererProps.sections}
                pageFragments={fragmentsForItemMeasure(item)}
              />
            </div>
          ))}
        </div>

        <div
          className="doc-shell layout-paginated layout-flow-doc"
          data-doc-title={title}
          data-page-format={resolvedSetup.format === "custom" ? "custom" : resolvedSetup.format}
          data-page-orientation={resolvedSetup.orientation}
          style={setupStyle}
        >
          <FlowDocViewport
            title={title}
            body={body ?? ""}
            onBodyChange={handleFlowBodyChange}
            blocks={blocks}
            sections={rendererProps.sections}
            pages={pages}
            chrome={chrome}
            resolvedSetup={resolvedSetup}
            combinedStyle={combinedStyle}
            studioMode={studioMode}
            autoFocus={autoFocusBody}
            selectedChromeZone={selectedChromeZone}
            onChromeZoneSelect={onChromeZoneSelect}
            onLayoutChange={() => scheduleRepaginate()}
            onPageInsert={rendererProps.onPageInsert}
          />
        </div>
      </>
    );
  }

  const { onPageInsert } = rendererProps;

  return (
    <>
      <div
        ref={measureRef}
        className="doc-measure-column doc-page"
        aria-hidden
        style={{
          ...combinedStyle,
          position: "fixed",
          left: -10000,
          top: 0,
          visibility: "hidden",
          pointerEvents: "none",
          width: contentWidthPx,
          zIndex: -1,
        }}
      >
        {items.map((item) => (
          <div key={item.key} data-layout-item={item.key}>
            <DocRenderer
              blocks={blocksForItemMeasure(item)}
              sections={rendererProps.sections}
              pageFragments={fragmentsForItemMeasure(item)}
            />
          </div>
        ))}
      </div>

      <div
        className="doc-shell layout-paginated"
        data-doc-title={title}
        data-page-format={resolvedSetup.format === "custom" ? "custom" : resolvedSetup.format}
        data-page-orientation={resolvedSetup.orientation}
        data-print-size={
          resolvedSetup.format === "custom"
            ? `${resolvedSetup.widthMm}mm ${resolvedSetup.heightMm}mm`
            : resolvedSetup.printSize
        }
        data-print-margins={`${resolvedSetup.printMargins.top},${resolvedSetup.printMargins.right},${resolvedSetup.printMargins.bottom},${resolvedSetup.printMargins.left}`}
        style={setupStyle}
      >
        {pages.map((page, i) => {
          const pageNum = i + 1;
          const { isCover, showHeader, showFooter, resolved } = pageChromeFlags(
            page.blocks,
            chrome,
            title,
            pageNum,
            total,
          );

          const showGuides = studioMode && resolvedSetup.showMarginGuides;

          const isEmptyPage = page.blocks.length === 0;

          return (
            <div
              key={`doc-page-${pageNum}-${page.blocks.map((b) => b.id).join("-")}`}
              className="studio-page-unit"
              data-source-page-id={page.sourcePageId}
              data-page-continuation={page.isContinuation ? "true" : undefined}
            >
              {studioMode && (
                <StudioPageChrome
                  pageNumber={pageNum}
                  isContinuation={page.isContinuation}
                  onAddSection={
                    onPageInsert
                      ? () => onPageInsert(i, createBlock("section"))
                      : undefined
                  }
                  onInsertBlock={onPageInsert ? (block) => onPageInsert(i, block) : undefined}
                />
              )}
              <div
                className={`doc-page doc-page-sheet${showHeader ? " has-header" : ""}${showFooter ? " has-footer" : ""}${isCover ? " is-cover-page" : ""}${showGuides ? " show-margin-guides" : ""}`}
                data-page={pageNum}
                data-page-total={total}
                style={combinedStyle}
              >
                {showHeader && (
                  <ChromeComponent chrome={resolved} position="header" {...chromeProps} />
                )}
                <div className="doc-page-body">
                  {studioMode && dragBlockId && onPageDrop && (
                    <>
                      <div
                        className={`studio-page-drop studio-page-drop-top${
                          pageDropTarget?.page === pageNum && pageDropTarget.position === "start"
                            ? " active"
                            : ""
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setPageDropTarget({ page: pageNum, position: "start" });
                        }}
                        onDragLeave={() => setPageDropTarget(null)}
                        onDrop={(e) => handlePageDrop(e, pageNum - 1, "start")}
                      />
                      <div
                        className={`studio-page-drop studio-page-drop-bottom${
                          pageDropTarget?.page === pageNum && pageDropTarget.position === "end"
                            ? " active"
                            : ""
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setPageDropTarget({ page: pageNum, position: "end" });
                        }}
                        onDragLeave={() => setPageDropTarget(null)}
                        onDrop={(e) => handlePageDrop(e, pageNum - 1, "end")}
                      />
                    </>
                  )}
                  {isEmptyPage && studioMode && onPageInsert ? (
                    <button
                      type="button"
                      className="studio-empty-page-insert"
                      onClick={() => onPageInsert(i, createBlock("paragraph"))}
                    >
                      + Add content
                    </button>
                  ) : (
                    <DocRenderer
                      blocks={page.blocks}
                      pageFragments={page.fragments}
                      {...rendererProps}
                    />
                  )}
                </div>
                {showFooter && (
                  <ChromeComponent chrome={resolved} position="footer" {...chromeProps} />
                )}
              </div>
              {studioMode && onPageInsert && (
                <PageGapInsert onInsert={(block) => onPageInsert(i, block)} />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
