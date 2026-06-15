"use client";

import MarkdownContent from "./MarkdownContent";

interface LvlColProps {
  content?: string;
  highlight?: boolean;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onActivate?: () => void;
}

export default function LvlCol({
  content = "",
  highlight,
  editable,
  editing,
  onChange,
  onActivate,
}: LvlColProps) {
  return (
    <div className={`col${highlight ? " gapcol" : ""}`}>
      <MarkdownContent
        content={content}
        editable={editable}
        editing={editing}
        onChange={onChange}
        onActivate={onActivate}
      />
    </div>
  );
}
