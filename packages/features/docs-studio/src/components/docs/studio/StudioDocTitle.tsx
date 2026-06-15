"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@qlm/ui/input";
import { cn } from "@qlm/ui/utils";

interface StudioDocTitleProps {
  title: string;
  onChange: (title: string) => void;
}

export default function StudioDocTitle({ title, onChange }: StudioDocTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [title, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim() || "New Doc";
    setDraft(trimmed);
    if (trimmed !== title) onChange(trimmed);
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setDraft(title);
            setEditing(false);
          }
        }}
        className="h-7 max-w-[24rem] min-w-[8rem] rounded-none border-0 border-b bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-0"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "hover:bg-accent -mx-1 max-w-[24rem] truncate px-1 text-left text-sm font-medium transition-colors",
      )}
      title="Rename document"
    >
      {title}
    </button>
  );
}
