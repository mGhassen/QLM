"use client";

import { Plus } from "lucide-react";
import InlineInsertMenu from "./InlineInsertMenu";
import { INLINE_INSERT_ITEMS } from "#/lib/palette";
import type { BlockNode } from "#/lib/types";

interface StudioPageChromeProps {
  pageNumber: number;
  isContinuation?: boolean;
  onAddSection?: () => void;
  onInsertBlock?: (block: BlockNode) => void;
}

export default function StudioPageChrome({
  pageNumber,
  isContinuation,
  onAddSection,
  onInsertBlock,
}: StudioPageChromeProps) {
  return (
    <div className="studio-page-chrome">
      <span className="studio-page-chrome-label">
        {isContinuation ? `Page ${pageNumber} (continued)` : `Page ${pageNumber}`}
      </span>
      <div className="studio-page-chrome-actions">
        {onAddSection && (
          <button type="button" className="studio-page-chrome-btn" onClick={onAddSection}>
            <Plus size={12} />
            Section
          </button>
        )}
        {onInsertBlock && (
          <InlineInsertMenu
            variant="toolbar"
            items={INLINE_INSERT_ITEMS}
            menuTitle="Insert block"
            buttonTitle="Insert block on page"
            onInsert={onInsertBlock}
          />
        )}
      </div>
    </div>
  );
}
