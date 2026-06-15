"use client";

import StudioPopover from "../studio/StudioPopover";

interface BrandProps {
  content?: string;
  editable?: boolean;
  editing?: boolean;
  onChange?: (content: string) => void;
  onActivate?: () => void;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function brandContentToHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "<p></p>";
  const space = trimmed.indexOf(" ");
  if (space === -1) return `<p>${escapeHtml(trimmed)}</p>`;
  return `<p>${escapeHtml(trimmed.slice(0, space))} <span class="brand-sub">${escapeHtml(trimmed.slice(space + 1))}</span></p>`;
}

function brandHtmlToContent(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBrand(content: string) {
  const trimmed = content.trim();
  const space = trimmed.indexOf(" ");
  return {
    main: space === -1 ? trimmed : trimmed.slice(0, space),
    sub: space === -1 ? "" : trimmed.slice(space + 1),
  };
}

export default function Brand({
  content = "QLM STRATEGIC RESEARCH",
  editable,
  editing,
  onChange,
  onActivate,
}: BrandProps) {
  const { main: brandMain, sub: brandSub } = parseBrand(content);

  const brandLine = (
    <div className="brand">
      {brandMain}
      {brandSub && (
        <>
          {" "}
          <span>{brandSub}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="hero2">
      {!editable || !onChange ? (
        brandLine
      ) : (
        <StudioPopover
          editable
          value={brandContentToHtml(content)}
          onChange={(html) => onChange(brandHtmlToContent(html))}
          singleLine
          htmlOutput
          editing={editing}
          onActivate={onActivate}
        >
          {brandLine}
        </StudioPopover>
      )}
      <div className="rule" />
    </div>
  );
}
