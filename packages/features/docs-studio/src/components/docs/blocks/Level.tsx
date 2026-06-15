"use client";

import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import MarkdownContent from "./MarkdownContent";
import StudioPopover from "../studio/StudioPopover";

interface LevelProps {
  level?: number;
  name?: string;
  highlightCol?: boolean;
  content?: string;
  children?: ReactNode;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onPropChange?: (key: string, value: unknown) => void;
  onActivate?: () => void;
}

export default function Level({
  level = 1,
  name,
  highlightCol,
  content = "",
  children,
  editable,
  editing,
  onChange,
  onPropChange,
  onActivate,
}: LevelProps) {
  const legacyCols = content ? content.split("\n---\n").map((c) => c.trim()) : [];
  const childCount = Children.count(children);
  const columnCount = childCount > 0 ? childCount : Math.max(legacyCols.length, 2);

  function updateLegacyCol(index: number, col: string) {
    if (!onChange) return;
    const next = [...legacyCols];
    while (next.length < columnCount) next.push("");
    next[index] = col;
    onChange(next.join("\n---\n"));
  }

  const renderedChildren =
    childCount > 0
      ? Children.map(children, (child, i) => {
          if (!isValidElement(child)) return child;
          return cloneElement(child as React.ReactElement<{ highlight?: boolean }>, {
            highlight: highlightCol && i === columnCount - 1,
          });
        })
      : legacyCols.map((col, i) => (
          <div
            key={i}
            className={`col${highlightCol && i === columnCount - 1 ? " gapcol" : ""}`}
          >
            <MarkdownContent
              content={col}
              editable={editable}
              editing={editing}
              onChange={(c) => updateLegacyCol(i, c)}
              onActivate={onActivate}
            />
          </div>
        ));

  return (
    <div className={`lvl l${level}`}>
      <div className="tab">
        <div className="n">L{level}</div>
        {(name || editable) && (
          <StudioPopover
            editable={editable}
            value={name ?? ""}
            onChange={(v) => onPropChange?.("name", v)}
            singleLine
            editing={editing}
            onActivate={onActivate}
          >
            <span className="nm">{name}</span>
          </StudioPopover>
        )}
      </div>
      {renderedChildren}
    </div>
  );
}
