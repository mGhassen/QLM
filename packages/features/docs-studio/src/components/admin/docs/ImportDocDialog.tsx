"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { Upload } from "lucide-react";
import { Button } from "@qlm/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@qlm/ui/dialog";
import { Input } from "@qlm/ui/input";
import { Label } from "@qlm/ui/label";

interface ImportDocDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (result: { slug: string; title: string }) => void;
  importDocAction: (formData: FormData) => Promise<{ slug: string; title: string }>;
}

export default function ImportDocDialog({
  open,
  onClose,
  onImported,
  importDocAction,
}: ImportDocDialogProps) {
  const { t } = useTranslation("studio");
  const { t: tCommon } = useTranslation("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setFile(null);
    setTitle("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    if (!file) return;
    startTransition(async () => {
      setError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (title.trim()) {
          formData.append("title", title.trim());
        }
        const result = await importDocAction(formData);
        reset();
        onImported(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("import.error"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="gap-4 rounded-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{t("import.dialogTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="file"
              accept=".html,.htm,.pdf,text/html,application/pdf"
              className="sr-only"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError(null);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start rounded-none text-xs"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
            >
              <Upload size={14} className="mr-2" />
              {file?.name ?? t("import.chooseFile")}
            </Button>
            <p className="text-muted-foreground text-[11px]">{t("import.acceptedFormats")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-doc-title" className="text-xs">
              {t("import.titleLabel")}
            </Label>
            <Input
              id="import-doc-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("import.titlePlaceholder")}
              className="rounded-none text-xs"
              disabled={pending}
            />
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            className="rounded-none text-xs"
            onClick={handleClose}
            disabled={pending}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            className="rounded-none text-xs"
            onClick={handleSubmit}
            disabled={pending || !file}
          >
            {pending ? t("import.importing") : t("import.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
