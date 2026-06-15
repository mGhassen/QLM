'use client';

import StudioPopover from '../studio/StudioPopover';
import { renderInlineContent } from '#/lib/markdown-editor';

interface SubheadingProps {
  level?: 1 | 2 | 3;
  className?: string;
  text?: string;
  content?: string;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onActivate?: () => void;
}

export default function Subheading({
  level = 2,
  className,
  text = '',
  content,
  editable,
  editing,
  onChange,
  onActivate,
}: SubheadingProps) {
  const raw = text || content || '';
  const Tag = level === 1 ? 'h1' : level === 3 ? 'h3' : 'h2';
  const mergedClass = className ?? (level === 1 ? undefined : 'sub');
  const html = renderInlineContent(raw);

  if (!editable || !onChange) {
    if (!html) return <Tag className={mergedClass} />;
    return (
      <Tag className={mergedClass} dangerouslySetInnerHTML={{ __html: html }} />
    );
  }

  return (
    <StudioPopover
      editable
      value={raw}
      onChange={onChange}
      wysiwyg
      htmlOutput
      singleLine
      editing={editing}
      onActivate={onActivate}
    >
      <Tag
        className={mergedClass}
        dangerouslySetInnerHTML={{ __html: html || '' }}
      />
    </StudioPopover>
  );
}
