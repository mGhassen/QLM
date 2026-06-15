import type { CSSProperties } from 'react';
import {
  PAGE_FORMATS,
  resolvePageFormat,
  type DocPageFormat,
  type PageDimensions,
} from './page-format';

export interface DocMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type DocPageSetupFormat = DocPageFormat | 'custom';

export interface DocPageSetup {
  format?: DocPageSetupFormat;
  customWidthMm?: number;
  customHeightMm?: number;
  orientation?: 'portrait' | 'landscape';
  margins?: Partial<DocMargins>;
  printMargins?: Partial<DocMargins>;
  webMaxWidthPx?: number;
  webPaddingPx?: number;
  webContentPaddingPx?: number;
  fontSizePt?: number;
  lineHeight?: number;
  headerHeightMm?: number;
  footerHeightMm?: number;
  pageGapPx?: number;
  sectionBreakTopMm?: number;
  showMarginGuides?: boolean;
}

export interface ResolvedPageSetup {
  format: DocPageSetupFormat;
  orientation: 'portrait' | 'landscape';
  widthMm: number;
  heightMm: number;
  printSize: string;
  label: string;
  margins: DocMargins;
  printMargins: DocMargins;
  webMaxWidthPx: number;
  webPaddingPx: number;
  webContentPaddingPx: number;
  fontSizePt: number;
  lineHeight: number;
  headerHeightMm: number;
  footerHeightMm: number;
  pageGapPx: number;
  sectionBreakTopMm: number;
  showMarginGuides: boolean;
}

export const DEFAULT_MARGINS: DocMargins = {
  top: 10,
  right: 16,
  bottom: 10,
  left: 16,
};

export const MARGIN_PRESETS: Record<string, DocMargins> = {
  normal: { top: 10, right: 16, bottom: 10, left: 16 },
  narrow: { top: 8, right: 12, bottom: 8, left: 12 },
  wide: { top: 12, right: 20, bottom: 12, left: 20 },
  minimal: { top: 6, right: 8, bottom: 6, left: 8 },
};

export const WEB_WIDTH_PRESETS = [
  { label: 'Compact', px: 720 },
  { label: 'Standard', px: 900 },
  { label: 'Wide', px: 1100 },
  { label: 'Full', px: 1400 },
] as const;

function mergeMargins(
  base: DocMargins,
  patch?: Partial<DocMargins>,
): DocMargins {
  return { ...base, ...patch };
}

function resolveDimensions(
  setup: DocPageSetup | undefined,
  legacyFormat?: DocPageFormat,
): PageDimensions & { format: DocPageSetupFormat } {
  const format = setup?.format ?? legacyFormat ?? 'a4';

  if (format === 'custom') {
    const widthMm = setup?.customWidthMm ?? 210;
    const heightMm = setup?.customHeightMm ?? 297;
    return {
      format: 'custom',
      widthMm,
      heightMm,
      label: 'Custom',
      printSize: `${widthMm}mm ${heightMm}mm`,
    };
  }

  const dims = resolvePageFormat(format);
  return { ...dims, format };
}

export function resolvePageSetup(
  setup?: DocPageSetup,
  legacyFormat?: DocPageFormat,
): ResolvedPageSetup {
  const dims = resolveDimensions(setup, legacyFormat);
  const orientation = setup?.orientation ?? 'portrait';
  const widthMm = orientation === 'landscape' ? dims.heightMm : dims.widthMm;
  const heightMm = orientation === 'landscape' ? dims.widthMm : dims.heightMm;

  const margins = mergeMargins(DEFAULT_MARGINS, setup?.margins);
  const printMargins = mergeMargins(margins, setup?.printMargins);

  return {
    format: dims.format,
    orientation,
    widthMm,
    heightMm,
    printSize: dims.printSize,
    label: dims.label,
    margins,
    printMargins,
    webMaxWidthPx: setup?.webMaxWidthPx ?? 900,
    webPaddingPx: setup?.webPaddingPx ?? 24,
    webContentPaddingPx: setup?.webContentPaddingPx ?? 32,
    fontSizePt: setup?.fontSizePt ?? 10,
    lineHeight: setup?.lineHeight ?? 1.58,
    headerHeightMm: setup?.headerHeightMm ?? 14,
    footerHeightMm: setup?.footerHeightMm ?? 14,
    pageGapPx: setup?.pageGapPx ?? 28,
    sectionBreakTopMm: setup?.sectionBreakTopMm ?? 22,
    showMarginGuides: setup?.showMarginGuides ?? false,
  };
}

export function pageSetupToStyle(setup: ResolvedPageSetup): CSSProperties {
  const { margins: m, printMargins: pm } = setup;
  const printSize =
    setup.format === 'custom'
      ? `${setup.widthMm}mm ${setup.heightMm}mm`
      : setup.printSize;
  return {
    '--doc-page-width': `${setup.widthMm}mm`,
    '--doc-page-height': `${setup.heightMm}mm`,
    '--doc-margin-top': `${m.top}mm`,
    '--doc-margin-right': `${m.right}mm`,
    '--doc-margin-bottom': `${m.bottom}mm`,
    '--doc-margin-left': `${m.left}mm`,
    '--doc-zone-pad-x': `${m.left}mm`,
    '--doc-web-max-width': `${setup.webMaxWidthPx}px`,
    '--doc-web-padding': `${setup.webPaddingPx}px`,
    '--doc-web-content-padding': `${setup.webContentPaddingPx}px`,
    '--doc-font-size': `${setup.fontSizePt}pt`,
    '--doc-line-height': String(setup.lineHeight),
    '--doc-chrome-header-h': `${setup.headerHeightMm}mm`,
    '--doc-chrome-footer-h': `${setup.footerHeightMm}mm`,
    '--doc-page-gap': `${setup.pageGapPx}px`,
    '--doc-section-break-top': `${setup.sectionBreakTopMm}mm`,
    '--doc-print-size': printSize,
    '--doc-print-margin-top': `${pm.top}mm`,
    '--doc-print-margin-right': `${pm.right}mm`,
    '--doc-print-margin-bottom': `${pm.bottom}mm`,
    '--doc-print-margin-left': `${pm.left}mm`,
  } as CSSProperties;
}

export function pageSetupPrintCss(setup: ResolvedPageSetup): string {
  const { printMargins: m } = setup;
  const size =
    setup.format === 'custom'
      ? `${setup.widthMm}mm ${setup.heightMm}mm`
      : setup.printSize;

  return `
  @page {
    size: ${size}${setup.orientation === 'landscape' ? ' landscape' : ''};
    margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
  }
`;
}

export function formatDimensionsLabel(setup: ResolvedPageSetup): string {
  return `${setup.widthMm} × ${setup.heightMm} mm · ${setup.orientation}`;
}

export { PAGE_FORMATS };
