"use client";

import { extractCards } from "#/lib/markdoc";
import MarkdownContent from "./MarkdownContent";
import StudioPopover from "../studio/StudioPopover";

interface LCardProps {
  tier?: 1 | 2 | 3 | 4;
  content?: string;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onActivate?: () => void;
}

function serializeCard(title: string, body: string): string {
  return [title, body].filter(Boolean).join("\n");
}

export default function LCard({
  tier = 1,
  content = "",
  editable,
  editing,
  onChange,
  onActivate,
}: LCardProps) {
  const cards = extractCards(content);
  const card = cards[0];
  const title = card?.title ?? "";
  const numberMatch = title.match(/^(\d+)\s+(.*)/);
  const num = numberMatch?.[1] ?? "";
  const titleText = numberMatch?.[2] ?? title;
  const body = card?.body ?? content;

  function updateTitle(newTitle: string) {
    const full = num ? `${num} ${newTitle}` : newTitle;
    onChange?.(serializeCard(full, body));
  }

  function updateBody(newBody: string) {
    onChange?.(serializeCard(title, newBody));
  }

  return (
    <div className={`lcard t${tier}`}>
      {(titleText || editable) && (
        <StudioPopover
          editable={editable}
          value={titleText}
          onChange={updateTitle}
          singleLine
          onActivate={onActivate}
        >
          <h4>
            {num && <span className="n">{num}</span>}
            {titleText}
          </h4>
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
