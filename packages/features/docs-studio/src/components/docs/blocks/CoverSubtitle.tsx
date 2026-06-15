'use client';

import StudioPopover from '../studio/StudioPopover';
import {
  parseCoverSubtitle,
  serializeCoverSubtitle,
} from '#/lib/cover-subtitle';

interface CoverSubtitleProps {
  content?: string;
  subtitleUpColor?: string;
  subtitleOrColor?: string;
  subtitleDownColor?: string;
  editable?: boolean;
  onChange?: (content: string) => void;
  onActivate?: () => void;
}

export default function CoverSubtitle({
  content = '',
  subtitleUpColor,
  subtitleOrColor,
  subtitleDownColor,
  editable,
  onChange,
  onActivate,
}: CoverSubtitleProps) {
  const data = parseCoverSubtitle(content);

  function update(patch: Partial<typeof data>) {
    if (!onChange) return;
    onChange(serializeCoverSubtitle({ ...data, ...patch }));
  }

  const hasAny =
    data.subtitleUp || data.subtitleOr || data.subtitleDown || editable;
  if (!hasAny) return null;

  return (
    <div className="subt">
      {(data.subtitleUp || editable) && (
        <StudioPopover
          editable={editable}
          value={data.subtitleUp ?? ''}
          onChange={(v) => update({ subtitleUp: v })}
          singleLine
          wysiwyg
          onActivate={onActivate}
        >
          <span
            className="subt-up"
            style={subtitleUpColor ? { color: subtitleUpColor } : undefined}
          >
            {data.subtitleUp}
          </span>
        </StudioPopover>
      )}
      {(data.subtitleUp || editable) && (data.subtitleOr || editable) && ' '}
      {(data.subtitleOr || editable) && (
        <StudioPopover
          editable={editable}
          value={data.subtitleOr ?? ''}
          onChange={(v) => update({ subtitleOr: v })}
          singleLine
          wysiwyg
          onActivate={onActivate}
        >
          <span
            className="subt-or"
            style={subtitleOrColor ? { color: subtitleOrColor } : undefined}
          >
            {data.subtitleOr}
          </span>
        </StudioPopover>
      )}
      {(data.subtitleOr || editable) && (data.subtitleDown || editable) && ' '}
      {(data.subtitleDown || editable) && (
        <StudioPopover
          editable={editable}
          value={data.subtitleDown ?? ''}
          onChange={(v) => update({ subtitleDown: v })}
          singleLine
          wysiwyg
          onActivate={onActivate}
        >
          <span
            className="subt-down"
            style={subtitleDownColor ? { color: subtitleDownColor } : undefined}
          >
            {data.subtitleDown}
          </span>
        </StudioPopover>
      )}
    </div>
  );
}
