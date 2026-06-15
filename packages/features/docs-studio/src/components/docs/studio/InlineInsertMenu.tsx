"use client";

import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { createBlock } from "#/lib/serialize";
import { INLINE_INSERT_ITEMS, type PaletteItem } from "#/lib/palette";
import type { BlockNode } from "#/lib/types";

interface InlineInsertMenuProps {
  onInsert: (block: BlockNode) => void;
  variant?: "floating" | "toolbar" | "page-gap";
  items?: PaletteItem[];
  menuTitle?: string;
  buttonTitle?: string;
}

function insertItem(onInsert: (block: BlockNode) => void, item: PaletteItem) {
  onInsert(createBlock(item.type, item.overrides));
}

export default function InlineInsertMenu({
  onInsert,
  variant = "floating",
  items = INLINE_INSERT_ITEMS,
  menuTitle = "Insert after",
  buttonTitle = "Insert block after",
}: InlineInsertMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const isToolbar = variant === "toolbar";
  const isPageGap = variant === "page-gap";

  return (
    <div
      ref={ref}
      className={[
        isToolbar
          ? "studio-inline-insert-toolbar"
          : isPageGap
            ? "studio-inline-insert-page-gap"
            : "studio-inline-insert",
        open ? "is-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={isToolbar ? undefined : isPageGap ? "studio-insert-btn-page-gap" : "studio-insert-btn"}
        onClick={() => setOpen((o) => !o)}
        title={buttonTitle}
      >
        <Plus size={isToolbar ? 12 : isPageGap ? 16 : 14} />
      </button>

      {open && (
        <div
          className={`studio-insert-menu studio-insert-menu-wide${isToolbar ? " studio-insert-menu-toolbar" : ""}${isPageGap ? " studio-insert-menu-page-gap" : ""}`}
        >
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-2 py-1">
            {menuTitle}
          </div>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className="studio-insert-item"
              onClick={() => {
                insertItem(onInsert, item);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
