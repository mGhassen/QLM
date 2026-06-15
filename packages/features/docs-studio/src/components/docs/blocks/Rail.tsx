'use client';

import type { ReactNode } from 'react';
import { extractKpis } from '#/lib/markdoc';
import MarkdownContent from './MarkdownContent';
import StudioPopover from '../studio/StudioPopover';
import StudioImageUpload from '../studio/StudioImageUpload';

interface RailProps {
  variant?: 'dark' | 'note' | 'quote' | 'img';
  heading?: string;
  content?: string;
  src?: string;
  docSlug?: string;
  children?: ReactNode;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onPropChange?: (key: string, value: unknown) => void;
  onActivate?: () => void;
}

export default function Rail({
  variant = 'note',
  heading,
  content,
  src,
  docSlug,
  children,
  editable,
  editing,
  onChange,
  onPropChange,
  onActivate,
}: RailProps) {
  if (variant === 'img') {
    const imageSrc = src ?? content?.match(/src:\s*(.+)/)?.[1]?.trim() ?? '';
    return (
      <aside className="rail img">
        {imageSrc && <img src={imageSrc} alt="" />}
        {editable && onChange && (
          <div
            className="studio-rail-img-controls"
            onClick={(e) => e.stopPropagation()}
          >
            {docSlug && (
              <StudioImageUpload
                slug={docSlug}
                label={imageSrc ? 'Replace image' : 'Upload image'}
                onUploaded={(url) => onChange(`src: ${url}`)}
              />
            )}
            <StudioPopover
              editable
              value={imageSrc}
              onChange={(v) => onChange(`src: ${v}`)}
              singleLine
              onActivate={onActivate}
            >
              <span className="studio-rail-src">
                {imageSrc || 'Image URL…'}
              </span>
            </StudioPopover>
          </div>
        )}
      </aside>
    );
  }

  if (variant === 'dark' && content) {
    const kpis = extractKpis(content);
    if (kpis.length > 0) {
      const lines = content.split('\n');
      const headingLine = lines.find((l) => l.startsWith('## '));
      const rh = headingLine?.replace('## ', '') ?? heading;
      return (
        <aside className="rail dark">
          {(rh || editable) && (
            <StudioPopover
              editable={editable}
              value={rh ?? ''}
              onChange={(v) => {
                const rest = lines
                  .filter((l) => !l.startsWith('## '))
                  .join('\n');
                onChange?.([`## ${v}`, rest].filter(Boolean).join('\n'));
              }}
              singleLine
              onActivate={onActivate}
            >
              <div className="rh">{rh}</div>
            </StudioPopover>
          )}
          {kpis.map((kpi, i) => (
            <div key={i} className="row">
              <div className="big">{kpi.value}</div>
              <div className="lab">{kpi.label}</div>
            </div>
          ))}
        </aside>
      );
    }
  }

  const lines = (content ?? '').split('\n');
  const headingLine = lines.find((l) => l.startsWith('## '));
  const rh = heading ?? headingLine?.replace('## ', '') ?? '';
  const body = lines
    .filter((l) => !l.startsWith('## '))
    .join('\n')
    .trim();

  function serialize(nextHeading: string, nextBody: string) {
    const parts: string[] = [];
    if (nextHeading) parts.push(`## ${nextHeading}`);
    if (nextBody) parts.push(nextBody);
    return parts.join('\n');
  }

  function updateHeading(nextHeading: string) {
    onChange?.(serialize(nextHeading, body));
    onPropChange?.('heading', nextHeading);
  }

  function updateBody(nextBody: string) {
    onChange?.(serialize(rh, nextBody));
  }

  return (
    <aside className={`rail ${variant}`}>
      {(rh || editable) && (
        <StudioPopover
          editable={editable}
          value={rh}
          onChange={updateHeading}
          singleLine
          onActivate={onActivate}
        >
          <div className="rh">{rh}</div>
        </StudioPopover>
      )}
      {body || editable ? (
        <MarkdownContent
          content={body}
          editable={editable}
          editing={editing}
          onChange={updateBody}
          onActivate={onActivate}
        />
      ) : (
        children
      )}
    </aside>
  );
}
