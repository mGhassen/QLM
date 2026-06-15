"use client";

import type { ElementType, ReactNode } from "react";
import StudioPopover from "./StudioPopover";

interface InlineFieldProps {
  value: string;
  onChange?: (value: string) => void;
  editable?: boolean;
  className?: string;
  as?: ElementType;
  multiline?: boolean;
  wysiwyg?: boolean;
  raw?: boolean;
  placeholder?: string;
  children?: ReactNode;
}

export default function InlineField({
  value,
  onChange,
  editable,
  className = "",
  as: Tag = "span",
  wysiwyg,
  raw,
  children,
}: InlineFieldProps) {
  const display = children ?? <Tag className={className}>{value}</Tag>;

  if (!editable || !onChange) {
    if (!value && !children) return null;
    return <>{display}</>;
  }

  return (
    <StudioPopover editable value={value} onChange={onChange} wysiwyg={wysiwyg} raw={raw}>
      {display}
    </StudioPopover>
  );
}
