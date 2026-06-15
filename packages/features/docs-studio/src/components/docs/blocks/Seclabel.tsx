'use client';

import StudioPopover from '../studio/StudioPopover';

interface SeclabelProps {
  text?: string;
  content?: string;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onActivate?: () => void;
}

export default function Seclabel({
  text,
  content = '',
  editable,
  editing,
  onChange,
  onActivate,
}: SeclabelProps) {
  const value = text ?? content.trim();

  return (
    <div className="seclabel-block">
      {(value || editable) && (
        <StudioPopover
          editable={editable}
          value={value}
          onChange={(v) => onChange?.(v)}
          singleLine
          editing={editing}
          onActivate={onActivate}
        >
          <span className="seclabel">{value}</span>
        </StudioPopover>
      )}
    </div>
  );
}
