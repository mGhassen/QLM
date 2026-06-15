'use client';

import { useState } from 'react';
import StudioPopover from '../studio/StudioPopover';
import StudioImageUpload from '../studio/StudioImageUpload';

interface FigureProps {
  src?: string;
  caption?: string;
  wide?: boolean;
  content?: string;
  docSlug?: string;
  editable?: boolean;
  onChange?: (content: string) => void;
}

function parseFigure(content: string, src?: string, caption?: string) {
  const lines = content.split('\n');
  return {
    src:
      src ??
      lines.find((l) => l.startsWith('src: '))?.replace('src: ', '') ??
      '',
    caption:
      caption ??
      lines.find((l) => l.startsWith('caption: '))?.replace('caption: ', '') ??
      '',
  };
}

function serializeFigure(src: string, caption: string): string {
  const lines: string[] = [];
  if (src) lines.push(`src: ${src}`);
  if (caption) lines.push(`caption: ${caption}`);
  return lines.join('\n');
}

export default function Figure({
  src: srcProp,
  caption: captionProp,
  wide,
  content = '',
  docSlug,
  editable,
  onChange,
}: FigureProps) {
  const [editSrc, setEditSrc] = useState(false);
  const { src, caption } = parseFigure(content, srcProp, captionProp);

  function update(field: 'src' | 'caption', value: string) {
    if (!onChange) return;
    const next = { src, caption, [field]: value };
    onChange(serializeFigure(next.src, next.caption));
  }

  if (!src && !editable) return null;

  return (
    <div className={`fig${wide ? ' wide' : ''}`}>
      {src && <img src={src} alt={caption} />}
      {editable && editSrc && (
        <div className="studio-fig-meta" onClick={(e) => e.stopPropagation()}>
          {docSlug && (
            <StudioImageUpload
              slug={docSlug}
              label={src ? 'Replace image' : 'Upload image'}
              onUploaded={(url) => {
                update('src', url);
                setEditSrc(false);
              }}
            />
          )}
          <input
            className="studio-popover-input"
            value={src}
            autoFocus
            onChange={(e) => update('src', e.target.value)}
            placeholder="Image URL"
          />
          <button
            type="button"
            className="studio-fig-meta-close"
            onClick={() => setEditSrc(false)}
          >
            Done
          </button>
        </div>
      )}
      {editable && !editSrc && (
        <button
          type="button"
          className="studio-fig-src-btn"
          onClick={(e) => {
            e.stopPropagation();
            setEditSrc(true);
          }}
        >
          {src ? 'Edit image' : 'Add image'}
        </button>
      )}
      {(caption || editable) && (
        <StudioPopover
          editable={editable}
          value={caption}
          onChange={(v) => update('caption', v)}
        >
          <div className="cap">{caption}</div>
        </StudioPopover>
      )}
    </div>
  );
}
