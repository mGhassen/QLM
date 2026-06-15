"use client";

import StudioPopover from "../studio/StudioPopover";
import {
  parseCoverToc,
  serializeCoverToc,
  type TocEntry,
} from "#/lib/cover-toc";

interface CoverTocProps {
  title?: string;
  content?: string;
  editable?: boolean;
  onChange?: (content: string) => void;
  onPropChange?: (key: string, value: unknown) => void;
  onActivate?: () => void;
}

const DEFAULT_TITLE = "Au sommaire";

export default function CoverToc({
  title = DEFAULT_TITLE,
  content = "",
  editable,
  onChange,
  onPropChange,
  onActivate,
}: CoverTocProps) {
  const entries = parseCoverToc(content);

  function update(entries: TocEntry[]) {
    onChange?.(serializeCoverToc(entries));
  }

  function updateEntry(index: number, patch: Partial<TocEntry>) {
    const next = [...entries];
    next[index] = { ...next[index], ...patch };
    update(next);
  }

  function addEntry() {
    const num = String(entries.length + 1).padStart(2, "0");
    update([...entries, { num, label: "New section", href: "#" }]);
  }

  function removeEntry(index: number) {
    update(entries.filter((_, i) => i !== index));
  }

  return (
    <div className={`cover-panel-block cover-toc-wrap${editable ? " studio-toc-zone" : ""}`}>
      {(title || editable) && (
        <StudioPopover
          editable={editable}
          value={title}
          onChange={(v) => onPropChange?.("title", v)}
          singleLine
          onActivate={onActivate}
        >
          <div className="cover-panel-label">{title}</div>
        </StudioPopover>
      )}
      <ol className="cover-toc">
        {entries.map((item, i) => (
          <li key={`${item.href}-${i}`} className={editable ? "studio-toc-item" : undefined}>
            <a
              href={item.href}
              onClick={editable ? (e) => e.preventDefault() : undefined}
            >
              {editable ? (
                <>
                  <StudioPopover
                    editable
                    value={item.num}
                    onChange={(num) => updateEntry(i, { num })}
                    singleLine
                  >
                    <span className="n">{item.num}</span>
                  </StudioPopover>
                  <StudioPopover
                    editable
                    value={item.label}
                    onChange={(label) => updateEntry(i, { label })}
                    singleLine
                  >
                    <span>{item.label}</span>
                  </StudioPopover>
                </>
              ) : (
                <>
                  <span className="n">{item.num}</span>
                  <span>{item.label}</span>
                </>
              )}
            </a>
            {editable && (
              <div className="studio-toc-chrome">
                <StudioPopover
                  editable
                  value={item.href}
                  onChange={(href) => updateEntry(i, { href })}
                  singleLine
                  wysiwyg={false}
                >
                  <span className="studio-toc-href">{item.href}</span>
                </StudioPopover>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEntry(i);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
      {editable && (
        <button
          type="button"
          className="studio-toc-add"
          onClick={(e) => {
            e.stopPropagation();
            addEntry();
          }}
        >
          + Add
        </button>
      )}
    </div>
  );
}
