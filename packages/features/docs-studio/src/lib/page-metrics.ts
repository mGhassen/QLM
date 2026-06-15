import type { ResolvedPageSetup } from './page-setup';

export function mmToPx(mm: number): number {
  return mm * (96 / 25.4);
}

export function getPageContentWidthPx(setup: ResolvedPageSetup): number {
  return mmToPx(setup.widthMm - setup.margins.left - setup.margins.right);
}

/** Inner width for blocks inside `.doc-section` (zone padding on both sides). */
export function getSectionChildWidthPx(
  pageContentWidthPx: number,
  zonePadMm = 16,
): number {
  return Math.max(0, pageContentWidthPx - 2 * mmToPx(zonePadMm));
}

export function getPageBodyHeightPx(
  setup: ResolvedPageSetup,
  hasHeader: boolean,
  hasFooter: boolean,
): number {
  const pageH = mmToPx(setup.heightMm);
  const headerH = hasHeader ? mmToPx(setup.headerHeightMm) : 0;
  const footerH = hasFooter ? mmToPx(setup.footerHeightMm) : 0;
  const marginTop = hasHeader ? 0 : mmToPx(setup.margins.top);
  const marginBottom = hasFooter ? 0 : mmToPx(setup.margins.bottom);
  return Math.max(0, pageH - headerH - footerH - marginTop - marginBottom);
}
