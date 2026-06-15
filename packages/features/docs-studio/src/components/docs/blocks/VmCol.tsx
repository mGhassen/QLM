"use client";

import { extractCards } from "#/lib/markdoc";
import MarkdownContent from "./MarkdownContent";
import StudioPopover from "../studio/StudioPopover";

interface VmColProps {
  content?: string;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onActivate?: () => void;
}

function serializeCard(title: string, body: string): string {
  return [title, body].filter(Boolean).join("\n");
}

export default function VmCol({
  content = "",
  editable,
  editing,
  onChange,
  onActivate,
}: VmColProps) {
  const cards = extractCards(content);
  const card = cards[0];
  const title = card?.title ?? "";
  const body = card?.body ?? content;

  function updateTitle(newTitle: string) {
    onChange?.(serializeCard(newTitle, body));
  }

  function updateBody(newBody: string) {
    onChange?.(serializeCard(title, newBody));
  }

  return (
    <div className="vmcol">
      {(title || editable) && (
        <StudioPopover
          editable={editable}
          value={title}
          onChange={updateTitle}
          singleLine
          onActivate={onActivate}
        >
          <h4>{title}</h4>
        </StudioPopover>
      )}
      <MarkdownContent
        content={body}
        editable={editable}
        editing={editing}
        onChange={updateBody}
        onActivate={onActivate}
      />
    </div>
  );
}
