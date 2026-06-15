'use client';

import { useState } from 'react';
import { renderMarkdocToHtml } from '#/lib/markdoc';
import type { BlockNode } from '#/lib/types';
import WysiwygEditor from '../studio/WysiwygEditor';

interface MarkdownContentProps {
  content: string;
  className?: string;
  editable?: boolean;
  editing?: boolean;
  blockId?: string;
  onChange?: (content: string) => void;
  onActivate?: () => void;
  onInsertAfter?: (block: BlockNode) => void;
}

export default function MarkdownContent({
  content,
  className,
  editable,
  editing,
  blockId,
  onChange,
  onActivate,
  onInsertAfter,
}: MarkdownContentProps) {
  const [active, setActive] = useState(false);
  const isEditing = active || !!editing;

  if (!editable || !onChange) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: renderMarkdocToHtml(content) }}
      />
    );
  }

  if (!isEditing) {
    return (
      <div
        className={[
          className,
          'studio-inline-field',
          'studio-inline-field-idle',
        ]
          .filter(Boolean)
          .join(' ')}
        dangerouslySetInnerHTML={{ __html: renderMarkdocToHtml(content) }}
      />
    );
  }

  return (
    <div
      className={[className, 'studio-inline-field'].filter(Boolean).join(' ')}
    >
      <WysiwygEditor
        content={content}
        onChange={onChange}
        inline
        overlay={isEditing}
        active={isEditing}
        autoFocus={active}
        commitOnBlur
        blockId={blockId}
        onInsertAfter={onInsertAfter}
        onActivate={() => {
          onActivate?.();
          setActive(true);
        }}
        onDeactivate={() => setActive(false)}
      />
    </div>
  );
}
