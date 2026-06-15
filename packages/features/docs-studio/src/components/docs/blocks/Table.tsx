'use client';

import { useState } from 'react';
import { extractTableData } from '#/lib/markdoc';
import WysiwygEditor from '../studio/WysiwygEditor';
import StudioPopover from '../studio/StudioPopover';

interface TableProps {
  title?: string;
  variant?: string;
  content?: string;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onPropChange?: (key: string, value: unknown) => void;
  onActivate?: () => void;
}

function TablePreview({
  title,
  variantClass,
  data,
  editable,
  editing,
  onPropChange,
  onActivate,
}: {
  title?: string;
  variantClass: string;
  data: ReturnType<typeof extractTableData>;
  editable?: boolean;
  editing?: boolean;
  onPropChange?: (key: string, value: unknown) => void;
  onActivate?: () => void;
}) {
  return (
    <div className={`tbl${variantClass}`}>
      {(title || editable) && (
        <StudioPopover
          editable={editable}
          value={title ?? ''}
          onChange={(v) => onPropChange?.('title', v)}
          singleLine
          editing={editing}
          onActivate={onActivate}
        >
          <div className="ttl">{title}</div>
        </StudioPopover>
      )}
      {data && (
        <table>
          <thead>
            <tr>
              {data.headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, ri) => (
              <tr
                key={ri}
                className={row[0]?.startsWith('**') ? 'bf' : undefined}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    dangerouslySetInnerHTML={{
                      __html: cell.replace(
                        /\*\*(.+?)\*\*/g,
                        '<strong>$1</strong>',
                      ),
                    }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Table({
  title,
  variant = '',
  content = '',
  editable,
  editing,
  onChange,
  onPropChange,
  onActivate,
}: TableProps) {
  const [active, setActive] = useState(false);
  const isEditing = active || !!editing;
  const data = extractTableData(content);
  const variantClass = variant ? ` ${variant}` : '';

  if (!data && !editable) return null;

  const preview = (
    <TablePreview
      title={title}
      variantClass={variantClass}
      data={data}
      editable={editable}
      editing={editing}
      onPropChange={onPropChange}
      onActivate={onActivate}
    />
  );

  if (!editable || !onChange) {
    return preview;
  }

  return (
    <div
      className={[
        'studio-table-edit',
        !isEditing ? 'studio-inline-field studio-inline-field-idle' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onMouseDown={(e) => {
        if (isEditing) e.stopPropagation();
      }}
    >
      {preview}
      {isEditing && (
        <div className="studio-table-edit-layer">
          <WysiwygEditor
            content={content}
            onChange={onChange}
            inline
            overlay
            active
            autoFocus={active}
            onDeactivate={() => setActive(false)}
          />
        </div>
      )}
    </div>
  );
}
