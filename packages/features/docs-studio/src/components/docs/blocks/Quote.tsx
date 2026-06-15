"use client";

import StudioPopover from "../studio/StudioPopover";

interface QuoteProps {
  variant?: "cquote" | "pull" | "rail";
  content?: string;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
}

export default function Quote({ variant = "cquote", content = "", editable, editing, onChange }: QuoteProps) {
  const lines = content.split("\n").filter(Boolean);
  const quote = lines.find((l) => l.startsWith("> "))?.replace("> ", "") ?? lines[0] ?? "";
  const author = lines.find((l) => l.startsWith("— "))?.replace("— ", "") ?? "";
  const role = lines.find((l) => l.startsWith("role: "))?.replace("role: ", "") ?? "";

  function serialize(q: string, a: string, r: string) {
    const out: string[] = [];
    if (q) out.push(`> ${q}`);
    if (a) out.push(`— ${a}`);
    if (r) out.push(`role: ${r}`);
    return out.join("\n");
  }

  function update(field: "quote" | "author" | "role", value: string) {
    if (!onChange) return;
    const next = { quote, author, role, [field]: value };
    onChange(serialize(next.quote, next.author, next.role));
  }

  if (variant === "pull") {
    return (
      <div className="pull">
        <StudioPopover editable={editable} value={quote} onChange={(v) => update("quote", v)} wysiwyg editing={editing}>
          <div className="q">{quote}</div>
        </StudioPopover>
      </div>
    );
  }

  return (
    <div className="cquote">
      <span className="mark">&ldquo;</span>
      <StudioPopover editable={editable} value={quote} onChange={(v) => update("quote", v)} wysiwyg editing={editing}>
        <div className="q">{quote}</div>
      </StudioPopover>
      <div className="a">
        <StudioPopover editable={editable} value={author} onChange={(v) => update("author", v)}>
          <span>{author}</span>
        </StudioPopover>
        {(role || editable) && (
          <>
            {" — "}
            <StudioPopover editable={editable} value={role} onChange={(v) => update("role", v)}>
              <span>{role}</span>
            </StudioPopover>
          </>
        )}
      </div>
    </div>
  );
}
