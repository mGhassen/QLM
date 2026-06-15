"use client";

import MarkdownContent from "./MarkdownContent";
import StudioPopover from "../studio/StudioPopover";

interface PhaseProps {
  title?: string;
  content?: string;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onPropChange?: (key: string, value: unknown) => void;
  onActivate?: () => void;
}

export default function Phase({
  title,
  content = "",
  editable,
  editing,
  onChange,
  onPropChange,
  onActivate,
}: PhaseProps) {
  const lines = content.split("\n").filter(Boolean);
  const phaseTitle = title ?? lines[0]?.replace(/^#+\s*/, "") ?? "";
  const listContent = title !== undefined ? content : lines.slice(1).join("\n");

  function updateTitle(newTitle: string) {
    if (onPropChange) {
      onPropChange("title", newTitle);
      return;
    }
    onChange?.([newTitle, listContent].filter(Boolean).join("\n"));
  }

  function updateBody(newBody: string) {
    onChange?.([phaseTitle, newBody].filter(Boolean).join("\n"));
  }

  return (
    <div className="phase">
      {(phaseTitle || editable) && (
        <StudioPopover editable={editable} value={phaseTitle} onChange={updateTitle} onActivate={onActivate}>
          <div className="ph">{phaseTitle}</div>
        </StudioPopover>
      )}
      <MarkdownContent
        content={listContent}
        editable={editable}
        editing={editing}
        onChange={updateBody}
        onActivate={onActivate}
      />
    </div>
  );
}
