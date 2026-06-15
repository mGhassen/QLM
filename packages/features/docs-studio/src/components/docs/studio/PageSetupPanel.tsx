'use client';

import { useMemo } from 'react';
import {
  LayoutGrid,
  Globe,
  FileText,
  Monitor,
  Type,
  Ruler,
  ChevronDown,
} from 'lucide-react';
import type {
  ChromeZoneId,
  DocChrome,
  DocLayoutMode,
  DocPageSetup,
} from '#/lib/types';
import ChromeEditorPanel from './ChromeEditorPanel';
import {
  MARGIN_PRESETS,
  PAGE_FORMATS,
  WEB_WIDTH_PRESETS,
  formatDimensionsLabel,
  resolvePageSetup,
  type DocPageSetupFormat,
} from '#/lib/page-setup';
import type { DocPageFormat } from '#/lib/page-format';
import ThemeSettings from './ThemeSettings';
import KeyboardShortcutsPanel from './KeyboardShortcutsPanel';
import type { DocTheme } from '#/lib/types';

const INPUT =
  'w-full rounded-none border border-border bg-background px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none';

const NUM = `${INPUT} font-mono text-xs`;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-muted-foreground/50 mb-1 block text-[11px] font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-muted-foreground/35 mt-1 text-[10px] leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-border-subtle/5 border-t pt-4"
    >
      <summary className="text-muted-foreground/45 flex cursor-pointer list-none items-center gap-2 text-[11px] font-medium tracking-wide uppercase select-none">
        <Icon size={13} className="text-muted-foreground/35" />
        <span className="flex-1">{title}</span>
        <ChevronDown
          size={14}
          className="text-muted-foreground/30 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className={NUM}
        />
        {unit && (
          <span className="text-muted-foreground/35 shrink-0 text-[10px]">
            {unit}
          </span>
        )}
      </div>
    </Field>
  );
}

interface PageSetupPanelProps {
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

export default function PageSetupPanel({
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
}: PageSetupPanelProps) {
  const resolved = useMemo(
    () => resolvePageSetup(pageSetup, pageFormat),
    [pageSetup, pageFormat],
  );

  const patch = (p: Partial<DocPageSetup>) =>
    onPageSetupChange({ ...pageSetup, ...p });
  const patchMargins = (p: Partial<(typeof resolved)['margins']>) =>
    patch({ margins: { ...resolved.margins, ...p } });

  const formatOptions: { id: DocPageSetupFormat; label: string }[] = [
    ...(Object.keys(PAGE_FORMATS) as DocPageFormat[]).map((f) => ({
      id: f as DocPageSetupFormat,
      label: PAGE_FORMATS[f].label,
    })),
    { id: 'custom', label: 'Custom' },
  ];

  const activeMarginPreset =
    Object.entries(MARGIN_PRESETS).find(
      ([, m]) =>
        m.top === resolved.margins.top &&
        m.right === resolved.margins.right &&
        m.bottom === resolved.margins.bottom &&
        m.left === resolved.margins.left,
    )?.[0] ?? 'custom';

  return (
    <div className="space-y-1 p-4">
      <div>
        <div className="text-muted-foreground/45 mb-1 text-[11px] font-medium tracking-wide uppercase">
          Document
        </div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-muted-foreground/35 font-mono text-xs">
          /{slug}
        </div>
        <div className="text-muted-foreground/45 mt-3 flex gap-3 text-xs">
          <span>
            <strong className="text-foreground">{blockCount}</strong> blocks
          </span>
          {layoutMode === 'paginated' && (
            <span>
              <strong className="text-foreground">{pageCount}</strong> pages
            </span>
          )}
        </div>
      </div>

      <Section icon={LayoutGrid} title="Layout mode">
        <div className="grid grid-cols-2 gap-2">
          {(['paginated', 'web'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onLayoutModeChange(mode)}
              className={`rounded-sm border px-3 py-2.5 text-xs font-medium capitalize transition-colors ${
                layoutMode === mode
                  ? 'border-primary bg-primary/15 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                {mode === 'paginated' ? (
                  <LayoutGrid size={13} />
                ) : (
                  <Globe size={13} />
                )}
                {mode}
              </div>
            </button>
          ))}
        </div>
        <p className="text-muted-foreground/35 text-[10px]">
          {layoutMode === 'paginated'
            ? 'Fixed-size sheets with page breaks — like a print document.'
            : 'Continuous scroll — like a web article.'}
        </p>
      </Section>

      {layoutMode === 'paginated' && (
        <Section icon={Ruler} title="Canvas">
          <label className="text-foreground flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={resolved.showMarginGuides}
              onChange={(e) => patch({ showMarginGuides: e.target.checked })}
            />
            Ruler
          </label>
          <p className="text-muted-foreground/35 text-[10px] leading-relaxed">
            Compact ruler overlay and margin guides on page sheets.
          </p>
        </Section>
      )}

      {layoutMode === 'paginated' && (
        <Section icon={FileText} title="Paper">
          <Field label="Paper size">
            <div className="grid grid-cols-2 gap-1.5">
              {formatOptions.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => patch({ format: id })}
                  className={`rounded-sm border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    resolved.format === id
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {resolved.format === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <NumField
                label="Width"
                value={pageSetup?.customWidthMm ?? 210}
                onChange={(v) => patch({ customWidthMm: v })}
                min={100}
                max={500}
                unit="mm"
              />
              <NumField
                label="Height"
                value={pageSetup?.customHeightMm ?? 297}
                onChange={(v) => patch({ customHeightMm: v })}
                min={100}
                max={700}
                unit="mm"
              />
            </div>
          )}

          <Field label="Orientation">
            <div className="grid grid-cols-2 gap-2">
              {(['portrait', 'landscape'] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => patch({ orientation: o })}
                  className={`rounded-sm border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    resolved.orientation === o
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </Field>

          <p className="text-muted-foreground/35 font-mono text-[10px]">
            {formatDimensionsLabel(resolved)}
          </p>
        </Section>
      )}

      {layoutMode === 'paginated' && (
        <Section icon={Ruler} title="Margins">
          <Field label="Preset">
            <div className="grid grid-cols-4 gap-1.5">
              {Object.keys(MARGIN_PRESETS).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => patch({ margins: MARGIN_PRESETS[key] })}
                  className={`rounded-sm border px-1.5 py-1.5 text-[10px] font-medium capitalize transition-colors ${
                    activeMarginPreset === key
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <NumField
              label="Top"
              value={resolved.margins.top}
              onChange={(v) => patchMargins({ top: v })}
              min={0}
              max={50}
              unit="mm"
            />
            <NumField
              label="Bottom"
              value={resolved.margins.bottom}
              onChange={(v) => patchMargins({ bottom: v })}
              min={0}
              max={50}
              unit="mm"
            />
            <NumField
              label="Left"
              value={resolved.margins.left}
              onChange={(v) => patchMargins({ left: v })}
              min={0}
              max={50}
              unit="mm"
            />
            <NumField
              label="Right"
              value={resolved.margins.right}
              onChange={(v) => patchMargins({ right: v })}
              min={0}
              max={50}
              unit="mm"
            />
          </div>

          <details className="text-muted-foreground/40 text-[10px]">
            <summary className="hover:text-muted-foreground/60 cursor-pointer">
              Print margins (PDF export)
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <NumField
                label="Print top"
                value={resolved.printMargins.top}
                onChange={(v) =>
                  patch({ printMargins: { ...resolved.printMargins, top: v } })
                }
                min={0}
                max={50}
                unit="mm"
              />
              <NumField
                label="Print bottom"
                value={resolved.printMargins.bottom}
                onChange={(v) =>
                  patch({
                    printMargins: { ...resolved.printMargins, bottom: v },
                  })
                }
                min={0}
                max={50}
                unit="mm"
              />
              <NumField
                label="Print left"
                value={resolved.printMargins.left}
                onChange={(v) =>
                  patch({ printMargins: { ...resolved.printMargins, left: v } })
                }
                min={0}
                max={50}
                unit="mm"
              />
              <NumField
                label="Print right"
                value={resolved.printMargins.right}
                onChange={(v) =>
                  patch({
                    printMargins: { ...resolved.printMargins, right: v },
                  })
                }
                min={0}
                max={50}
                unit="mm"
              />
            </div>
          </details>
        </Section>
      )}

      {layoutMode === 'web' && (
        <Section icon={Monitor} title="Web layout">
          <Field label="Max width">
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              {WEB_WIDTH_PRESETS.map(({ label, px }) => (
                <button
                  key={px}
                  type="button"
                  onClick={() => patch({ webMaxWidthPx: px })}
                  className={`rounded-sm border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    resolved.webMaxWidthPx === px
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {label} ({px}px)
                </button>
              ))}
            </div>
            <input
              type="number"
              value={resolved.webMaxWidthPx}
              min={480}
              max={2000}
              step={10}
              onChange={(e) => patch({ webMaxWidthPx: Number(e.target.value) })}
              className={NUM}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <NumField
              label="Outer padding"
              value={resolved.webPaddingPx}
              onChange={(v) => patch({ webPaddingPx: v })}
              min={0}
              max={120}
              unit="px"
            />
            <NumField
              label="Content padding"
              value={resolved.webContentPaddingPx}
              onChange={(v) => patch({ webContentPaddingPx: v })}
              min={0}
              max={120}
              unit="px"
            />
          </div>
        </Section>
      )}

      <Section icon={Type} title="Typography" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="Base size"
            value={resolved.fontSizePt}
            onChange={(v) => patch({ fontSizePt: v })}
            min={8}
            max={14}
            step={0.5}
            unit="pt"
          />
          <NumField
            label="Line height"
            value={resolved.lineHeight}
            onChange={(v) => patch({ lineHeight: v })}
            min={1.2}
            max={2}
            step={0.02}
          />
        </div>
      </Section>

      {layoutMode === 'paginated' && (
        <Section icon={Ruler} title="Page spacing" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2">
            <NumField
              label="Sheet gap"
              value={resolved.pageGapPx}
              onChange={(v) => patch({ pageGapPx: v })}
              min={0}
              max={80}
              unit="px"
            />
            <NumField
              label="Section break"
              value={resolved.sectionBreakTopMm}
              onChange={(v) => patch({ sectionBreakTopMm: v })}
              min={0}
              max={60}
              unit="mm"
            />
          </div>
        </Section>
      )}

      {layoutMode === 'paginated' && (
        <Section icon={FileText} title="Header & footer" defaultOpen>
          <ChromeEditorPanel
            title={title}
            chrome={chrome}
            pageSetup={pageSetup}
            resolvedSetup={resolved}
            selectedZone={selectedChromeZone}
            onChromeChange={onChromeChange}
            onPageSetupChange={onPageSetupChange}
          />
        </Section>
      )}

      <Section icon={Type} title="Theme" defaultOpen={false}>
        <ThemeSettings
          theme={theme}
          onChange={onThemeChange}
          className="space-y-4"
        />
      </Section>

      <KeyboardShortcutsPanel />

      <p className="text-muted-foreground/35 pt-3 text-[10px] leading-relaxed">
        Tip: insert a <strong>break</strong> block (page, section, or continue)
        or toggle &quot;Page break before&quot; on a section.
      </p>
    </div>
  );
}
