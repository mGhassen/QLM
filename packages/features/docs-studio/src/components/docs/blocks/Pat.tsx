"use client";

import MarkdownContent from "./MarkdownContent";
import StudioPopover from "../studio/StudioPopover";

interface PatProps {
  number?: string;
  content?: string;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onPropChange?: (key: string, value: unknown) => void;
  onActivate?: () => void;
}

export default function Pat({
  number,
  content = "",
  editable,
  editing,
  onChange,
  onPropChange,
  onActivate,
}: PatProps) {
  const lines = content.split("\n").filter(Boolean);
  const num = number ?? lines[0]?.match(/^(\d+)/)?.[1] ?? "";
  const body = lines.join("\n");

  return (
    <div className="pat">
      {(num || editable) && (
        <StudioPopover
          editable={editable}
          value={num}
          onChange={(v) => onPropChange?.("number", v)}
          singleLine
          onActivate={onActivate}
        >
          <span className="pn">{num}</span>
        </StudioPopover>
      )}
      <MarkdownContent
        content={body}
        editable={editable}
        editing={editing}
        onChange={onChange}
        onActivate={onActivate}
      />
    </div>
  );
}
