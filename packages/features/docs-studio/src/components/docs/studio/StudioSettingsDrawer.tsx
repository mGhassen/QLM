"use client";

import { X } from "lucide-react";
import type { ChromeZoneId, DocChrome, DocLayoutMode, DocPageFormat, DocPageSetup, DocTheme } from "#/lib/types";
import PageSetupPanel from "./PageSetupPanel";

interface StudioSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  slug: string;
  title: string;
  layoutMode: DocLayoutMode;
  pageFormat: DocPageFormat;
  pageSetup?: DocPageSetup;
  pageCount: number;
  blockCount: number;
  theme: DocTheme;
  chrome: DocChrome;
  selectedChromeZone?: ChromeZoneId | null;
  onLayoutModeChange: (mode: DocLayoutMode) => void;
  onPageSetupChange: (setup: DocPageSetup) => void;
  onThemeChange: (theme: DocTheme) => void;
  onChromeChange: (chrome: DocChrome) => void;
}

export default function StudioSettingsDrawer({
  open,
  onClose,
  slug,
  title,
  layoutMode,
  pageFormat,
  pageSetup,
  pageCount,
  blockCount,
  theme,
  chrome,
  selectedChromeZone,
  onLayoutModeChange,
  onPageSetupChange,
  onThemeChange,
  onChromeChange,
}: StudioSettingsDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div className="studio-settings-backdrop" onClick={onClose} aria-hidden />
      <aside data-studio-chrome className="studio-settings-drawer">
        <div className="studio-settings-drawer-header">
          <h2 className="text-sm font-medium">Document settings</h2>
          <button type="button" className="studio-settings-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="studio-settings-drawer-body">
          <PageSetupPanel
            slug={slug}
            title={title}
            layoutMode={layoutMode}
            pageFormat={pageFormat}
            pageSetup={pageSetup}
            pageCount={pageCount}
            blockCount={blockCount}
            theme={theme}
            chrome={chrome}
            selectedChromeZone={selectedChromeZone}
            onLayoutModeChange={onLayoutModeChange}
            onPageSetupChange={onPageSetupChange}
            onThemeChange={onThemeChange}
            onChromeChange={onChromeChange}
          />
        </div>
      </aside>
    </>
  );
}
