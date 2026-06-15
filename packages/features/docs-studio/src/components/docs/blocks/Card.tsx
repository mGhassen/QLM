"use client";

import { extractCards } from "#/lib/markdoc";
import MarkdownContent from "./MarkdownContent";
import StudioPopover from "../studio/StudioPopover";

interface CardProps {
  variant?: "req" | "t-yellow" | "t-ink";
  title?: string;
  className?: string;
  content?: string;
  paddingScale?: number;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onActivate?: () => void;
}

function serializeCard(title: string, body: string): string {
  return [title, body].filter(Boolean).join("\n");
}

export default function Card({
  variant = "t-yellow",
  title,
  className,
  content = "",
  paddingScale = 1,
  editable,
  editing,
  onChange,
  onActivate,
}: CardProps) {
  const cards = extractCards(content);
  const card = cards[0];
  const cardTitle = title ?? card?.title ?? "";
  const cardBody = card?.body ?? content;

  const variantClass = variant === "req" ? "req" : variant;

  function updateTitle(newTitle: string) {
    onChange?.(serializeCard(newTitle, cardBody));
  }

  function updateBody(newBody: string) {
    onChange?.(serializeCard(cardTitle, newBody));
  }

  return (
    <div
      className={["card", variantClass, className].filter(Boolean).join(" ")}
      style={paddingScale !== 1 ? { padding: `${4 * paddingScale}mm` } : undefined}
    >
      {(cardTitle || editable) && (
        <StudioPopover
          editable={editable}
          value={cardTitle}
          onChange={updateTitle}
          singleLine
          onActivate={onActivate}
        >
          <h4>{cardTitle}</h4>
        </StudioPopover>
      )}
      <MarkdownContent
        content={cardBody}
        editable={editable}
        editing={editing}
        onChange={updateBody}
        onActivate={onActivate}
      />
    </div>
  );
}
