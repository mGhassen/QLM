'use client';

import { PAGE_END_INSERT_ITEMS } from '#/lib/palette';
import type { BlockNode } from '#/lib/types';
import InlineInsertMenu from './InlineInsertMenu';

interface PageGapInsertProps {
  onInsert: (block: BlockNode) => void;
}

export default function PageGapInsert({ onInsert }: PageGapInsertProps) {
  return (
    <div className="studio-page-insert-gap">
      <InlineInsertMenu
        variant="page-gap"
        items={PAGE_END_INSERT_ITEMS}
        menuTitle="Insert after page"
        buttonTitle="Insert after this page"
        onInsert={onInsert}
      />
    </div>
  );
}
