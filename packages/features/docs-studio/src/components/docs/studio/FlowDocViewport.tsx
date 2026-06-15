'use client';

import { useCallback, useMemo, type CSSProperties } from 'react';
import type { BlockNode, ChromeZoneId, DocChrome } from '#/lib/types';
import type { ResolvedPageSetup } from '#/lib/page-setup';
import type { PackedPage } from '#/lib/layout-items';
import {
  bodyHeightForChrome,
  chromeForPageBlocks,
} from '#/lib/page-body-budget';
import { getPageContentWidthPx } from '#/lib/page-metrics';
import { resolveDocChrome } from '#/lib/chrome';
import DocumentBodyEditor from './DocumentBodyEditor';
import DocRenderer from '../DocRenderer';
import DocPageChrome from '../DocPageChrome';
import StudioDocChrome from './StudioDocChrome';
import PageGapInsert from './PageGapInsert';

interface FlowDocViewportProps {
  title: string;
  body: string;
  onBodyChange: (body: string) => void;
  blocks: BlockNode[];
  sections: Record<string, string>;
  pages: PackedPage[];
  chrome?: DocChrome;
  resolvedSetup: ResolvedPageSetup;
  combinedStyle: CSSProperties;
  studioMode?: boolean;
  autoFocus?: boolean;
  selectedChromeZone?: ChromeZoneId | null;
  onChromeZoneSelect?: (zone: ChromeZoneId) => void;
  onLayoutChange?: () => void;
  onPageInsert?: (pageIndex: number, block: BlockNode) => void;
}

interface PageFrame {
  pageNum: number;
  bodyHeightPx: number;
  showHeader: boolean;
  showFooter: boolean;
  isCover: boolean;
  blocks: BlockNode[];
  fragments: PackedPage['fragments'];
}

export default function FlowDocViewport({
  title,
  body,
  onBodyChange,
  blocks,
  sections,
  pages,
  chrome,
  resolvedSetup,
  combinedStyle,
  studioMode,
  autoFocus,
  selectedChromeZone,
  onChromeZoneSelect,
  onLayoutChange,
  onPageInsert,
}: FlowDocViewportProps) {
  const contentWidthPx = getPageContentWidthPx(resolvedSetup);
  const pageGapPx = resolvedSetup.pageGapPx;

  const pageFrames = useMemo((): PageFrame[] => {
    const frames: PageFrame[] = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageNum = i + 1;
      const { showHeader, showFooter, isCover } = chromeForPageBlocks(
        { setup: resolvedSetup, chrome, title },
        pageNum,
        page.blocks,
      );
      const bodyHeightPx = bodyHeightForChrome(
        resolvedSetup,
        showHeader,
        showFooter,
      );

      frames.push({
        pageNum,
        bodyHeightPx,
        showHeader,
        showFooter,
        isCover,
        blocks: page.blocks,
        fragments: page.fragments,
      });
    }

    if (frames.length === 0) {
      const bodyHeightPx = bodyHeightForChrome(resolvedSetup, false, false);
      frames.push({
        pageNum: 1,
        bodyHeightPx,
        showHeader: false,
        showFooter: false,
        isCover: false,
        blocks: [],
        fragments: {},
      });
    }

    return frames;
  }, [pages, resolvedSetup, chrome, title]);

  const coverFrames = pageFrames.filter((f) => f.isCover);
  const bodyPageFrames = pageFrames.filter((f) => !f.isCover);
  const primaryBodyFrame = bodyPageFrames[0] ?? pageFrames[0];
  const overflowFrames = bodyPageFrames.slice(1);

  const scheduleLayoutChange = useCallback(() => {
    onLayoutChange?.();
  }, [onLayoutChange]);

  const ChromeComponent = studioMode ? StudioDocChrome : DocPageChrome;
  const chromeProps = studioMode
    ? { activeZone: selectedChromeZone, onZoneSelect: onChromeZoneSelect }
    : {};

  const total = pageFrames.length;

  function focusBodyEditor() {
    const editor = document.querySelector<HTMLElement>(
      '[data-doc-body-editor] .ProseMirror',
    );
    editor?.focus();
  }

  function pageInsertGap(pageIndex: number) {
    if (!onPageInsert) return null;
    return (
      <PageGapInsert onInsert={(block) => onPageInsert(pageIndex, block)} />
    );
  }

  if (!studioMode) {
    return (
      <div
        className="flow-doc-viewport flow-doc-viewport-read"
        style={{ width: contentWidthPx, margin: '0 auto' }}
      >
        {pageFrames.map((frame, i) => (
          <div
            key={`read-${frame.pageNum}`}
            className="studio-page-unit"
            style={{ marginTop: i > 0 ? pageGapPx : 0 }}
          >
            <div
              className={`doc-page doc-page-sheet${frame.isCover ? ' is-cover-page' : ''}${frame.showHeader ? ' has-header' : ''}${frame.showFooter ? ' has-footer' : ''}`}
              data-page={frame.pageNum}
              data-page-total={total}
              style={combinedStyle}
            >
              {frame.showHeader && (
                <DocPageChrome
                  chrome={resolveDocChrome(chrome, {
                    title,
                    page: frame.pageNum,
                    total,
                  })}
                  position="header"
                />
              )}
              <div className="doc-page-body">
                <DocRenderer
                  blocks={frame.blocks}
                  sections={sections}
                  pageFragments={frame.fragments}
                />
              </div>
              {frame.showFooter && (
                <DocPageChrome
                  chrome={resolveDocChrome(chrome, {
                    title,
                    page: frame.pageNum,
                    total,
                  })}
                  position="footer"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="flow-doc-viewport flow-doc-viewport-studio"
      style={{ width: contentWidthPx, margin: '0 auto' }}
    >
      {coverFrames.map((frame) => (
        <div
          key={`cover-${frame.pageNum}`}
          className="studio-page-unit"
          style={{ marginBottom: pageGapPx }}
        >
          <div
            className={`doc-page doc-page-sheet is-cover-page${frame.showHeader ? ' has-header' : ''}${frame.showFooter ? ' has-footer' : ''}`}
            data-page={frame.pageNum}
            data-page-total={total}
            style={combinedStyle}
          >
            {frame.showHeader && (
              <ChromeComponent
                chrome={resolveDocChrome(chrome, {
                  title,
                  page: frame.pageNum,
                  total,
                })}
                position="header"
                {...chromeProps}
              />
            )}
            <div className="doc-page-body">
              <DocRenderer
                blocks={frame.blocks}
                sections={sections}
                pageFragments={frame.fragments}
              />
            </div>
            {frame.showFooter && (
              <ChromeComponent
                chrome={resolveDocChrome(chrome, {
                  title,
                  page: frame.pageNum,
                  total,
                })}
                position="footer"
                {...chromeProps}
              />
            )}
          </div>
          {pageInsertGap(frame.pageNum - 1)}
        </div>
      ))}

      <div
        className="studio-page-unit"
        style={{ marginTop: coverFrames.length > 0 ? pageGapPx : 0 }}
      >
        <div
          className={`doc-page doc-page-sheet flow-doc-writing-page${primaryBodyFrame.showHeader ? ' has-header' : ''}${primaryBodyFrame.showFooter ? ' has-footer' : ''}${resolvedSetup.showMarginGuides ? ' show-margin-guides' : ''}`}
          data-page={primaryBodyFrame.pageNum}
          data-page-total={total}
          style={combinedStyle}
        >
          {primaryBodyFrame.showHeader && (
            <ChromeComponent
              chrome={resolveDocChrome(chrome, {
                title,
                page: primaryBodyFrame.pageNum,
                total,
              })}
              position="header"
              {...chromeProps}
            />
          )}
          <div
            className="doc-page-body flow-doc-body-editable"
            style={{ minHeight: primaryBodyFrame.bodyHeightPx }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) focusBodyEditor();
            }}
          >
            <DocumentBodyEditor
              body={body}
              onChange={onBodyChange}
              autoFocus={autoFocus}
              onLayoutChange={scheduleLayoutChange}
            />
          </div>
          {primaryBodyFrame.showFooter && (
            <ChromeComponent
              chrome={resolveDocChrome(chrome, {
                title,
                page: primaryBodyFrame.pageNum,
                total,
              })}
              position="footer"
              {...chromeProps}
            />
          )}
        </div>
        {pageInsertGap(primaryBodyFrame.pageNum - 1)}
      </div>

      {overflowFrames.map((frame) => (
        <div
          key={`overflow-${frame.pageNum}`}
          className="studio-page-unit flow-doc-overflow-page"
          style={{ marginTop: pageGapPx }}
        >
          <div
            className={`doc-page doc-page-sheet${frame.showHeader ? ' has-header' : ''}${frame.showFooter ? ' has-footer' : ''}`}
            data-page={frame.pageNum}
            data-page-total={total}
            style={combinedStyle}
          >
            {frame.showHeader && (
              <ChromeComponent
                chrome={resolveDocChrome(chrome, {
                  title,
                  page: frame.pageNum,
                  total,
                })}
                position="header"
                {...chromeProps}
              />
            )}
            <div className="doc-page-body">
              <DocRenderer
                blocks={frame.blocks}
                sections={sections}
                pageFragments={frame.fragments}
              />
            </div>
            {frame.showFooter && (
              <ChromeComponent
                chrome={resolveDocChrome(chrome, {
                  title,
                  page: frame.pageNum,
                  total,
                })}
                position="footer"
                {...chromeProps}
              />
            )}
          </div>
          {pageInsertGap(frame.pageNum - 1)}
        </div>
      ))}
    </div>
  );
}
