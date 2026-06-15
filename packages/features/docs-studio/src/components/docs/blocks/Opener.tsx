"use client";

import StudioPopover from "../studio/StudioPopover";

interface OpenerProps {
  title?: string;
  number?: string;
  content?: string;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onPropChange?: (key: string, value: unknown) => void;
  onActivate?: () => void;
}

function parseTitle(content: string, titleProp?: string): string {
  if (titleProp) return titleProp;
  const titleLine = content.split("\n").find((l) => l.startsWith("title: "));
  if (titleLine) return titleLine.replace("title: ", "");
  return content.trim();
}

export default function Opener({
  title: titleProp,
  number,
  content = "",
  editable,
  editing,
  onChange,
  onPropChange,
  onActivate,
}: OpenerProps) {
  const title = parseTitle(content, titleProp);

  return (
    <div className="opener">
      {editable ? (
        <div data-as="h1">
          {(number || editable) && (
            <StudioPopover
              editable={editable}
              value={number ?? ""}
              onChange={(v) => onPropChange?.("number", v)}
              singleLine
              editing={editing}
              onActivate={onActivate}
            >
              <span className="n">{number}</span>
            </StudioPopover>
          )}
          {(title || editable) && (
            <StudioPopover
              editable={editable}
              value={title}
              onChange={(v) => onChange?.(v)}
              editing={editing}
              onActivate={onActivate}
            >
              <span>{title}</span>
            </StudioPopover>
          )}
        </div>
      ) : (
        <h1>
          {number && <span className="n">{number}</span>}
          {title}
        </h1>
      )}
    </div>
  );
}
