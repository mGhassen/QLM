"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import type { ChromeZoneId, ChromeZoneStyle, DocChrome, DocPageSetup } from "#/lib/types";
import {
  defaultDocChrome,
  getZoneRawContent,
  resolveDocChrome,
  setZoneContent,
} from "#/lib/chrome";
import type { ResolvedPageSetup } from "#/lib/page-setup";
import WysiwygEditor from "./WysiwygEditor";
import ColorPicker from "./ColorPicker";

const ZONES: { id: ChromeZoneId; label: string }[] = [
  { id: "headerLeft", label: "Header L" },
  { id: "headerRight", label: "Header R" },
  { id: "footerLeft", label: "Footer L" },
  { id: "footerRight", label: "Footer R" },
];

const TOKENS = [
  { label: "Title", value: "{{title}}" },
  { label: "Page", value: "{{page}}" },
  { label: "Total", value: "{{total}}" },
];

const INPUT =
  "w-full rounded-none border border-border bg-background px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none";

interface ChromeEditorPanelProps {
  title: string;
  chrome: DocChrome;
  pageSetup?: DocPageSetup;
  resolvedSetup: ResolvedPageSetup;
  selectedZone?: ChromeZoneId | null;
  onChromeChange: (chrome: DocChrome) => void;
  onPageSetupChange: (setup: DocPageSetup) => void;
}

function zoneStyle(
  chrome: DocChrome,
  zone: ChromeZoneId,
): ChromeZoneStyle {
  const band = zone.startsWith("header") ? "header" : "footer";
  return {
    ...chrome.style?.[band],
    ...chrome.style?.[zone],
  };
}

function patchZoneStyle(
  chrome: DocChrome,
  zone: ChromeZoneId,
  patch: Partial<ChromeZoneStyle>,
): DocChrome {
  return {
    ...chrome,
    style: {
      ...chrome.style,
      [zone]: { ...zoneStyle(chrome, zone), ...patch },
    },
  };
}

export default function ChromeEditorPanel({
  title,
  chrome,
  pageSetup,
  resolvedSetup,
  selectedZone,
  onChromeChange,
  onPageSetupChange,
}: ChromeEditorPanelProps) {
  const chromeValues = { ...defaultDocChrome(title), ...chrome };
  const [activeZone, setActiveZone] = useState<ChromeZoneId>("headerLeft");
  const currentZone = selectedZone ?? activeZone;

  useEffect(() => {
    if (selectedZone) setActiveZone(selectedZone);
  }, [selectedZone]);

  const preview = useMemo(
    () => resolveDocChrome(chrome, { title, page: 2, total: 5 }),
    [chrome, title],
  );

  const patchChrome = (p: Partial<DocChrome>) => onChromeChange({ ...chrome, ...p });
  const patchSetup = (p: Partial<DocPageSetup>) =>
    onPageSetupChange({ ...pageSetup, ...p });

  const zoneContent = getZoneRawContent(chrome, currentZone);
  const currentStyle = zoneStyle(chrome, currentZone);

  function handleZoneContent(html: string) {
    onChromeChange(setZoneContent(chrome, currentZone, html));
  }

  function insertToken(token: string) {
    const plain = zoneContent.replace(/<[^>]+>/g, "").trim();
    const next = plain ? `${plain} ${token}` : token;
    handleZoneContent(`<p>${next}</p>`);
  }

  return (
    <div className="space-y-3" data-chrome-editor>
      <label className="flex items-center gap-2 text-sm text-muted-foreground/70">
        <input
          type="checkbox"
          checked={chromeValues.headerEnabled !== false}
          onChange={(e) => patchChrome({ headerEnabled: e.target.checked })}
        />
        Header
      </label>

      <label className="flex items-center gap-2 text-sm text-muted-foreground/70">
        <input
          type="checkbox"
          checked={chromeValues.footerEnabled !== false}
          onChange={(e) => patchChrome({ footerEnabled: e.target.checked })}
        />
        Footer
      </label>

      <label className="flex items-center gap-2 text-sm text-muted-foreground/70">
        <input
          type="checkbox"
          checked={!!chromeValues.showOnCover}
          onChange={(e) => patchChrome({ showOnCover: e.target.checked })}
        />
        Show on cover page
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground/50 block mb-1">Header zone</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={resolvedSetup.headerHeightMm}
              min={8}
              max={30}
              onChange={(e) => patchSetup({ headerHeightMm: Number(e.target.value) })}
              className={`${INPUT} font-mono text-xs`}
            />
            <span className="text-[10px] text-muted-foreground/35">mm</span>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground/50 block mb-1">Footer zone</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={resolvedSetup.footerHeightMm}
              min={8}
              max={30}
              onChange={(e) => patchSetup({ footerHeightMm: Number(e.target.value) })}
              className={`${INPUT} font-mono text-xs`}
            />
            <span className="text-[10px] text-muted-foreground/35">mm</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {ZONES.map((z) => (
          <button
            key={z.id}
            type="button"
            data-chrome-zone-tab={z.id}
            onClick={() => setActiveZone(z.id)}
            className={`text-[10px] px-2 py-1 rounded-sm border transition-colors ${
              currentZone === z.id
                ? "border-primary/50 bg-primary/20 text-foreground"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {z.label}
          </button>
        ))}
      </div>

      <div>
        <label className="text-[11px] font-medium text-muted-foreground/50 block mb-1">
          {ZONES.find((z) => z.id === currentZone)?.label} content
        </label>
        <div className="border-border bg-card overflow-hidden rounded-none border">
          <WysiwygEditor
            key={currentZone}
            content={zoneContent || "<p></p>"}
            onChange={handleZoneContent}
            singleLine
            htmlOutput
            showToolbar
            placeholder="Zone text…"
            className="px-2.5 py-1.5 text-xs min-h-[32px]"
          />
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {TOKENS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => insertToken(t.value)}
              className="text-[10px] px-2 py-0.5 rounded border border-border/10 text-muted-foreground/50 hover:bg-black/5 font-mono"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground/50 block mb-1">Font size</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={currentStyle.fontSizePt ?? 8}
              min={6}
              max={14}
              step={0.5}
              onChange={(e) =>
                onChromeChange(patchZoneStyle(chrome, currentZone, { fontSizePt: Number(e.target.value) }))
              }
              className={`${INPUT} font-mono text-xs`}
            />
            <span className="text-[10px] text-muted-foreground/35">pt</span>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground/50 block mb-1">Weight</label>
          <select
            value={currentStyle.fontWeight ?? 400}
            onChange={(e) =>
              onChromeChange(patchZoneStyle(chrome, currentZone, { fontWeight: Number(e.target.value) }))
            }
            className={INPUT}
          >
            <option value={400}>Regular</option>
            <option value={500}>Medium</option>
            <option value={600}>Semibold</option>
            <option value={700}>Bold</option>
          </select>
        </div>
      </div>

      <ColorPicker
        label="Color"
        value={currentStyle.color ?? "#8a8a8a"}
        onChange={(color) => onChromeChange(patchZoneStyle(chrome, currentZone, { color }))}
        variant="panel"
      />

      <div>
        <label className="text-[11px] font-medium text-muted-foreground/50 mb-1 flex items-center gap-1.5">
          <FileText size={12} />
          Preview (page 2)
        </label>
        <div className="border-border bg-muted text-muted-foreground space-y-1 rounded-none border px-3 py-2 text-[8pt]">
          {preview.showHeader && (
            <div className="flex justify-between gap-4 border-b border-border/5 pb-1">
              <span dangerouslySetInnerHTML={{ __html: preview.headerLeftHtml }} />
              <span dangerouslySetInnerHTML={{ __html: preview.headerRightHtml }} />
            </div>
          )}
          <div className="h-4" />
          {preview.showFooter && (
            <div className="flex justify-between gap-4 border-t border-border/5 pt-1">
              <span dangerouslySetInnerHTML={{ __html: preview.footerLeftHtml }} />
              <span dangerouslySetInnerHTML={{ __html: preview.footerRightHtml }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
