'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Trash2, X } from 'lucide-react';
import type {
  BlockNode,
  BlockType,
  ChromeZoneId,
  DocChrome,
  DocLayoutMode,
  DocPageFormat,
  DocPageSetup,
  DocTheme,
} from '#/lib/types';
import PageSetupPanel from './PageSetupPanel';
import StylePanel from './style/StylePanel';
import MultiSelectAlignPanel from './MultiSelectAlignPanel';
import { BLOCK_LABELS } from '#/lib/block-fields';
import { isConvertibleTextBlock } from '#/lib/convert-block-type';
import type { AlignDimension } from '#/lib/block-align';
import { titleWithShortcut } from '#/lib/studio-shortcuts';
import {
  WfField,
  WfHint,
  WfInput,
  WfCheckRow,
  WfSelect,
} from './style/WfControls';
import './style/studio-style-panel.css';

type PanelMode = 'style' | 'settings' | 'document';

interface StudioRightPanelProps {
  slug: string;
  title: string;
  selectedBlock: BlockNode | null;
  textEditBlock?: BlockNode | null;
  selectedIds?: string[];
  selectedContent: string;
  onAlignBlocks?: (dimension: AlignDimension) => void;
  layoutMode: DocLayoutMode;
  pageFormat: DocPageFormat;
  pageSetup?: DocPageSetup;
  pageCount: number;
  blockCount: number;
  theme: DocTheme;
  chrome: DocChrome;
  selectedChromeZone?: ChromeZoneId | null;
  onPropsChange: (props: Record<string, unknown>) => void;
  onBlockChange?: (block: BlockNode) => void;
  onContentChange: (content: string) => void;
  onLayoutModeChange: (mode: DocLayoutMode) => void;
  onPageSetupChange: (setup: DocPageSetup) => void;
  onThemeChange: (theme: DocTheme) => void;
  onChromeChange: (chrome: DocChrome) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onClose?: () => void;
}

const INLINE_HINT = 'Click text on the page to edit inline.';

function BlockSettings({
  block,
  onPropsChange,
}: {
  block: BlockNode;
  onPropsChange: (props: Record<string, unknown>) => void;
}) {
  const props = block.props ?? {};
  const childCount = block.children?.length ?? 0;
  const setProp = (key: string, value: unknown) =>
    onPropsChange({ ...props, [key]: value });

  switch (block.type) {
    case 'cover':
      return (
        <>
          <WfField label="Anchor ID">
            <WfInput
              value={(props.id as string) ?? block.id}
              onChange={(v) => setProp('id', v)}
            />
          </WfField>
          <WfCheckRow
            label="Page break before"
            checked={!!props.pageBreak}
            onChange={(v) => setProp('pageBreak', v)}
          />
          <WfHint>Cover is always the first page.</WfHint>
        </>
      );

    case 'coverBody':
    case 'brand':
      return <WfHint>{INLINE_HINT}</WfHint>;

    case 'coverSubt':
      return <WfHint>{INLINE_HINT}</WfHint>;

    case 'coverToc':
      return <WfHint>Edit the table of contents on the cover page.</WfHint>;

    case 'page':
      return (
        <>
          <WfHint>
            Editorial page boundary. Add sections inside this page from the
            canvas or outline.
          </WfHint>
          {childCount > 0 && (
            <WfHint>{`${childCount} section${childCount > 1 ? 's' : ''}`}</WfHint>
          )}
        </>
      );

    case 'section':
      return (
        <>
          <WfField label="Anchor ID">
            <WfInput
              value={(props.id as string) ?? block.id}
              onChange={(v) => setProp('id', v)}
              placeholder="s1"
            />
          </WfField>
          {props.variant === 'cover' ? (
            <WfHint>Cover section — first page of the document.</WfHint>
          ) : (
            <WfCheckRow
              label="Page break before"
              checked={!!props.pageBreak}
              onChange={(v) => setProp('pageBreak', v)}
            />
          )}
          {childCount > 0 && (
            <WfHint>{`${childCount} child block${childCount > 1 ? 's' : ''}`}</WfHint>
          )}
        </>
      );

    case 'break':
      return (
        <>
          <WfField label="Break type">
            <WfSelect
              value={(props.variant as string) ?? 'page'}
              onChange={(v) => setProp('variant', v)}
            >
              <option value="page">Page break</option>
              <option value="section">Section break</option>
              <option value="continue">Continue break</option>
            </WfSelect>
          </WfField>
          <WfHint>Forces the next block onto a new page.</WfHint>
        </>
      );

    case 'grid':
    case 'box':
    case 'split':
      return (
        <WfHint>
          Layout is in the Style tab.{' '}
          {childCount > 0 ? `${childCount} children.` : 'Empty container.'}
        </WfHint>
      );

    case 'card':
    case 'alert':
    case 'rail':
      return <WfHint>{INLINE_HINT}</WfHint>;

    case 'figure':
      return (
        <WfHint>Upload an image or edit URL and caption on the page.</WfHint>
      );

    case 'table':
      return <WfHint>Click the table on the page to edit inline.</WfHint>;

    case 'subheading':
    case 'lvlcol':
    case 'lcard':
      return <WfHint>{INLINE_HINT}</WfHint>;

    case 'level':
      return (
        <WfHint>
          {INLINE_HINT}{' '}
          {childCount > 0
            ? `${childCount} column${childCount > 1 ? 's' : ''}.`
            : ''}
        </WfHint>
      );

    case 'levels':
      return (
        <WfHint>
          {`Matrix — ${childCount} row${childCount === 1 ? '' : 's'}. Column widths are shared across all rows — edit on this block.`}
        </WfHint>
      );

    case 'kpiband':
    case 'vm':
      return <WfHint>{`Container — ${childCount} children.`}</WfHint>;

    default:
      return <WfHint>{INLINE_HINT}</WfHint>;
  }
}

export default function StudioRightPanel({
  slug,
  title,
  selectedBlock,
  textEditBlock = null,
  selectedIds = [],
  onAlignBlocks,
  layoutMode,
  pageFormat,
  pageSetup,
  pageCount,
  blockCount,
  theme,
  onPropsChange,
  onBlockChange,
  onLayoutModeChange,
  onPageSetupChange,
  onThemeChange,
  chrome,
  selectedChromeZone,
  onChromeChange,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onClose,
}: StudioRightPanelProps) {
  const [mode, setMode] = useState<PanelMode>(
    selectedBlock || textEditBlock ? 'style' : 'document',
  );

  useEffect(() => {
    if (selectedBlock) setMode('style');
  }, [selectedBlock?.id]);

  useEffect(() => {
    if (textEditBlock) setMode('style');
  }, [textEditBlock?.id]);

  useEffect(() => {
    if (selectedChromeZone) setMode('document');
  }, [selectedChromeZone]);

  const blockLabel = selectedBlock
    ? (BLOCK_LABELS[selectedBlock.type as BlockType] ?? selectedBlock.type)
    : null;
  const multiSelect = selectedIds.length >= 2;
  const panelTarget = selectedBlock ?? textEditBlock;

  return (
    <aside
      data-studio-chrome
      className="wf-panel border-border flex min-h-0 w-[272px] shrink-0 flex-col border-l"
    >
      <div className="wf-tabs">
        <button
          type="button"
          disabled={!panelTarget}
          className={`wf-tab${mode === 'style' && panelTarget ? ' active' : ''}`}
          onClick={() => setMode('style')}
        >
          Style
        </button>
        <button
          type="button"
          disabled={!selectedBlock}
          className={`wf-tab${mode === 'settings' && selectedBlock ? ' active' : ''}`}
          onClick={() => setMode('settings')}
        >
          Settings
        </button>
        <button
          type="button"
          className={`wf-tab${mode === 'document' ? ' active' : ''}`}
          onClick={() => setMode('document')}
        >
          Doc
        </button>
        {onClose && (
          <button
            type="button"
            className="wf-tab wf-tab-close ml-auto"
            onClick={onClose}
            title="Hide panel"
            aria-label="Hide panel"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {textEditBlock && !selectedBlock && mode !== 'document' && (
        <div className="wf-element-header">
          <p className="wf-element-name">Text</p>
          <p className="wf-element-id">{textEditBlock.id}</p>
        </div>
      )}

      {selectedBlock && mode !== 'document' && !multiSelect && (
        <div className="wf-element-header">
          <p className="wf-element-name">{blockLabel}</p>
          <p className="wf-element-id">{selectedBlock.id}</p>
          <div className="wf-element-actions">
            {onMoveUp && (
              <button
                type="button"
                className="wf-icon-btn"
                title={titleWithShortcut('Move up', 'Alt+↑')}
                onClick={onMoveUp}
              >
                <ArrowUp size={13} />
              </button>
            )}
            {onMoveDown && (
              <button
                type="button"
                className="wf-icon-btn"
                title={titleWithShortcut('Move down', 'Alt+↓')}
                onClick={onMoveDown}
              >
                <ArrowDown size={13} />
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                className="wf-icon-btn"
                title={titleWithShortcut('Duplicate', 'Mod+D')}
                onClick={onDuplicate}
              >
                <Copy size={13} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="wf-icon-btn danger ml-auto"
                title={titleWithShortcut('Delete', 'Delete')}
                onClick={onDelete}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="wf-scroll-area">
        {mode === 'style' && multiSelect && onAlignBlocks && (
          <MultiSelectAlignPanel
            count={selectedIds.length}
            onAlign={onAlignBlocks}
          />
        )}

        {mode === 'style' && selectedBlock && !multiSelect && (
          <StylePanel
            block={selectedBlock}
            onPropsChange={onPropsChange}
            onBlockChange={onBlockChange}
          />
        )}

        {mode === 'style' &&
          textEditBlock &&
          !selectedBlock &&
          !multiSelect &&
          (isConvertibleTextBlock(textEditBlock.type) && onBlockChange ? (
            <StylePanel
              block={textEditBlock}
              onPropsChange={onPropsChange}
              onBlockChange={onBlockChange}
            />
          ) : (
            <div className="wf-section-body" style={{ paddingTop: 10 }}>
              <WfHint>{INLINE_HINT}</WfHint>
            </div>
          ))}

        {mode === 'settings' && selectedBlock && (
          <div className="wf-section-body" style={{ paddingTop: 10 }}>
            <BlockSettings
              block={selectedBlock}
              onPropsChange={onPropsChange}
            />
          </div>
        )}

        {mode !== 'document' && !selectedBlock && !textEditBlock && (
          <div className="wf-empty-state">
            <p>Select a block on the page or in the tree.</p>
            <button
              type="button"
              className="wf-tab"
              style={{ marginTop: 12, border: 'none' }}
              onClick={() => setMode('document')}
            >
              Document settings →
            </button>
          </div>
        )}

        {mode === 'document' && (
          <div className="wf-doc-panel">
            <PageSetupPanel
              slug={slug}
              title={title}
              layoutMode={layoutMode}
              pageFormat={pageFormat}
              pageSetup={pageSetup}
              pageCount={pageCount}
              blockCount={blockCount}
              theme={theme}
              chrome={chrome}
              selectedChromeZone={selectedChromeZone}
              onLayoutModeChange={onLayoutModeChange}
              onPageSetupChange={onPageSetupChange}
              onThemeChange={onThemeChange}
              onChromeChange={onChromeChange}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
