'use client';

import MarkdownContent from './MarkdownContent';
import StudioPopover from '../studio/StudioPopover';

interface AlertProps {
  variant?: 'read' | 'insight' | 'warn' | 'predict';
  tag?: string;
  content?: string;
  big?: boolean;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onPropChange?: (key: string, value: unknown) => void;
  onActivate?: () => void;
}

function serializeAlert(tag: string, body: string): string {
  const lines: string[] = [];
  if (tag) lines.push(`## ${tag}`);
  if (body) lines.push(body);
  return lines.join('\n');
}

export default function Alert({
  variant = 'read',
  tag,
  content = '',
  big,
  editable,
  editing,
  onChange,
  onPropChange,
  onActivate,
}: AlertProps) {
  const lines = content.split('\n');
  const tagLine = lines.find((l) => l.startsWith('## '));
  const alertTag = tag ?? tagLine?.replace('## ', '') ?? 'Note';
  const body = lines
    .filter((l) => !l.startsWith('## '))
    .join('\n')
    .trim();

  function updateTag(newTag: string) {
    if (onPropChange) {
      onPropChange('tag', newTag);
    } else {
      onChange?.(serializeAlert(newTag, body));
    }
  }

  function updateBody(newBody: string) {
    onChange?.(serializeAlert(alertTag, newBody));
  }

  return (
    <div className={`alert ${variant}`}>
      <StudioPopover
        editable={editable}
        value={alertTag}
        onChange={updateTag}
        singleLine
        onActivate={onActivate}
      >
        <span className="tag">{alertTag}</span>
      </StudioPopover>
      {big ? (
        <MarkdownContent
          content={body}
          className="big"
          editable={editable}
          editing={editing}
          onChange={updateBody}
          onActivate={onActivate}
        />
      ) : (
        <MarkdownContent
          content={body}
          editable={editable}
          editing={editing}
          onChange={updateBody}
          onActivate={onActivate}
        />
      )}
    </div>
  );
}
