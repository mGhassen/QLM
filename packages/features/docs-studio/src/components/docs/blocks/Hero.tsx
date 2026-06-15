"use client";

import MarkdownContent from "./MarkdownContent";
import StudioPopover from "../studio/StudioPopover";

interface HeroProps {
  tag?: string;
  content?: string;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onPropChange?: (key: string, value: unknown) => void;
  onActivate?: () => void;
}

function serializeHero(tag: string, stmt: string, rest: string): string {
  const lines: string[] = [];
  if (tag) lines.push(`## ${tag}`);
  if (stmt) lines.push(`# ${stmt}`);
  if (rest) lines.push(rest);
  return lines.join("\n");
}

export default function Hero({
  tag,
  content = "",
  editable,
  editing,
  onChange,
  onPropChange,
  onActivate,
}: HeroProps) {
  const lines = content.split("\n").filter(Boolean);
  const tagLine = lines.find((l) => l.startsWith("## "));
  const heroTag = tag ?? tagLine?.replace("## ", "") ?? "";
  const stmt = lines.find((l) => l.startsWith("# "))?.replace("# ", "") ?? lines[0] ?? "";
  const rest = lines.filter((l) => !l.startsWith("#") && !l.startsWith("## ")).join("\n");

  function updateStmt(newStmt: string) {
    onChange?.(serializeHero(heroTag, newStmt, rest));
  }

  return (
    <div className="hero">
      {(heroTag || editable) && (
        <StudioPopover
          editable={editable}
          value={heroTag}
          onChange={(v) => (onPropChange ? onPropChange("tag", v) : onChange?.(serializeHero(v, stmt, rest)))}
          singleLine
          onActivate={onActivate}
        >
          <div className="tag">{heroTag}</div>
        </StudioPopover>
      )}
      {(stmt || editable) && (
        <StudioPopover
          editable={editable}
          value={stmt}
          onChange={updateStmt}
          singleLine
          onActivate={onActivate}
        >
          <p className="stmt">{stmt}</p>
        </StudioPopover>
      )}
      {(rest || editable) && (
        <MarkdownContent
          content={rest}
          editable={editable}
          editing={editing}
          onChange={(c) => onChange?.(serializeHero(heroTag, stmt, c))}
          onActivate={onActivate}
        />
      )}
    </div>
  );
}
