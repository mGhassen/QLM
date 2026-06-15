"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Search, Trash2 } from "lucide-react";
import { Button } from "@guepard/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@guepard/ui/dialog";
import { Input } from "@guepard/ui/input";
import { cn } from "@guepard/ui/utils";
import type { DocListItem } from "#/lib/types";
import { useStudioShell } from "#/studio-shell-context";
import type { DocStudioActions } from "#/types/actions";
import ImportDocDialog from "./ImportDocDialog";

interface DocsPickerDialogProps extends DocStudioActions {
  open: boolean;
  onClose: () => void;
  allDocs: DocListItem[];
}

export default function DocsPickerDialog({
  open,
  onClose,
  allDocs,
  createNewDocAction,
  deleteDocAction,
  importDocAction,
}: DocsPickerDialogProps) {
  const { t } = useTranslation("studio");
  const router = useRouter();
  const { activeSlug, openDoc, closeDocTab } = useStudioShell();
  const [query, setQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allDocs;
    return allDocs.filter(
      (d) => d.title.toLowerCase().includes(q) || d.slug.toLowerCase().includes(q),
    );
  }, [allDocs, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  function handleCreate() {
    startTransition(async () => {
      const { slug } = await createNewDocAction();
      router.invalidate();
      onClose();
      openDoc(slug, "New Doc");
    });
  }

  function handleOpen(doc: DocListItem) {
    onClose();
    openDoc(doc.slug, doc.title);
  }

  function handleDelete(slug: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const remaining = allDocs.filter((d) => d.slug !== slug);
      await deleteDocAction(slug);
      closeDocTab(slug);
      router.invalidate();

      if (remaining.length === 0) {
        const { slug: newSlug } = await createNewDocAction();
        openDoc(newSlug, "New Doc");
      } else if (slug === activeSlug) {
        openDoc(remaining[0]!.slug, remaining[0]!.title);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="gap-0 rounded-none p-0 sm:max-w-md">
        <DialogHeader className="border-border flex-row items-center gap-3 space-y-0 border-b px-4 py-3">
          <DialogTitle className="text-muted-foreground flex-1 text-xs font-semibold tracking-wider uppercase">
            Documents
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setImportOpen(true)}
            disabled={pending}
            className="h-7 rounded-none text-xs"
          >
            {t("import.button")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCreate}
            disabled={pending}
            className="h-7 rounded-none text-xs"
          >
            + New
          </Button>
        </DialogHeader>

        <div className="border-border border-b px-4 py-2">
          <div className="relative">
            <Search
              size={12}
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 -translate-y-1/2"
            />
            <Input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter…"
              className="h-8 rounded-none pl-7 text-xs"
            />
          </div>
        </div>

        <ul className="max-h-[50vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="text-muted-foreground px-4 py-8 text-center text-xs">
              No matches
            </li>
          ) : (
            filtered.map((doc) => (
              <li
                key={doc.slug}
                className={cn(
                  "group border-border flex items-center border-b last:border-b-0",
                  doc.slug === activeSlug ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <button
                  type="button"
                  onClick={() => handleOpen(doc)}
                  className="min-w-0 flex-1 px-4 py-2.5 text-left"
                >
                  <p className="truncate text-xs font-medium">{doc.title}</p>
                  <p className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                    {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · {doc.slug}
                  </p>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(doc.slug, doc.title)}
                  disabled={pending}
                  className="text-muted-foreground hover:text-destructive mr-2 rounded-none opacity-0 group-hover:opacity-100"
                  aria-label={`Delete ${doc.title}`}
                >
                  <Trash2 size={12} />
                </Button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>

      <ImportDocDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        importDocAction={importDocAction}
        onImported={({ slug, title }) => {
          setImportOpen(false);
          startTransition(async () => {
            router.invalidate();
            onClose();
            openDoc(slug, title);
          });
        }}
      />
    </Dialog>
  );
}
