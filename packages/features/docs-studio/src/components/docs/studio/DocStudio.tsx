'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Button } from '@qlm/ui/button';
import { cn } from '@qlm/ui/utils';
import { formatShortcut, titleWithShortcut } from '#/lib/studio-shortcuts';
import '#/styles/studio-chrome.css';
import { useStudioShortcuts } from './useStudioShortcuts';
import { Save, Undo2, Redo2, FileDown, Eye, Pencil, Menu } from 'lucide-react';
import { useStudioShell } from '#/studio-shell-context';
import { docsPaths } from '#/paths';
import type { DocStudioActions } from '#/types/actions';
import DocLayout from '#/components/docs/DocLayout';
import '#/styles/studio-theme-overrides.css';
import BlockTree, { sortableKeyboardCoordinates } from './BlockTree';
import BlockPalette from './BlockPalette';
import StudioLeftRail, { type StudioLeftPanel } from './StudioLeftRail';
import StudioSecondaryPanel from './StudioSecondaryPanel';
import StudioSettingsDrawer from './StudioSettingsDrawer';
import StudioRightPanel from './StudioRightPanel';
import StudioBreadcrumb from './StudioBreadcrumb';
import CanvasDropIndicator from './CanvasDropIndicator';
import CanvasDragPreview from './CanvasDragPreview';
import { themeToStyle } from '#/lib/theme';
import type {
  BlockNode,
  ChromeZoneId,
  DocDocument,
  DocLayoutMode,
  DocMeta,
  DocPageSetup,
  LoadedDoc,
} from '#/lib/types';
import {
  findBlockById,
  reorderBlocks,
  updateBlockInTree,
  removeBlockFromTree,
  duplicateBlock,
  insertBlockRelative,
  generateId,
  createBlock,
} from '#/lib/serialize';
import { resolveBlockContent } from '#/lib/content';
import {
  applyPlacementNormalize,
  canIndentBlock,
  canOutdentBlock,
  indentBlock,
  outdentBlock,
  previewBlocksForDrag,
  reparentBlockAtTarget,
} from '#/lib/block-order';
import { pauseDocLayout, resumeDocLayout } from '#/lib/layout-pause';
import {
  canMoveBlockOnPages,
  moveBlockAcrossPages,
  moveBlockToPage,
  insertAtPageEnd,
  insertCoverPage,
  insertPageAfter,
  insertSectionInPage,
  findParentPageId,
  scrollBlockIntoView,
  scrollTreeItemIntoView,
} from '#/lib/page-blocks';
import { ensureCoverFirst } from '#/lib/cover';
import { splitBlocksIntoPages } from '#/lib/pages';
import { exportDocAsPdf } from '#/lib/export-pdf';
import {
  findCanvasDropTarget,
  parseStudioDragId,
  type CanvasDropTarget,
} from '#/lib/canvas-drop';
import {
  focusBlockEditor,
  getAdjacentBlockId,
  isPointerOverCanvas,
  selectAllInBlockEditor,
} from '#/lib/block-nav';
import {
  blockHasEditableText,
  parseTreeSelection,
  toTextNodeId,
} from '#/lib/block-text';
import {
  buildAlignProps,
  canAlignBlock,
  getMeasuredBlockSize,
  type AlignDimension,
} from '#/lib/block-align';
import { normalizeDocBlocks } from '#/lib/normalize-level';
import { applyDocTitle } from '#/lib/default-document';
import {
  findFirstParagraphId,
  isBlankStarterDocument,
  prepareStudioDocument,
} from '#/lib/studio-document';
import StudioDocTitle from './StudioDocTitle';
import StudioPageRuler from './StudioPageRuler';
import { resolvePageSetup } from '#/lib/page-setup';

export interface DocStudioProps extends DocStudioActions {
  slug: string;
  initialDoc: LoadedDoc;
}

interface HistoryEntry {
  document: DocDocument;
  sections: Record<string, string>;
}

interface DocHistoryState {
  entries: HistoryEntry[];
  index: number;
}

type DocHistoryAction =
  | { type: 'commit'; document: DocDocument; sections: Record<string, string> }
  | { type: 'undo' }
  | { type: 'redo' };

const MAX_HISTORY = 50;

function docHistoryReducer(
  state: DocHistoryState,
  action: DocHistoryAction,
): DocHistoryState {
  switch (action.type) {
    case 'commit': {
      const prev = state.entries[state.index];
      const document =
        action.document === prev.document
          ? prev.document
          : structuredClone(action.document);
      const entries = state.entries.slice(0, state.index + 1);
      entries.push({
        document,
        sections: { ...action.sections },
      });
      const trimmed = entries.slice(-MAX_HISTORY);
      return { entries: trimmed, index: trimmed.length - 1 };
    }
    case 'undo':
      return state.index <= 0 ? state : { ...state, index: state.index - 1 };
    case 'redo':
      return state.index >= state.entries.length - 1
        ? state
        : { ...state, index: state.index + 1 };
    default:
      return state;
  }
}

export default function DocStudio({
  slug,
  initialDoc,
  createNewDocAction,
  deleteDocAction,
  importDocAction: _importDocAction,
}: DocStudioProps) {
  const { syncDocTitle, openDocsPicker } = useStudioShell();
  const initialDocument = prepareStudioDocument(
    {
      ...initialDoc.document,
      blocks: normalizeDocBlocks(
        initialDoc.document.blocks,
        initialDoc.sections,
      ),
    },
    initialDoc.sections,
  );

  const [historyState, dispatchHistory] = useReducer(docHistoryReducer, {
    entries: [
      {
        document: initialDocument,
        sections: initialDoc.sections,
      },
    ],
    index: 0,
  });
  const { document, sections } = historyState.entries[historyState.index];
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const [meta, setMeta] = useState<DocMeta>(initialDoc.meta);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedId = selectedIds[selectedIds.length - 1] ?? null;
  const [selectedChromeZone, setSelectedChromeZone] =
    useState<ChromeZoneId | null>(null);
  const [textEditBlockId, setTextEditBlockId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<CanvasDropTarget | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [leftPanel, setLeftPanel] = useState<StudioLeftPanel>('outline');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isScrollingRef = useRef(false);
  const scrollStopTimerRef = useRef(0);
  const hoverClearTimerRef = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const isCanvasBlockDrag =
    !!dragBlockId && !dragBlockId.startsWith('palette:');
  const displayBlocks = useMemo(
    () =>
      isCanvasBlockDrag && dropTarget?.valid
        ? previewBlocksForDrag(document.blocks, dragBlockId, dropTarget)
        : document.blocks,
    [document.blocks, dragBlockId, dropTarget, isCanvasBlockDrag],
  );

  function handleSelectBlock(id: string, additive = false) {
    const { blockId, mode } = parseTreeSelection(id);
    setSelectedChromeZone(null);
    if (mode === 'text') {
      setSelectedIds([]);
      setTextEditBlockId(blockId);
      if (!additive) scrollBlockIntoView(blockId);
      requestAnimationFrame(() => focusBlockEditor(blockId));
      return;
    }
    setTextEditBlockId(null);
    if (!additive) {
      setSelectedIds([blockId]);
      scrollBlockIntoView(blockId);
    } else {
      setSelectedIds((prev) => toggleSelection(prev, blockId));
    }
  }

  function toggleSelection(prev: string[], blockId: string): string[] {
    const idx = prev.indexOf(blockId);
    if (idx >= 0)
      return prev.length === 1 ? prev : prev.filter((id) => id !== blockId);
    return [...prev, blockId];
  }

  function revealTreeSelection(treeId: string) {
    setLeftPanel('outline');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollTreeItemIntoView(treeId));
    });
  }

  function handleSelectBlockOnly(blockId: string, additive = false) {
    setSelectedIds((prev) =>
      additive ? toggleSelection(prev, blockId) : [blockId],
    );
    setSelectedChromeZone(null);
    setTextEditBlockId(null);
    revealTreeSelection(blockId);
  }

  function handleChromeZoneSelect(zone: ChromeZoneId) {
    setSelectedChromeZone(zone);
    setSelectedIds([]);
    setTextEditBlockId(null);
    window.document
      .querySelector(`[data-chrome-zone-tab="${zone}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  function handleSelectText(blockId: string) {
    setSelectedIds([]);
    setTextEditBlockId(blockId);
    revealTreeSelection(toTextNodeId(blockId));
    requestAnimationFrame(() =>
      focusBlockEditor(blockId, { preventScroll: true }),
    );
  }

  function handleAlignBlocks(dimension: AlignDimension) {
    if (!selectedId || selectedIds.length < 2) return;
    const primary = findBlockById(document.blocks, selectedId);
    if (!primary || !canAlignBlock(primary.type)) return;

    const target = getMeasuredBlockSize(selectedId, primary);
    let newBlocks = document.blocks;

    for (const id of selectedIds) {
      const block = findBlockById(newBlocks, id);
      if (!block || !canAlignBlock(block.type)) continue;
      newBlocks = updateBlockInTree(newBlocks, id, (b) => ({
        ...b,
        props: buildAlignProps(dimension, target, b.props ?? {}),
      }));
    }

    commit({ ...document, blocks: newBlocks }, sections);
  }

  useEffect(() => {
    if (!dragBlockId) {
      setDropTarget(null);
      return;
    }
    const paletteType = dragBlockId.startsWith('palette:')
      ? dragBlockId.slice(8)
      : undefined;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = findCanvasDropTarget(
          e.clientX,
          e.clientY,
          dragBlockId,
          document.blocks,
          paletteType ? { paletteType } : undefined,
        );
        setDropTarget(target);
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [dragBlockId, document.blocks]);

  useEffect(() => {
    if (!isBlankStarterDocument(document.blocks)) return;
    const paragraphId = findFirstParagraphId(document.blocks);
    if (!paragraphId) return;
    requestAnimationFrame(() => handleSelectText(paragraphId));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focus once on blank starter doc
  }, []);

  useEffect(() => {
    const canvas = window.document.querySelector<HTMLElement>(
      '.doc-studio .studio-canvas',
    );
    if (!canvas) return;

    const markScrolling = () => {
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        setHoveredId((prev) => (prev === null ? prev : null));
      }
      window.clearTimeout(scrollStopTimerRef.current);
      scrollStopTimerRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
      }, 120);
    };

    canvas.addEventListener('scroll', markScrolling, { passive: true });
    canvas.addEventListener('wheel', markScrolling, { passive: true });
    return () => {
      canvas.removeEventListener('scroll', markScrolling);
      canvas.removeEventListener('wheel', markScrolling);
      window.clearTimeout(scrollStopTimerRef.current);
    };
  }, [previewMode]);

  const handleHoverBlock = useCallback((id: string | null) => {
    if (isScrollingRef.current) return;
    window.clearTimeout(hoverClearTimerRef.current);
    if (id) {
      setHoveredId(id);
      return;
    }
    hoverClearTimerRef.current = window.setTimeout(() => {
      setHoveredId(null);
      hoverClearTimerRef.current = 0;
    }, 150);
  }, []);

  const commit = useCallback(
    (doc: DocDocument, secs: Record<string, string>) => {
      dispatchHistory({ type: 'commit', document: doc, sections: secs });
    },
    [],
  );

  const undo = useCallback(() => {
    dispatchHistory({ type: 'undo' });
  }, []);

  const redo = useCallback(() => {
    dispatchHistory({ type: 'redo' });
  }, []);

  const historyIndex = historyState.index;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyState.entries.length - 1;

  const treeSelectedId = textEditBlockId
    ? toTextNodeId(textEditBlockId)
    : selectedId;
  const selectedBlock = selectedId
    ? findBlockById(document.blocks, selectedId)
    : null;
  const textEditBlock = textEditBlockId
    ? findBlockById(document.blocks, textEditBlockId)
    : null;
  const selectedContent = selectedBlock
    ? resolveBlockContent(selectedBlock, sections)
    : '';

  function updateSections(blockId: string, content: string) {
    const block = findBlockById(document.blocks, blockId);
    const currentSections = sectionsRef.current;
    if (!block?.contentRef) {
      const newDoc = updateBlockInTree(document.blocks, blockId, (b) => ({
        ...b,
        content,
      }));
      commit({ ...document, blocks: newDoc }, currentSections);
      return;
    }
    const nextSections = { ...currentSections, [block.contentRef]: content };
    sectionsRef.current = nextSections;
    commit(document, nextSections);
  }

  function updateProps(blockId: string, props: Record<string, unknown>) {
    const newBlocks = updateBlockInTree(document.blocks, blockId, (b) => {
      const merged = { ...(b.props ?? {}), ...props };
      for (const [key, value] of Object.entries(props)) {
        if (value === undefined) delete merged[key];
      }
      return { ...b, props: merged };
    });
    commit({ ...document, blocks: newBlocks }, sections);
  }

  function replaceBlock(blockId: string, block: BlockNode) {
    const newBlocks = updateBlockInTree(document.blocks, blockId, () => block);
    commit({ ...document, blocks: newBlocks }, sections);
  }

  function updateTheme(theme: DocDocument['theme']) {
    commit({ ...document, theme }, sections);
  }

  function updateLayoutMode(layoutMode: DocLayoutMode) {
    commit({ ...document, layoutMode }, sections);
  }

  function updatePageSetup(pageSetup: DocPageSetup) {
    const patch: Partial<DocDocument> = { pageSetup };
    if (pageSetup.format && pageSetup.format !== 'custom') {
      patch.pageFormat = pageSetup.format;
    }
    commit({ ...document, ...patch }, sections);
  }

  function updateChrome(chrome: DocDocument['chrome']) {
    commit({ ...document, chrome }, sections);
  }

  const layoutMode = document.layoutMode ?? 'paginated';
  const pageFormat = document.pageFormat ?? 'a4';
  const resolvedPageSetup = useMemo(
    () => resolvePageSetup(document.pageSetup, pageFormat),
    [document.pageSetup, pageFormat],
  );
  const showStudioRuler =
    !previewMode &&
    layoutMode === 'paginated' &&
    resolvedPageSetup.showMarginGuides;
  const [pageCount, setPageCount] = useState(1);
  const [packedPages, setPackedPages] = useState<BlockNode[][]>([]);

  function countBlocks(nodes: BlockNode[]): number {
    return nodes.reduce(
      (n, b) => n + 1 + (b.children ? countBlocks(b.children) : 0),
      0,
    );
  }
  const blockCount = countBlocks(document.blocks);

  function handleReorder(
    parentId: string | null,
    activeId: string,
    overId: string,
  ) {
    if (parentId) {
      const newBlocks = updateBlockInTree(
        document.blocks,
        parentId,
        (parent) => ({
          ...parent,
          children: reorderBlocks(parent.children ?? [], activeId, overId),
        }),
      );
      commit({ ...document, blocks: newBlocks }, sections);
    } else {
      commit(
        {
          ...document,
          blocks: reorderBlocks(document.blocks, activeId, overId),
        },
        sections,
      );
    }
  }

  function handleInsert(block: BlockNode) {
    const newBlock = { ...block, id: generateId(block.type) };

    if (block.type === 'cover') {
      const { blocks: newBlocks, focusId } = insertCoverPage(document.blocks);
      commit({ ...document, blocks: newBlocks }, sections);
      setSelectedIds([focusId]);
      return;
    }

    if (block.type === 'page') {
      const selected = selectedId
        ? findBlockById(document.blocks, selectedId)
        : null;
      const pageId =
        selected?.type === 'page'
          ? selected.id
          : selected
            ? findParentPageId(document.blocks, selected.id)
            : null;
      const { blocks: newBlocks, focusId } = insertPageAfter(
        document.blocks,
        pageId,
      );
      commit({ ...document, blocks: newBlocks }, sections);
      setSelectedIds([focusId]);
      return;
    }

    if (!selectedId) {
      commit(
        {
          ...document,
          blocks: ensureCoverFirst([...document.blocks, newBlock]),
        },
        sections,
      );
      setSelectedIds([newBlock.id]);
      return;
    }

    const selected = findBlockById(document.blocks, selectedId);
    if (selected?.type === 'page') {
      const { blocks: newBlocks, focusId } = insertSectionInPage(
        document.blocks,
        selectedId,
      );
      commit({ ...document, blocks: newBlocks }, sections);
      setSelectedIds([focusId]);
      return;
    }
    if (
      selected?.type === 'section' ||
      selected?.type === 'cover' ||
      selected?.type === 'grid' ||
      selected?.type === 'split' ||
      selected?.type === 'box'
    ) {
      const newBlocks = updateBlockInTree(document.blocks, selectedId, (b) => ({
        ...b,
        children: [...(b.children ?? []), newBlock],
      }));
      commit({ ...document, blocks: ensureCoverFirst(newBlocks) }, sections);
    } else {
      const newBlocks = insertBlockRelative(
        document.blocks,
        selectedId,
        newBlock,
        'after',
      );
      commit({ ...document, blocks: ensureCoverFirst(newBlocks) }, sections);
    }
    setSelectedIds([newBlock.id]);
  }

  function handleInlineInsert(
    targetId: string,
    block: BlockNode,
    position: 'before' | 'after' | 'inside',
    insideIndex?: number,
  ) {
    const newBlock = { ...block, id: generateId(block.type) };
    if (block.type === 'cover') {
      const { blocks: newBlocks, focusId } = insertCoverPage(document.blocks);
      commit({ ...document, blocks: newBlocks }, sections);
      setSelectedIds([focusId]);
      return;
    }
    if (block.type === 'page') {
      const pageId = findParentPageId(document.blocks, targetId);
      const { blocks: newBlocks, focusId } = insertPageAfter(
        document.blocks,
        pageId ?? targetId,
      );
      commit({ ...document, blocks: newBlocks }, sections);
      setSelectedIds([focusId]);
      return;
    }
    const newBlocks = insertBlockRelative(
      document.blocks,
      targetId,
      newBlock,
      position,
      insideIndex,
    );
    commit({ ...document, blocks: ensureCoverFirst(newBlocks) }, sections);
    setSelectedIds([newBlock.id]);
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this block?')) return;
    const newBlocks = removeBlockFromTree(document.blocks, id);
    commit({ ...document, blocks: newBlocks }, sections);
    if (selectedIds.includes(id) || textEditBlockId === id) {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      if (textEditBlockId === id) setTextEditBlockId(null);
    }
  }

  function handleDuplicate(id: string) {
    const newBlocks = duplicateBlock(document.blocks, id);
    commit({ ...document, blocks: newBlocks }, sections);
  }

  function handleMove(id: string, direction: 'up' | 'down') {
    if (!canMoveBlockOnPages(document.blocks, packedPages, id, direction))
      return;
    let newBlocks = moveBlockAcrossPages(
      document.blocks,
      packedPages,
      id,
      direction,
    );
    newBlocks = applyPlacementNormalize(newBlocks, id);
    commit({ ...document, blocks: ensureCoverFirst(newBlocks) }, sections);
    scrollBlockIntoView(id);
  }

  function handlePageDrop(
    blockId: string,
    pageIndex: number,
    position: 'start' | 'end',
  ) {
    let newBlocks = moveBlockToPage(
      document.blocks,
      packedPages,
      blockId,
      pageIndex,
      position,
    );
    newBlocks = applyPlacementNormalize(newBlocks, blockId);
    commit({ ...document, blocks: ensureCoverFirst(newBlocks) }, sections);
    setSelectedIds([blockId]);
    clearDragState();
    scrollBlockIntoView(blockId);
  }

  function handlePageInsert(pageIndex: number, block: BlockNode) {
    const newBlock = { ...block, id: generateId(block.type) };

    if (block.type === 'cover') {
      const { blocks: newBlocks, focusId } = insertCoverPage(document.blocks);
      commit({ ...document, blocks: newBlocks }, sections);
      setSelectedIds([focusId]);
      scrollBlockIntoView(focusId);
      return;
    }

    const pageSource =
      packedPages.length > 0
        ? packedPages
        : splitBlocksIntoPages(document.blocks);
    const page = pageSource[pageIndex];
    if (!page) return;

    const { blocks: newBlocks, focusId } = insertAtPageEnd(
      document.blocks,
      page,
      newBlock,
    );
    commit({ ...document, blocks: newBlocks }, sections);
    setSelectedIds([focusId]);
    scrollBlockIntoView(focusId);
  }

  function handleIndent(blockId: string) {
    const newBlocks = indentBlock(document.blocks, blockId);
    if (newBlocks === document.blocks) return;
    commit({ ...document, blocks: ensureCoverFirst(newBlocks) }, sections);
    setSelectedIds([blockId]);
  }

  function handleOutdent(blockId: string) {
    const newBlocks = outdentBlock(document.blocks, blockId);
    if (newBlocks === document.blocks) return;
    commit({ ...document, blocks: ensureCoverFirst(newBlocks) }, sections);
    setSelectedIds([blockId]);
  }

  function applyCanvasDrop(activeBlockId: string, target: CanvasDropTarget) {
    if (!target.valid) return;

    const newBlocks = reparentBlockAtTarget(
      document.blocks,
      activeBlockId,
      target,
    );
    if (newBlocks === document.blocks) return;

    commit({ ...document, blocks: newBlocks }, sections);
    setSelectedIds([activeBlockId]);
    scrollBlockIntoView(activeBlockId);
  }

  function handlePaletteDrop(paletteType: string, target: CanvasDropTarget) {
    if (!target.valid) return;
    const newBlock = createBlock(paletteType);
    let newBlocks = document.blocks;

    if (target.position === 'inside') {
      newBlocks = updateBlockInTree(document.blocks, target.blockId, (b) => {
        const children = [...(b.children ?? [])];
        const idx = target.index ?? children.length;
        children.splice(idx, 0, newBlock);
        return { ...b, children };
      });
    } else if (target.position === 'before') {
      newBlocks = insertBlockRelative(
        document.blocks,
        target.blockId,
        newBlock,
        'before',
      );
    } else {
      newBlocks = insertBlockRelative(
        document.blocks,
        target.blockId,
        newBlock,
        'after',
      );
    }

    commit({ ...document, blocks: ensureCoverFirst(newBlocks) }, sections);
    setSelectedIds([newBlock.id]);
    scrollBlockIntoView(newBlock.id);
  }

  function handleStudioDragStart(event: DragStartEvent) {
    pauseDocLayout();
    const parsed = parseStudioDragId(event.active.id);
    if (parsed.source === 'palette') {
      setDragBlockId(`palette:${parsed.paletteType}`);
      return;
    }
    if (parsed.blockId) setDragBlockId(parsed.blockId);
  }

  function clearDragState() {
    setDragBlockId(null);
    setDropTarget(null);
    resumeDocLayout();
  }

  function handleStudioDragEnd(event: DragEndEvent) {
    const parsed = parseStudioDragId(event.active.id);
    const { active, over } = event;

    if (parsed.source === 'canvas' || parsed.source === 'palette') {
      const paletteType =
        parsed.source === 'palette' ? parsed.paletteType : undefined;
      const target =
        dropTarget ??
        findCanvasDropTarget(
          pointerRef.current.x,
          pointerRef.current.y,
          parsed.blockId ?? dragBlockId ?? '',
          document.blocks,
          paletteType ? { paletteType } : undefined,
        );

      if (parsed.source === 'palette' && parsed.paletteType && target) {
        handlePaletteDrop(parsed.paletteType, target);
      } else if (parsed.blockId && target) {
        applyCanvasDrop(parsed.blockId, target);
      }

      clearDragState();
      return;
    }

    clearDragState();

    if (!parsed.blockId) return;
    const activeId = parsed.blockId;

    const canvasTarget =
      dropTarget ??
      (isPointerOverCanvas(pointerRef.current.x, pointerRef.current.y)
        ? findCanvasDropTarget(
            pointerRef.current.x,
            pointerRef.current.y,
            activeId,
            document.blocks,
          )
        : null);

    if (canvasTarget?.valid) {
      applyCanvasDrop(activeId, canvasTarget);
      return;
    }

    if (!over || active.id === over.id) return;

    const overId = over.id as string;
    const activeParent = getParentIdForTree(document.blocks, activeId);
    const overParent = getParentIdForTree(document.blocks, overId);
    if (activeParent === undefined || overParent === undefined) return;
    if (activeParent !== overParent) return;

    handleReorder(activeParent, activeId, overId);
  }

  function getParentIdForTree(
    nodes: BlockNode[],
    id: string,
    parent: string | null = null,
  ): string | null | undefined {
    for (const node of nodes) {
      if (node.id === id) return parent;
      if (node.children) {
        const found = getParentIdForTree(node.children, id, node.id);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }

  async function handleSave(doc = document, title = metaRef.current.title) {
    window.document.activeElement instanceof HTMLElement &&
      window.document.activeElement.blur();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    setSaving(true);
    try {
      const res = await fetch(docsPaths.api.doc(slug), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: doc,
          sections: sectionsRef.current,
          meta: { title },
        }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch (e) {
      console.error(e);
      alert('Failed to save document');
    } finally {
      setSaving(false);
    }
  }

  function handleTitleChange(nextTitle: string) {
    const prevTitle = meta.title;
    if (nextTitle === prevTitle) return;
    setMeta((m) => ({ ...m, title: nextTitle }));
    syncDocTitle(nextTitle);
    const newDoc = applyDocTitle(document, prevTitle, nextTitle);
    commit(newDoc, sections);
    void handleSave(newDoc, nextTitle);
  }

  function handleExportPdf() {
    void exportDocAsPdf(meta.title);
  }

  function handleNavigateSelection(
    direction: 'prev' | 'next' | 'parent' | 'firstChild',
  ) {
    const fromId = selectedId ?? textEditBlockId;
    if (!fromId) return;
    const nextId = getAdjacentBlockId(document.blocks, fromId, direction);
    if (nextId) handleSelectBlock(nextId);
  }

  function handleEditSelected() {
    if (!selectedId) return;
    const id = selectedId;
    setSelectedIds([]);
    setTextEditBlockId(id);
    scrollBlockIntoView(id);
    revealTreeSelection(toTextNodeId(id));
    requestAnimationFrame(() => focusBlockEditor(id));
  }

  function handleSelectAllInBlock() {
    const blockId = textEditBlockId ?? selectedId;
    if (!blockId) return;
    const block = findBlockById(document.blocks, blockId);
    if (!block || !blockHasEditableText(block)) return;

    const enterEdit = !textEditBlockId && selectedId === blockId;
    if (enterEdit) {
      setSelectedIds([]);
      setTextEditBlockId(blockId);
      scrollBlockIntoView(blockId);
      revealTreeSelection(toTextNodeId(blockId));
    }

    const selectAll = () => selectAllInBlockEditor(blockId);
    if (enterEdit) {
      requestAnimationFrame(() => requestAnimationFrame(selectAll));
    } else {
      selectAll();
    }
  }

  useStudioShortcuts({
    onSave: () => void handleSave(),
    onUndo: undo,
    onRedo: redo,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onMoveUp: (id) => handleMove(id, 'up'),
    onMoveDown: (id) => handleMove(id, 'down'),
    onIndent: handleIndent,
    onOutdent: handleOutdent,
    onDeselect: () => {
      if (textEditBlockId) {
        setTextEditBlockId(null);
        return;
      }
      setSelectedIds([]);
    },
    onNavigate: handleNavigateSelection,
    onEdit: handleEditSelected,
    onSelectAll: handleSelectAllInBlock,
    selectedId,
    textEditBlockId,
    canUndo,
    canRedo,
    canMoveUp: selectedId
      ? canMoveBlockOnPages(document.blocks, packedPages, selectedId, 'up')
      : false,
    canMoveDown: selectedId
      ? canMoveBlockOnPages(document.blocks, packedPages, selectedId, 'down')
      : false,
    canIndent: selectedId ? canIndentBlock(document.blocks, selectedId) : false,
    canOutdent: selectedId
      ? canOutdentBlock(document.blocks, selectedId)
      : false,
  });

  function enterPreview() {
    setSelectedIds([]);
    setTextEditBlockId(null);
    setPreviewMode(true);
  }

  function enterEdit() {
    setPreviewMode(false);
  }

  return (
    <div
      className={cn(
        'doc-studio bg-background flex h-full min-h-0 flex-col',
        previewMode && 'doc-studio-preview',
      )}
    >
      {!previewMode && (
        <>
          <div className="studio-wysiwyg-toolbar-dock" aria-hidden />
        </>
      )}
      <header
        data-studio-chrome
        className="border-border bg-card flex h-10 shrink-0 items-stretch justify-between border-b"
      >
        <div className="flex min-w-0 items-stretch">
          <button
            type="button"
            onClick={openDocsPicker}
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/6 border-border flex w-10 shrink-0 items-center justify-center border-r"
            aria-label="Open document"
          >
            <Menu size={13} strokeWidth={2} />
          </button>
          <div className="flex min-w-0 items-center px-3">
            <StudioDocTitle title={meta.title} onChange={handleTitleChange} />
          </div>
        </div>
        <div className="flex h-7 items-stretch gap-px self-center pr-4">
          <div className="border-border flex items-stretch border">
            <Button
              type="button"
              variant={!previewMode ? 'secondary' : 'ghost'}
              size="sm"
              onClick={enterEdit}
              className="h-7 gap-1 rounded-none px-2.5 text-[11px]"
            >
              <Pencil size={12} />
              Edit
            </Button>
            <Button
              type="button"
              variant={previewMode ? 'secondary' : 'ghost'}
              size="sm"
              onClick={enterPreview}
              className="border-border h-7 gap-1 rounded-none border-l px-2.5 text-[11px]"
            >
              <Eye size={12} />
              Preview
            </Button>
          </div>
          {!previewMode && (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={undo}
                disabled={!canUndo}
                className="rounded-none"
                title={titleWithShortcut('Undo', 'Mod+Z')}
              >
                <Undo2 size={14} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={redo}
                disabled={!canRedo}
                className="rounded-none"
                title={titleWithShortcut('Redo', 'Mod+Shift+Z')}
              >
                <Redo2 size={14} />
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            className="h-7 gap-1 rounded-none px-2.5 text-[11px]"
            title="Export as PDF"
          >
            <FileDown size={13} />
            Export PDF
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving}
            className="h-7 gap-1 rounded-none px-2.5 text-[11px]"
          >
            <Save size={13} />
            {saving ? 'Saving…' : 'Save'}
            <kbd className="border-border bg-muted text-muted-foreground ml-0.5 hidden border px-1 py-px font-mono text-[9px] sm:inline">
              {formatShortcut('Mod+S')}
            </kbd>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {!previewMode && (
          <StudioBreadcrumb
            blocks={document.blocks}
            selectedId={textEditBlockId ?? selectedId}
            textEdit={!!textEditBlockId}
            onSelect={handleSelectBlock}
          />
        )}
        <div className="bg-background flex min-h-0 flex-1">
          {!previewMode ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleStudioDragStart}
              onDragEnd={handleStudioDragEnd}
            >
              <StudioLeftRail
                active={leftPanel}
                onChange={setLeftPanel}
                onOpenSettings={() => setSettingsOpen(true)}
              />

              {leftPanel && (
                <StudioSecondaryPanel
                  title={leftPanel === 'add' ? 'Insert' : 'Outline'}
                >
                  {leftPanel === 'add' ? (
                    <BlockPalette onInsert={handleInsert} />
                  ) : (
                    <BlockTree
                      blocks={document.blocks}
                      selectedId={treeSelectedId}
                      selectedIds={selectedIds}
                      hoveredId={hoveredId}
                      onSelect={handleSelectBlock}
                      onIndent={handleIndent}
                      onOutdent={handleOutdent}
                      canIndent={(id) => canIndentBlock(document.blocks, id)}
                      canOutdent={(id) => canOutdentBlock(document.blocks, id)}
                      onDelete={handleDelete}
                    />
                  )}
                </StudioSecondaryPanel>
              )}

              <main
                className={`studio-canvas relative min-h-0 flex-1 overflow-y-auto p-4${
                  isCanvasBlockDrag ? ' is-block-dragging' : ''
                }`}
              >
                {showStudioRuler && (
                  <StudioPageRuler
                    setup={resolvedPageSetup}
                    style={themeToStyle(document.theme ?? {})}
                  />
                )}
                <DocLayout
                  title={meta.title}
                  layoutMode={layoutMode}
                  pageFormat={pageFormat}
                  pageSetup={document.pageSetup}
                  chrome={document.chrome}
                  themeStyle={themeToStyle(document.theme ?? {})}
                  blocks={displayBlocks}
                  documentBlocks={document.blocks}
                  sections={sections}
                  docSlug={slug}
                  onPageCountChange={setPageCount}
                  onPagesChange={setPackedPages}
                  onPageDrop={handlePageDrop}
                  onPageInsert={handlePageInsert}
                  packedPages={packedPages}
                  studioMode
                  selectedId={selectedId}
                  selectedIds={selectedIds}
                  textEditBlockId={textEditBlockId}
                  hoveredId={hoveredId}
                  onSelectBlock={handleSelectBlockOnly}
                  onSelectText={handleSelectText}
                  onHoverBlock={handleHoverBlock}
                  onContentChange={updateSections}
                  onPropsChange={updateProps}
                  onDeleteBlock={handleDelete}
                  onDuplicateBlock={handleDuplicate}
                  onMoveBlock={handleMove}
                  onInsertBlock={handleInlineInsert}
                  dragBlockId={dragBlockId}
                  dropTarget={dropTarget}
                  selectedChromeZone={selectedChromeZone}
                  onChromeZoneSelect={handleChromeZoneSelect}
                />
                <div className="studio-block-chrome-dock" aria-hidden />
              </main>

              <StudioRightPanel
                slug={slug}
                title={meta.title}
                selectedBlock={selectedBlock}
                textEditBlock={textEditBlock}
                selectedIds={selectedIds}
                selectedContent={selectedContent}
                onAlignBlocks={handleAlignBlocks}
                layoutMode={layoutMode}
                pageFormat={pageFormat}
                pageSetup={document.pageSetup}
                pageCount={pageCount}
                blockCount={blockCount}
                theme={document.theme ?? {}}
                onPropsChange={(props) => {
                  const targetId = selectedId ?? textEditBlockId;
                  if (targetId) updateProps(targetId, props);
                }}
                onBlockChange={(block) => {
                  const targetId = selectedId ?? textEditBlockId;
                  if (targetId) replaceBlock(targetId, block);
                }}
                onContentChange={(content) =>
                  selectedId && updateSections(selectedId, content)
                }
                onLayoutModeChange={updateLayoutMode}
                onPageSetupChange={updatePageSetup}
                onThemeChange={updateTheme}
                chrome={document.chrome ?? {}}
                selectedChromeZone={selectedChromeZone}
                onChromeChange={updateChrome}
                onDuplicate={
                  selectedId ? () => handleDuplicate(selectedId) : undefined
                }
                onDelete={
                  selectedId ? () => handleDelete(selectedId) : undefined
                }
                onMoveUp={
                  selectedId &&
                  canMoveBlockOnPages(
                    document.blocks,
                    packedPages,
                    selectedId,
                    'up',
                  )
                    ? () => handleMove(selectedId, 'up')
                    : undefined
                }
                onMoveDown={
                  selectedId &&
                  canMoveBlockOnPages(
                    document.blocks,
                    packedPages,
                    selectedId,
                    'down',
                  )
                    ? () => handleMove(selectedId, 'down')
                    : undefined
                }
              />

              {(!isCanvasBlockDrag || !dropTarget?.valid) && (
                <CanvasDropIndicator dropTarget={dropTarget} />
              )}

              <DragOverlay dropAnimation={null}>
                {isCanvasBlockDrag && (
                  <CanvasDragPreview blockId={dragBlockId} />
                )}
                {dragBlockId?.startsWith('palette:') && (
                  <div className="studio-drag-overlay bg-foreground text-background rounded-none px-3 py-1.5 text-xs shadow-lg">
                    {dragBlockId.slice(8)}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          ) : (
            <main className="studio-canvas min-h-0 flex-1 overflow-y-auto p-0">
              <DocLayout
                title={meta.title}
                layoutMode={layoutMode}
                pageFormat={pageFormat}
                pageSetup={document.pageSetup}
                chrome={document.chrome}
                themeStyle={themeToStyle(document.theme ?? {})}
                blocks={document.blocks}
                sections={sections}
                docSlug={slug}
                onPageCountChange={setPageCount}
                onPagesChange={setPackedPages}
                onPageDrop={handlePageDrop}
                packedPages={packedPages}
              />
            </main>
          )}

          {!previewMode && (
            <>
              <StudioSettingsDrawer
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                slug={slug}
                title={meta.title}
                layoutMode={layoutMode}
                pageFormat={pageFormat}
                pageSetup={document.pageSetup}
                pageCount={pageCount}
                blockCount={blockCount}
                theme={document.theme ?? {}}
                chrome={document.chrome ?? {}}
                selectedChromeZone={selectedChromeZone}
                onLayoutModeChange={updateLayoutMode}
                onPageSetupChange={updatePageSetup}
                onThemeChange={updateTheme}
                onChromeChange={updateChrome}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
